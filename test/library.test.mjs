import assert from 'node:assert/strict';
import test from 'node:test';
import { migrate } from '../backend/db/migrate.js';
import { rows } from '../backend/db/rows.js';
import { createTestDatabase } from '../test-support/sqlite.mjs';

const outlineNames = [
  '党课复习 · 重大周年与年度党建时政',
  '党课复习 · 党章党规与发展党员',
  '党课复习 · 建党、长征与革命时期的党史',
  '党课复习 · 核心理论表述',
  '党课复习 · 二十大报告与全面从严治党',
];

function database(t, version) {
  const db = createTestDatabase();
  t.after(() => db.close());
  if (version === 0) return db;

  db.exec(`
    CREATE TABLE decks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
    CREATE TABLE cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deckId INTEGER NOT NULL REFERENCES decks(id),
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      expected TEXT NOT NULL
    );
    INSERT INTO decks (name) VALUES ('默认卡组');
  `);
  if (version === 1) {
    db.exec(`
      CREATE TABLE reviews (
        attemptId TEXT PRIMARY KEY,
        cardId INTEGER REFERENCES cards(id) ON DELETE SET NULL,
        answer TEXT NOT NULL,
        remembered INTEGER NOT NULL,
        reviewedAt INTEGER NOT NULL
      );
      PRAGMA user_version = 1;
    `);
  } else {
    db.exec(`
      ALTER TABLE cards ADD COLUMN reviewState TEXT;
      ALTER TABLE cards ADD COLUMN reviewStep INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE cards ADD COLUMN dueAt INTEGER;
      ALTER TABLE cards ADD COLUMN studySelected INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE reviews (
        attemptId TEXT PRIMARY KEY,
        cardId INTEGER REFERENCES cards(id) ON DELETE SET NULL,
        answer TEXT NOT NULL,
        rating TEXT NOT NULL,
        reviewedAt INTEGER NOT NULL,
        source TEXT NOT NULL DEFAULT 'test'
      );
      PRAGMA user_version = 3;
    `);
  }
  return db;
}

function addDecks(db, names) {
  return names.map((name) => rows(db, 'INSERT INTO decks (name) VALUES (?) RETURNING id', name)[0].id);
}

function addCard(db, deckId, back) {
  return rows(db, `
    INSERT INTO cards (deckId, front, back, expected) VALUES (?, '问题', ?, '') RETURNING id
  `, deckId, back)[0].id;
}

function insertLegacyOutline(db) {
  const deckIds = addDecks(db, outlineNames);
  const cardIds = deckIds.map((deckId, index) => addCard(db, deckId,
    index === 0 ? '> 补充内容 \r\n完整答案' : '保留答案\n> 补充内容'));
  return { deckIds, cardIds };
}

test('fresh databases retain their default deck and can be opened again', (t) => {
  const db = database(t, 0);
  migrate(db);
  migrate(db);
  assert.deepEqual(rows(db, 'PRAGMA user_version'), [{ user_version: 4 }]);
  assert.deepEqual(rows(db, 'SELECT name, parentId, color FROM decks'), [
    { name: '默认卡组', parentId: null, color: null },
  ]);
});

test('a version 1 upgrade carries old answers and schedules forward', (t) => {
  const db = database(t, 1);
  const cardId = addCard(db, 1, '答案');
  rows(db, `
    INSERT INTO reviews (attemptId, cardId, answer, remembered, reviewedAt)
    VALUES ('previous', ?, '答案', 1, 1000)
  `, cardId);
  migrate(db);
  assert.deepEqual(rows(db, 'SELECT reviewState, dueAt, studySelected FROM cards'), [
    { reviewState: 'known', dueAt: 1_201_000, studySelected: 1 },
  ]);
  assert.deepEqual(rows(db, 'SELECT attemptId, cardId, rating, source FROM reviews'), [
    { attemptId: 'previous', cardId, rating: 'known', source: 'test' },
  ]);
});

test('the complete legacy outline moves by its first-line marker and preserves study data', (t) => {
  const db = database(t, 3);
  const { cardIds } = insertLegacyOutline(db);
  const [cardId] = cardIds;
  const [unrelated] = addDecks(db, ['其他卡组']);
  const unrelatedCard = addCard(db, unrelated, '> 补充内容');
  rows(db, "UPDATE cards SET reviewState = 'known', dueAt = 1500, studySelected = 1 WHERE id = ?", cardId);
  rows(db, `
    INSERT INTO reviews (attemptId, cardId, answer, rating, reviewedAt)
    VALUES ('previous', ?, '完整答案', 'known', 1000)
  `, cardId);

  migrate(db);
  migrate(db);

  assert.deepEqual(rows(db, 'SELECT name FROM decks WHERE parentId IS NULL ORDER BY id'),
    [{ name: '党课复习' }, { name: '其他卡组' }]);
  assert.deepEqual(rows(db, 'SELECT name, parentId, color FROM decks WHERE parentId IS NOT NULL ORDER BY id'), [
    { name: '大纲考点', parentId: 1, color: '#1D4ED8' },
    { name: '补充内容', parentId: 1, color: '#92400E' },
  ]);
  assert.deepEqual(rows(db, `
    SELECT c.id, d.name FROM cards c JOIN decks d ON d.id = c.deckId ORDER BY c.id
  `), [
    { id: cardId, name: '补充内容' },
    ...cardIds.slice(1).map((id) => ({ id, name: '大纲考点' })),
    { id: unrelatedCard, name: '其他卡组' },
  ]);
  assert.deepEqual(rows(db, 'SELECT back, reviewState, dueAt, studySelected FROM cards WHERE id = ?', cardId), [
    { back: '> 补充内容 \r\n完整答案', reviewState: 'known', dueAt: 1500, studySelected: 1 },
  ]);
  assert.deepEqual(rows(db, 'SELECT attemptId, cardId FROM reviews'), [{ attemptId: 'previous', cardId }]);
  assert.deepEqual(rows(db, 'PRAGMA foreign_key_check'), []);
});

test('a populated default deck survives the legacy grouping', (t) => {
  const db = database(t, 3);
  insertLegacyOutline(db);
  const cardId = addCard(db, 1, '答案');
  migrate(db);
  assert.deepEqual(rows(db, 'SELECT name FROM decks WHERE parentId IS NULL ORDER BY id'),
    [{ name: '默认卡组' }, { name: '党课复习' }]);
  assert.deepEqual(rows(db, 'SELECT deckId FROM cards WHERE id = ?', cardId), [{ deckId: 1 }]);
});

for (const [description, names, back] of [
  ['an incomplete set of names', outlineNames.slice(1), '> 补充内容'],
  ['a duplicated name', [...outlineNames, outlineNames[0]], '> 补充内容'],
  ['no import marker', outlineNames, '普通答案'],
]) {
  test(`the schema upgrade preserves decks with ${description}`, (t) => {
    const db = database(t, 3);
    const deckIds = addDecks(db, names);
    const cardId = addCard(db, deckIds[0], back);
    migrate(db);
    assert.deepEqual(rows(db, 'SELECT name, parentId FROM decks ORDER BY id'),
      ['默认卡组', ...names].map((name) => ({ name, parentId: null })));
    assert.deepEqual(rows(db, 'SELECT deckId FROM cards WHERE id = ?', cardId), [{ deckId: deckIds[0] }]);
  });
}

test('a failed legacy grouping rolls back the schema and data changes together', (t) => {
  const db = database(t, 3);
  const { deckIds, cardIds } = insertLegacyOutline(db);
  db.exec(`
    CREATE TRIGGER reject_deck_deletion BEFORE DELETE ON decks
    BEGIN SELECT RAISE(ABORT, 'test failure'); END;
  `);
  assert.throws(() => migrate(db), /test failure/);
  assert.deepEqual(rows(db, 'PRAGMA user_version'), [{ user_version: 3 }]);
  assert.deepEqual(rows(db, "SELECT name FROM pragma_table_info('decks')"), [{ name: 'id' }, { name: 'name' }]);
  assert.deepEqual(rows(db, 'SELECT name FROM decks ORDER BY id'),
    ['默认卡组', ...outlineNames].map((name) => ({ name })));
  assert.deepEqual(rows(db, 'SELECT id, deckId FROM cards ORDER BY id'),
    cardIds.map((id, index) => ({ id, deckId: deckIds[index] })));
});
