import { getDatabase } from '../db/connection.js';
import { saveAttempt } from './reviewAttempts.js';

export const reviewApi = {
  async 'review.record'(params, app) {
    return saveAttempt(await getDatabase(app), params, 'test');
  },

  async 'study.record'(params, app) {
    return saveAttempt(await getDatabase(app), { ...params, answer: '' }, 'study');
  },
};
