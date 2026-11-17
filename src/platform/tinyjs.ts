import type {
  Card, CardDraft, CardReviewUpdate, Deck, Library, ReviewRating, Statistics, StudyAttempt, StudySelectionChange,
} from '../shared/models';

interface Methods {
  'library.list': { params: Record<string, never>; result: Library };
  'library.addExamples': { params: Record<string, never>; result: Library };
  'statistics.summary': { params: Record<string, never>; result: Statistics };
  'deck.save': { params: { deckId?: number; name: string }; result: Deck };
  'card.save': { params: CardDraft & { cardId?: number }; result: Card };
  'card.remove': { params: { cardId: number }; result: null };
  'library.saveStudySelection': {
    params: { changes: StudySelectionChange[] };
    result: null;
  };
  'review.record': {
    params: { attemptId: string; cardId: number; answer: string; rating: ReviewRating };
    result: null;
  };
  'study.record': {
    params: StudyAttempt;
    result: CardReviewUpdate;
  };
  'study.revise': {
    params: StudyAttempt & { expectedRating: ReviewRating };
    result: CardReviewUpdate;
  };
}

declare global {
  interface Window {
    tiny?: { api: { call(method: string, params: object): Promise<unknown> } };
  }
}

export async function call<K extends keyof Methods>(
  method: K,
  params: Methods[K]['params'],
): Promise<Methods[K]['result']> {
  if (!window.tiny) throw new Error('请在 tinyjs 桌面窗口中打开 Recall Deck。');
  return await window.tiny.api.call(method, params) as Methods[K]['result'];
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
