export interface Deck {
  id: number;
  name: string;
  parentId: number | null;
  color: string | null;
}

export interface CardDraft {
  deckId: number;
  front: string;
  back: string;
  expected: string;
}

export type ReviewRating = 'known' | 'fuzzy' | 'forgotten';
export type StudyMode = 'learn' | 'review';

export interface StudyAttempt {
  attemptId: string;
  cardId: number;
  rating: ReviewRating;
}

export interface CardReviewUpdate {
  id: number;
  reviewState: ReviewRating | null;
  dueAt: number | null;
}

export type Card = CardDraft & CardReviewUpdate & { studySelected: boolean };

export type StudySelectionChange = Pick<Card, 'id' | 'studySelected'>;

export interface Library {
  decks: Deck[];
  cards: Card[];
}

export interface RetentionPoint {
  elapsed: number;
  label: string;
  rate: number;
  recall: number | null;
  samples: number;
}

export type DailyRatings = Record<ReviewRating, number> & { day: string };

export interface Statistics {
  today: string;
  retention: RetentionPoint[];
  activity: DailyRatings[];
  trend: (DailyRatings & { selected: number })[];
  forecast: { day: string; count: number }[];
  dueToday: number;
}
