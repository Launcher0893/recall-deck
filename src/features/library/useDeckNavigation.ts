import { computed, shallowRef, type Ref } from 'vue';
import type { Card, Deck } from '../../shared/models';

export function useDeckNavigation(decks: Readonly<Ref<Deck[]>>, cards: Readonly<Ref<Card[]>>) {
  const selectedId = shallowRef<number>();
  const deckById = computed(() => new Map(decks.value.map((deck) => [deck.id, deck])));
  const selectedDeck = computed(() => selectedId.value === undefined ? undefined : deckById.value.get(selectedId.value));
  const childDecks = computed(() => {
    const groups = new Map<number, Deck[]>();
    for (const deck of decks.value) {
      if (deck.parentId === null) continue;
      const siblings = groups.get(deck.parentId);
      if (siblings) siblings.push(deck);
      else groups.set(deck.parentId, [deck]);
    }
    return groups;
  });
  const selectedCards = computed(() => {
    const deck = selectedDeck.value;
    if (!deck) return [];
    const deckIds = new Set(childDecks.value.get(deck.id)?.map((child) => child.id));
    deckIds.add(deck.id);
    return cards.value.filter((card) => deckIds.has(card.deckId));
  });
  const counts = computed(() => {
    const result = new Map<number, number>();
    for (const card of cards.value) {
      result.set(card.deckId, (result.get(card.deckId) ?? 0) + 1);
      const parentId = deckById.value.get(card.deckId)?.parentId;
      if (parentId != null) result.set(parentId, (result.get(parentId) ?? 0) + 1);
    }
    return result;
  });

  function restoreSelection() {
    if (!selectedDeck.value) selectedId.value = decks.value.find((deck) => deck.parentId === null)?.id;
  }

  function cardDeckOptions(deck: Deck, currentDeckId?: number) {
    const rootId = deck.parentId ?? deck.id;
    const children = childDecks.value.get(rootId);
    if (!children) return [deck];
    const root = deckById.value.get(rootId);
    return root && currentDeckId === rootId ? [...children, root] : children;
  }

  return { selectedId, selectedDeck, childDecks, selectedCards, counts, restoreSelection, cardDeckOptions };
}
