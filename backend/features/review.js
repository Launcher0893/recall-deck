import { getDatabase } from '../db/connection.js';
import { rows } from '../db/rows.js';
import { content, id } from './validation.js';
import { nextSchedule } from './schedule.js';

function saveAttempt(db, { attemptId, cardId, answer, rating }, source) {
  if (typeof attemptId !== 'string' || !/^[\da-f-]{36}$/i.test(attemptId)) {
    throw new Error('复习编号无效。');
  }
  if (rating !== 'known' && rating !== 'fuzzy' && rating !== 'forgotten') throw new Error('请选择判分结果。');
  const key = id(cardId);
  const text = content(answer, '作答', 40_000, false);
  const now = Date.now();
  return db.transaction(() => {
    const [card] = rows(db, 'SELECT reviewState, reviewStep, dueAt FROM cards WHERE id = ?', key);
    if (!card) throw new Error('卡片已不存在。');
    const added = rows(db, `
      INSERT INTO reviews (attemptId, cardId, answer, rating, reviewedAt, source)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (attemptId) DO NOTHING RETURNING attemptId
    `, attemptId, key, text, rating, now, source);
    if (source === 'test') return null;
    if (!added.length) return { id: key, reviewState: card.reviewState, dueAt: card.dueAt };

    const { reviewState, reviewStep, dueAt } = nextSchedule(card, rating, now);
    rows(db, 'UPDATE cards SET reviewState = ?, reviewStep = ?, dueAt = ? WHERE id = ?',
      reviewState, reviewStep, dueAt, key);
    return { id: key, reviewState, dueAt };
  }).immediate();
}

export const reviewApi = {
  async 'review.record'(params, app) {
    return saveAttempt(await getDatabase(app), params, 'test');
  },

  async 'study.record'(params, app) {
    return saveAttempt(await getDatabase(app), { ...params, answer: '' }, 'study');
  },
};
