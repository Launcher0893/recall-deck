import { getDatabase } from '../db/connection.js';
import { rows } from '../db/rows.js';
import { content, id } from './validation.js';

export const reviewApi = {
  async 'review.record'({ attemptId, cardId, answer, remembered }, app) {
    const db = await getDatabase(app);
    if (typeof attemptId !== 'string' || !/^[\da-f-]{36}$/i.test(attemptId)) {
      throw new Error('作答编号无效。');
    }
    if (typeof remembered !== 'boolean') throw new Error('请选择判分结果。');
    rows(db, `
      INSERT INTO reviews (attemptId, cardId, answer, remembered, reviewedAt)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT (attemptId) DO NOTHING
    `, attemptId, id(cardId), content(answer, '作答', 40_000), Number(remembered), Date.now());
    return null;
  },
};
