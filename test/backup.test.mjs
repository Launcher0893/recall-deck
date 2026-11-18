import assert from 'node:assert/strict';
import test from 'node:test';
import { backupToken, restoreBackup, takeBackup } from '../backend/db/backup.js';
import { migrate } from '../backend/db/migrate.js';
import { rows } from '../backend/db/rows.js';
import { reviseStudyAttempt, saveAttempt } from '../backend/features/reviewAttempts.js';
import { loadStatistics } from '../backend/features/statistics.js';
import { createTestDatabase } from '../test-support/sqlite.mjs';

function openLibrary(t) {
  const db = createTestDatabase();
  t.after(() => db.close());
  migrate(db);
  return db;
}

const attempt = { attemptId: '4a642c92-e987-4493-b6d1-1aa31e9f8502', cardId: 1, answer: '', rating: 'known' };

test('backup round trip preserves deck hierarchy, study history, schedules, and card identifiers', (t) => {
  const source = openLibrary(t);
  source.exec(`
    INSERT INTO decks (name, parentId, color) VALUES ('数学', 1, 'blue');
    INSERT INTO cards (deckId, front, back, expected, studySelected) VALUES
      (2, '计算 $3^2$', '**9**', '9', 1), (1, '已删除的题', '答案', '', 1);
  `);
  const now = Date.now() + 1_000;
  saveAttempt(source, attempt, 'study', now);
  saveAttempt(source, { ...attempt, attemptId: '598d6f3a-bf71-4706-9501-dac2a31d4738', cardId: 2, answer: '草稿' }, 'test', now);
  source.exec('DELETE FROM cards WHERE id = 2');
  const snapshot = takeBackup(source);
  const restored = openLibrary(t);
  restored.exec("INSERT INTO cards (deckId, front, back, expected, studySelected) VALUES (1, 'Old', 'Card', '', 1)");

  restoreBackup(restored, JSON.parse(JSON.stringify(snapshot)), backupToken(restored));

  assert.deepEqual(takeBackup(restored), snapshot);
  assert.deepEqual(loadStatistics(restored, now), loadStatistics(source, now));
  assert.equal(reviseStudyAttempt(restored, { ...attempt, expectedRating: 'known', rating: 'forgotten' }).reviewState, 'forgotten');
  assert.equal(rows(restored, "INSERT INTO cards (deckId, front, back, expected) VALUES (1, 'New', 'Card', '') RETURNING id")[0].id, 3);
});

test('invalid fields and dangling references leave the current library intact', (t) => {
  const db = openLibrary(t);
  db.exec("INSERT INTO cards (deckId, front, back, expected) VALUES (1, 'Original', 'Answer', '')");
  const original = takeBackup(db);
  const invalidFields = structuredClone(original);
  invalidFields.tables.cards[0][6] = 7;
  assert.throws(() => restoreBackup(db, invalidFields), /无效数据/);

  const danglingReference = structuredClone(original);
  danglingReference.tables.cards[0][1] = 99;
  assert.throws(() => restoreBackup(db, danglingReference), /恢复已取消/);
  assert.deepEqual(takeBackup(db), original);
});

test('restore rejects changes made after the safety backup was started', (t) => {
  const db = openLibrary(t);
  const token = backupToken(db);
  const original = takeBackup(db);
  db.exec("UPDATE decks SET name = 'Updated' WHERE id = 1");
  assert.throws(() => restoreBackup(db, original, token), /卡库在备份后发生了变化/);
  assert.equal(rows(db, 'SELECT name FROM decks')[0].name, 'Updated');
});
