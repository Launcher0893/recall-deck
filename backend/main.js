import { libraryApi } from './features/library.js';
import { reviewApi } from './features/review.js';

export const api = { ...libraryApi, ...reviewApi };
