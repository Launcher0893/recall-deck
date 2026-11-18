import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../backend/db/migrate.js';
import { rows } from '../backend/db/rows.js';
import { saveAttempt } from '../backend/features/reviewAttempts.js';
import { gradeAnswer, submitsAnswer } from '../src/features/review/review.ts';
import { createTestDatabase } from '../test-support/sqlite.mjs';

test('compares case, Unicode width, and whitespace without ignoring punctuation', () => {
  assert.equal(gradeAnswer('  Ｈello　\n WORLD ', 'hello world'), true);
  assert.equal(gradeAnswer('ＡＢＣ', 'abc'), true);
  assert.equal(gradeAnswer('缓存', '缓存。'), false);
  assert.equal(gradeAnswer('任意文本', '  \n'), null);
});

test('only plain Enter submits outside of IME composition', () => {
  const enter = {
    key: 'Enter', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false,
    repeat: false, isComposing: false, keyCode: 13,
  };
  assert.equal(submitsAnswer(enter, false), true);
  for (const override of [{ shiftKey: true }, { repeat: true }, { isComposing: true }, { keyCode: 229 }]) {
    assert.equal(submitsAnswer({ ...enter, ...override }, false), false);
  }
  assert.equal(submitsAnswer(enter, true), false);
});

test('replaying a study attempt does not record it twice or advance the schedule', (t) => {
  const db = createTestDatabase();
  t.after(() => db.close());
  migrate(db);
  db.exec("INSERT INTO cards (deckId, front, back, expected, studySelected) VALUES (1, 'Question', 'Answer', '', 1)");
  const attempt = { attemptId: '4a642c92-e987-4493-b6d1-1aa31e9f8502', cardId: 1, answer: '', rating: 'known' };
  const dueAt = 1000 + 20 * 60_000;
  const expected = { id: 1, reviewState: 'known', dueAt };

  assert.deepEqual(saveAttempt(db, attempt, 'study', 1000), expected);
  assert.deepEqual(saveAttempt(db, attempt, 'study', dueAt), expected);
  assert.equal(rows(db, 'SELECT count(*) AS count FROM reviews')[0].count, 1);
  assert.equal(rows(db, 'SELECT reviewStep FROM cards WHERE id = 1')[0].reviewStep, 1);

  db.exec('UPDATE cards SET studySelected = 0 WHERE id = 1');
  assert.deepEqual(saveAttempt(db, attempt, 'study', dueAt), expected);
  const nextAttempt = { ...attempt, attemptId: '598d6f3a-bf71-4706-9501-dac2a31d4738', rating: 'forgotten' };
  assert.throws(() => saveAttempt(db, nextAttempt, 'study', dueAt), /已移出学习队列/);
  assert.equal(rows(db, 'SELECT count(*) AS count FROM reviews')[0].count, 1);
  assert.equal(rows(db, 'SELECT dueAt FROM cards WHERE id = 1')[0].dueAt, dueAt);
});

test('a reused attempt ID must match the card, answer, rating and source', (t) => {
  const db = createTestDatabase();
  t.after(() => db.close());
  migrate(db);
  db.exec(`
    INSERT INTO cards (deckId, front, back, expected)
    VALUES (1, 'First question', 'First answer', ''), (1, 'Second question', 'Second answer', '')
  `);
  const attempt = { attemptId: '4a642c92-e987-4493-b6d1-1aa31e9f8502', cardId: 1, answer: '', rating: 'known' };
  assert.equal(saveAttempt(db, attempt, 'test'), null);
  assert.equal(saveAttempt(db, attempt, 'test'), null);

  for (const change of [{ cardId: 2 }, { answer: 'Another answer' }, { rating: 'fuzzy' }]) {
    assert.throws(() => saveAttempt(db, { ...attempt, ...change }, 'test'), /复习编号已用于另一条记录/);
  }
  assert.throws(() => saveAttempt(db, attempt, 'study'), /复习编号已用于另一条记录/);
  assert.equal(rows(db, 'SELECT count(*) AS count FROM reviews')[0].count, 1);
  assert.deepEqual(rows(db, 'SELECT dueAt FROM cards ORDER BY id').map(({ dueAt }) => dueAt), [null, null]);
});
