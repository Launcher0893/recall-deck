import { libraryApi } from './features/library.js';
import { reviewApi } from './features/review.js';
import { getDatabase } from './db/connection.js';
import { loadStatistics } from './features/statistics.js';

export const api = {
  ...libraryApi,
  ...reviewApi,
  async 'statistics.summary'(_params, app) {
    return loadStatistics(await getDatabase(app));
  },
};
