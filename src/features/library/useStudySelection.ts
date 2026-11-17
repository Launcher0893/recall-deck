import { computed, shallowRef } from 'vue';
import type { Card, Deck, StudySelectionChange } from '../../shared/models';

export function useStudySelection(getCards: () => Card[], getDecks: () => Deck[]) {
  const query = shallowRef('');
  const deckId = shallowRef<number>();
  const draft = shallowRef(new Map<number, boolean>());
  const deckById = computed(() => new Map(getDecks().map((deck) => [deck.id, deck])));

  const deckOptions = computed(() => {
    const occupied = new Set<number>();
    for (const card of getCards()) {
      occupied.add(card.deckId);
      const parentId = deckById.value.get(card.deckId)?.parentId;
      if (parentId != null) occupied.add(parentId);
    }
    return getDecks().filter((deck) => occupied.has(deck.id)).map((deck) => {
      const parent = deck.parentId === null ? undefined : deckById.value.get(deck.parentId);
      return { value: deck.id, label: parent ? parent.name + ' / ' + deck.name : deck.name };
    });
  });
  const visibleCards = computed(() => {
    const search = query.value.trim().toLowerCase();
    const scope = deckId.value;
    return getCards().filter((card) =>
      (scope == null || card.deckId === scope || deckById.value.get(card.deckId)?.parentId === scope)
      && (!search || card.front.toLowerCase().includes(search)));
  });
  const selectedIds = computed(() => new Set(
    getCards().filter((card) => draft.value.get(card.id) ?? card.studySelected).map((card) => card.id),
  ));
  const visibleSelectedCount = computed(() => visibleCards.value.filter((card) => selectedIds.value.has(card.id)).length);
  const changes = computed<StudySelectionChange[]>(() => getCards().flatMap((card) => {
    const studySelected = draft.value.get(card.id);
    return studySelected === undefined || studySelected === card.studySelected ? [] : [{ id: card.id, studySelected }];
  }));

  function setSelected(cards: readonly Card[], selected: boolean) {
    const next = new Map(draft.value);
    for (const card of cards) {
      if (card.studySelected === selected) next.delete(card.id);
      else next.set(card.id, selected);
    }
    draft.value = next;
  }

  return { query, deckId, deckById, deckOptions, visibleCards, selectedIds, visibleSelectedCount, changes, setSelected };
}
