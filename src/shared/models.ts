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

export interface Card extends CardDraft {
  id: number;
}

export interface Library {
  decks: Deck[];
  cards: Card[];
}
