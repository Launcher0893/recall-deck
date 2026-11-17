import type { Card, StudyMode } from '../../shared/models';

export function isDue(card: Pick<Card, 'dueAt'>, now: number): boolean {
  return card.dueAt === null || card.dueAt <= now;
}

export function reviewQueue(cards: readonly Card[], now: number, mode: StudyMode): Card[] {
  const queue = cards.filter((card) => mode === 'learn'
    ? card.dueAt === null
    : card.dueAt !== null && isDue(card, now));
  return queue.sort((a, b) => (a.dueAt ?? 0) - (b.dueAt ?? 0) || a.id - b.id);
}
