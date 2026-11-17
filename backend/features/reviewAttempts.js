import { rows } from '../db/rows.js';
import { nextSchedule } from './schedule.js';
import { content, id } from './validation.js';

export function saveAttempt(db, { attemptId, cardId, answer, rating }, source, now = Date.now()) {
  if (typeof attemptId !== 'string' || !/^[\da-f-]{36}$/i.test(attemptId)) {
    throw new Error('复习编号无效。');
  }
  if (rating !== 'known' && rating !== 'fuzzy' && rating !== 'forgotten') throw new Error('请选择判分结果。');
  const key = id(cardId);
  const text = content(answer, '作答', 40_000, false);

  return db.transaction(() => {
    const [card] = rows(db, 'SELECT reviewState, reviewStep, dueAt FROM cards WHERE id = ?', key);
    if (!card) throw new Error('卡片已不存在。');
    const added = rows(db, `
      INSERT INTO reviews (attemptId, cardId, answer, rating, reviewedAt, source)
      VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (attemptId) DO NOTHING RETURNING attemptId
    `, attemptId, key, text, rating, now, source);

    if (!added.length) {
      const [prior] = rows(db, 'SELECT cardId, answer, rating, source FROM reviews WHERE attemptId = ?', attemptId);
      if (prior.cardId !== key || prior.answer !== text || prior.rating !== rating || prior.source !== source) {
        throw new Error('复习编号已用于另一条记录。');
      }
    }

    if (source === 'test') return null;
    if (!added.length) return { id: key, reviewState: card.reviewState, dueAt: card.dueAt };

    const { reviewState, reviewStep, dueAt } = nextSchedule(card, rating, now);
    rows(db, 'UPDATE cards SET reviewState = ?, reviewStep = ?, dueAt = ? WHERE id = ?',
      reviewState, reviewStep, dueAt, key);
    return { id: key, reviewState, dueAt };
  }).immediate();
}
