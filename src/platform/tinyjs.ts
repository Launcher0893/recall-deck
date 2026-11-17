import type { Card, CardDraft, Deck, Library } from '../shared/models';

interface Methods {
  'library.list': { params: Record<string, never>; result: Library };
  'deck.save': { params: { deckId?: number; name: string }; result: Deck };
  'card.save': { params: CardDraft & { cardId?: number }; result: Card };
  'card.remove': { params: { cardId: number }; result: null };
  'review.record': {
    params: { attemptId: string; cardId: number; answer: string; remembered: boolean };
    result: null;
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
