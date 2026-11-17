import type { ReviewRating } from '../../shared/models';

export const ratings = {
  known: { label: '认识', color: 'green' },
  fuzzy: { label: '模糊', color: 'orange' },
  forgotten: { label: '忘记', color: 'red' },
} satisfies Record<ReviewRating, { label: string; color: string }>;
