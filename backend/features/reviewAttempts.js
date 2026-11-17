import { rows } from '../db/rows.js';
import { nextSchedule } from './schedule.js';
import { content, id } from './validation.js';

function validateAttempt(attemptId, rating) {
  if (typeof attemptId !== 'string' || !/^[\da-f-]{36}$/i.test(attemptId)) {
    throw new Error('复习编号无效。');
  }
  if (rating !== 'known' && rating !== 'fuzzy' && rating !== 'forgotten') throw new Error('请选择判分结果。');
}

function updateSchedule(db, cardId, previous, rating, time) {
  const { reviewState, reviewStep, dueAt } = nextSchedule(previous, rating, time);
  rows(db, 'UPDATE cards SET reviewState = ?, reviewStep = ?, dueAt = ? WHERE id = ?',
    reviewState, reviewStep, dueAt, cardId);
  return { id: cardId, reviewState, dueAt };
}

export function saveAttempt(db, { attemptId, cardId, answer, rating }, source, now = Date.now()) {
  validateAttempt(attemptId, rating);
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

    const [event] = rows(db, 'INSERT INTO study_events (cardId, occurredAt, rating) VALUES (?, ?, ?) RETURNING id',
      key, now, rating);
    rows(db, `
      INSERT INTO study_attempt_details (attemptId, eventId, previousReviewStep, previousDueAt)
      VALUES (?, ?, ?, ?)
    `, attemptId, event.id, card.reviewStep, card.dueAt);
    return updateSchedule(db, key, card, rating, now);
  }).immediate();
}

export function reviseStudyAttempt(db, { attemptId, cardId, expectedRating, rating }) {
  validateAttempt(attemptId, rating);
  const key = id(cardId);

  return db.transaction(() => {
    const [latest] = rows(db, `
      SELECT r.attemptId, r.rating, r.reviewedAt, d.eventId, d.previousReviewStep, d.previousDueAt,
        c.reviewState, c.dueAt
      FROM reviews r
      JOIN cards c ON c.id = r.cardId AND c.studySelected = 1
      LEFT JOIN study_attempt_details d ON d.attemptId = r.attemptId
      WHERE r.cardId = ? AND r.source = 'study' ORDER BY r.rowid DESC LIMIT 1
    `, key);
    if (!latest || latest.attemptId !== attemptId || latest.eventId === null) {
      throw new Error('这张卡片的学习记录已更新，请返回当前卡片。');
    }
    if (latest.rating === rating) return { id: key, reviewState: latest.reviewState, dueAt: latest.dueAt };
    if (latest.rating !== expectedRating) throw new Error('这张卡片的判分已被修改，请返回当前卡片。');

    rows(db, 'UPDATE reviews SET rating = ? WHERE attemptId = ?', rating, attemptId);
    rows(db, 'UPDATE study_events SET rating = ? WHERE id = ?', rating, latest.eventId);
    rows(db, 'UPDATE study_events SET rating = ? WHERE cardId = ? AND id > ? AND selected IS NOT NULL',
      rating, key, latest.eventId);
    return updateSchedule(db, key, {
      reviewStep: latest.previousReviewStep, dueAt: latest.previousDueAt,
    }, rating, latest.reviewedAt);
  }).immediate();
}
