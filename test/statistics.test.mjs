import assert from 'node:assert/strict';
import test from 'node:test';
import { migrate } from '../backend/db/migrate.js';
import { rows } from '../backend/db/rows.js';
import { forecastAdjustment, measureRetention } from '../backend/features/retention.js';
import { reviseStudyAttempt, saveAttempt } from '../backend/features/reviewAttempts.js';
import { loadStatistics } from '../backend/features/statistics.js';
import { createTestDatabase } from '../test-support/sqlite.mjs';

const minute = 60_000;
const hour = 60 * minute;
const at = (day, time = 12) => new Date(2026, 0, day, time).getTime();
const event = (db, cardId, time, selected, rating) =>
  rows(db, 'INSERT INTO study_events (cardId, occurredAt, selected, rating) VALUES (?, ?, ?, ?)',
    cardId, time, selected, rating);

function database(t) {
  const db = createTestDatabase();
  t.after(() => db.close());
  migrate(db);
  return db;
}

function addCard(db) {
  return rows(db, "INSERT INTO cards (deckId, front, back, expected) VALUES (1, 'Question', 'Answer', '') RETURNING id")[0].id;
}

test('daily bars count distinct cards by their last rating, and trends carry state across days', (t) => {
  const db = database(t);
  event(db, 1, at(1, 9), 1, null);
  event(db, 1, at(1, 10), null, 'known');
  event(db, 1, at(1, 11), null, 'fuzzy');
  event(db, 2, at(1, 12), 1, null);
  event(db, 1, at(3, 9), null, 'forgotten');
  event(db, 2, at(3, 10), 0, null);
  event(db, 3, at(3, 15), 1, null);

  const { activity, trend } = loadStatistics(db, at(3));
  assert.deepEqual(activity, [
    { day: '2026-01-01', known: 0, fuzzy: 1, forgotten: 0 },
    { day: '2026-01-02', known: 0, fuzzy: 0, forgotten: 0 },
    { day: '2026-01-03', known: 0, fuzzy: 0, forgotten: 1 },
  ]);
  assert.deepEqual(trend, [
    { day: '2026-01-01', selected: 2, known: 0, fuzzy: 1, forgotten: 0 },
    { day: '2026-01-02', selected: 2, known: 0, fuzzy: 1, forgotten: 0 },
    { day: '2026-01-03', selected: 1, known: 0, fuzzy: 0, forgotten: 1 },
  ]);
});

test('only new study attempts record ratings, and deleting cards preserves the historical ratings', (t) => {
  const db = database(t);
  const cardId = addCard(db);
  rows(db, 'UPDATE cards SET studySelected = 1 WHERE id = ?', cardId);
  const attempt = { attemptId: '4a642c92-e987-4493-b6d1-1aa31e9f8502', cardId, answer: '', rating: 'known' };
  const now = Date.now();
  saveAttempt(db, attempt, 'study', now);
  saveAttempt(db, attempt, 'study', now);
  saveAttempt(db, { ...attempt, attemptId: '598d6f3a-bf71-4706-9501-dac2a31d4738', rating: 'forgotten' }, 'test', now);
  rows(db, 'DELETE FROM cards WHERE id = ?', cardId);

  const events = rows(db, 'SELECT selected, rating FROM study_events ORDER BY id');
  assert.deepEqual(events, [
    { selected: 1, rating: null },
    { selected: null, rating: 'known' },
    { selected: 0, rating: 'known' },
  ]);
  const statistics = loadStatistics(db, Date.now() + 1_000);
  assert.equal(statistics.activity.reduce((total, day) => total + day.known, 0), 1);
  assert.equal(statistics.trend.at(-1).selected, 0);
});

test('v4 migration carries study ratings and reconciles inferred selection with the current library', (t) => {
  const db = database(t);
  db.exec(`
    DROP TABLE study_attempt_details;
    DROP TRIGGER study_history_insert;
    DROP TRIGGER study_history_select;
    DROP TRIGGER study_history_remove;
    DROP TABLE study_events;
    PRAGMA user_version = 4;
  `);
  const removed = addCard(db);
  const selected = addCard(db);
  rows(db, 'UPDATE cards SET studySelected = 1 WHERE id = ?', selected);
  rows(db, `
    INSERT INTO reviews (attemptId, cardId, answer, rating, reviewedAt, source)
    VALUES ('study', ?, '', 'known', ?, 'study'), ('test', ?, '', 'forgotten', ?, 'test')
  `, removed, at(1), selected, at(2));
  migrate(db);
  migrate(db);

  const statistics = loadStatistics(db);
  assert.deepEqual(statistics.activity[0], { day: '2026-01-01', known: 1, fuzzy: 0, forgotten: 0 });
  assert.equal(statistics.trend[0].known, 1);
  assert.deepEqual(statistics.trend.at(-1), {
    day: statistics.today, selected: 1, known: 0, fuzzy: 0, forgotten: 0,
  });
});

test('changing the last study rating replaces its event and recalculates from the original stage', (t) => {
  const db = database(t);
  const cardId = addCard(db);
  const now = Date.now() + 1_000;
  rows(db, 'UPDATE cards SET studySelected = 1, dueAt = ?, reviewStep = 2 WHERE id = ?', now, cardId);
  const attempt = { attemptId: '4a642c92-e987-4493-b6d1-1aa31e9f8502', cardId, answer: '', rating: 'known' };
  saveAttempt(db, attempt, 'study', now);
  const revision = { ...attempt, expectedRating: 'known', rating: 'fuzzy' };
  const result = { id: cardId, reviewState: 'fuzzy', dueAt: now + hour };
  assert.deepEqual(reviseStudyAttempt(db, revision), result);
  assert.deepEqual(reviseStudyAttempt(db, revision), result);
  assert.deepEqual(rows(db, 'SELECT reviewStep FROM cards'), [{ reviewStep: 2 }]);
  assert.deepEqual(rows(db, 'SELECT rating FROM reviews'), [{ rating: 'fuzzy' }]);
  assert.deepEqual(rows(db, 'SELECT rating FROM study_events WHERE selected IS NULL'), [{ rating: 'fuzzy' }]);
  assert.equal(loadStatistics(db, now).activity.at(-1).fuzzy, 1);

  saveAttempt(db, { ...attempt, attemptId: '598d6f3a-bf71-4706-9501-dac2a31d4738' }, 'study', now + hour);
  assert.throws(() => reviseStudyAttempt(db, revision), /学习记录已更新/);
});

function observedReviews(samples) {
  return Array.from({ length: samples }, (_, index) => [
    { cardId: index * 2, occurredAt: at(1), rating: 'known' },
    { cardId: index * 2 + 1, occurredAt: at(1), rating: 'known' },
    { cardId: index * 2, occurredAt: at(1) + 10 * minute, rating: 'forgotten' },
    { cardId: index * 2 + 1, occurredAt: at(1) + hour, rating: 'fuzzy' },
  ]).flat().sort((a, b) => a.occurredAt - b.occurredAt);
}

test('retention uses consecutive study ratings and the forecast requires sufficient observations', () => {
  const sparse = measureRetention(observedReviews(4));
  assert.equal(forecastAdjustment(sparse), 1);
  const measured = measureRetention(observedReviews(5));
  assert.deepEqual(measured.slice(0, 3).map(({ samples, recall }) => [samples, recall]), [[5, 0], [5, 0.5], [0, null]]);
  assert.ok(forecastAdjustment(measured) > 0 && forecastAdjustment(measured) < 0.5);
});

test('forecast returns the next seven local dates and assigns each current card to one day', (t) => {
  const db = database(t);
  const overdue = addCard(db);
  const future = addCard(db);
  const unselected = addCard(db);
  const newCard = addCard(db);
  rows(db, 'UPDATE cards SET studySelected = 1 WHERE id IN (?, ?, ?)', overdue, future, newCard);
  rows(db, "UPDATE cards SET dueAt = ?, reviewState = 'known' WHERE id = ?", at(1), overdue);
  rows(db, "UPDATE cards SET dueAt = ?, reviewState = 'known' WHERE id IN (?, ?)", at(6), future, unselected);
  const { dueToday, forecast } = loadStatistics(db, at(4));
  assert.equal(dueToday, 1);
  assert.deepEqual(forecast, Array.from({ length: 7 }, (_, offset) => ({
    day: `2026-01-${String(5 + offset).padStart(2, '0')}`,
    count: offset === 1 ? 1 : 0,
  })));
});

test('measured forgetting can shift a scheduled card into an earlier forecast day', (t) => {
  const db = database(t);
  for (const review of observedReviews(5)) event(db, review.cardId + 100, review.occurredAt, null, review.rating);
  const cardId = addCard(db);
  rows(db, "UPDATE cards SET studySelected = 1, dueAt = ?, reviewState = 'known' WHERE id = ?", at(10), cardId);
  event(db, cardId, at(5), null, 'known');
  const { forecast, dueToday } = loadStatistics(db, at(5));
  assert.equal(dueToday, 0);
  assert.equal(forecast.find(day => day.count === 1)?.day, '2026-01-07');
  assert.equal(forecast.reduce((total, day) => total + day.count, 0), 1);
});
