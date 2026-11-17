export interface Deck {
  id: number;
  name: string;
}

export interface CardDraft {
  deckId: number;
  front: string;
  back: string;
  expected: string;
}

export type ReviewRating = 'known' | 'fuzzy' | 'forgotten';

export interface CardReviewUpdate {
  id: number;
  reviewState: ReviewRating | null;
  dueAt: number | null;
}

export type Card = CardDraft & CardReviewUpdate & { studySelected: boolean };

export interface Library {
  decks: Deck[];
  cards: Card[];
}
