import type { Card } from '../../shared/models';

export function isDue(card: Pick<Card, 'dueAt'>, now: number): boolean {
  return card.dueAt === null || card.dueAt <= now;
}

export function reviewQueue(cards: readonly Card[], now: number): Card[] {
  return cards.filter((card) => isDue(card, now)).sort((a, b) =>
    (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER) || a.id - b.id);
}
