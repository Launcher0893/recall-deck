import test from 'node:test';
import assert from 'node:assert/strict';
import { nextSchedule } from '../backend/features/schedule.js';
import { reviewQueue } from '../src/features/review/reviewQueue.ts';

const minute = 60_000;
const start = { reviewStep: 0, dueAt: null };

test('on-time recognition progresses through the intervals and caps at 31 days', () => {
  let card = start;
  let now = 1_000;
  for (const interval of [20, 60, 9 * 60, 1_440, 2 * 1_440, 6 * 1_440, 31 * 1_440, 31 * 1_440]) {
    card = nextSchedule(card, 'known', now);
    assert.equal(card.dueAt, now + interval * minute);
    now = card.dueAt;
  }
  assert.equal(card.reviewStep, 6);
});

test('fuzzy keeps the stage and forgotten starts it over', () => {
  const now = 30_000;
  const advanced = { reviewStep: 4, dueAt: now };
  assert.deepEqual(nextSchedule(advanced, 'fuzzy', now), {
    reviewState: 'fuzzy', reviewStep: 4, dueAt: now + 60 * minute,
  });
  assert.deepEqual(nextSchedule(start, 'fuzzy', now), {
    reviewState: 'fuzzy', reviewStep: 0, dueAt: now + 20 * minute,
  });
  assert.deepEqual(nextSchedule(advanced, 'forgotten', now), {
    reviewState: 'forgotten', reviewStep: 0, dueAt: now + 20 * minute,
  });
});

test('an early retest cannot advance or delay a scheduled recognition', () => {
  const now = 1_000;
  const card = { reviewStep: 2, dueAt: now + 10 * minute };
  assert.deepEqual(nextSchedule(card, 'known', now), { ...card, reviewState: 'known' });
  assert.deepEqual(nextSchedule(card, 'fuzzy', now), { ...card, reviewState: 'fuzzy' });
});

test('new and due cards go to separate queues and future cards wait', () => {
  const cards = [
    { id: 3, dueAt: null }, { id: 4, dueAt: 200 }, { id: 2, dueAt: 100 },
    { id: 1, dueAt: null }, { id: 5, dueAt: 300 },
  ];
  assert.deepEqual(reviewQueue(cards, 200, 'learn').map((card) => card.id), [1, 3]);
  assert.deepEqual(reviewQueue(cards, 200, 'review').map((card) => card.id), [2, 4]);
  assert.equal(cards[0].id, 3);
});
