import { getDatabase } from '../db/connection.js';
import { reviseStudyAttempt, saveAttempt } from './reviewAttempts.js';

export const reviewApi = {
  async 'review.record'(params, app) {
    return saveAttempt(await getDatabase(app), params, 'test');
  },

  async 'study.record'(params, app) {
    return saveAttempt(await getDatabase(app), { ...params, answer: '' }, 'study');
  },

  async 'study.revise'(params, app) {
    return reviseStudyAttempt(await getDatabase(app), params);
  },
};
