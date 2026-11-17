import { computed, shallowRef } from 'vue';
import { call, errorMessage } from '../../platform/tinyjs';
import type { Card, CardDraft, CardReviewUpdate, Deck } from '../../shared/models';

export function useLibrary() {
  const decks = shallowRef<Deck[]>([]);
  const cards = shallowRef<Card[]>([]);
  const selectedId = shallowRef<number>();
  const loading = shallowRef(false);
  const loadError = shallowRef('');
  const selectedDeck = computed(() => decks.value.find((deck) => deck.id === selectedId.value));
  const selectedCards = computed(() => cards.value.filter((card) => card.deckId === selectedId.value));
  const studyCards = computed(() => cards.value.filter((card) => card.studySelected));
  const counts = computed(() => {
    const result = new Map<number, number>();
    for (const card of cards.value) result.set(card.deckId, (result.get(card.deckId) ?? 0) + 1);
    return result;
  });

  async function load() {
    if (loading.value) return;
    loading.value = true;
    loadError.value = '';
    try {
      const library = await call('library.list', {});
      decks.value = library.decks;
      cards.value = library.cards;
      if (!selectedDeck.value) selectedId.value = library.decks[0]?.id;
    } catch (error) {
      loadError.value = '无法读取卡库。' + errorMessage(error);
    } finally {
      loading.value = false;
    }
  }

  async function saveDeck(name: string, deckId?: number) {
    const saved = await call('deck.save', { deckId, name });
    decks.value = deckId ? decks.value.map((deck) => deck.id === deckId ? saved : deck) : [...decks.value, saved];
    selectedId.value = saved.id;
  }

  async function saveCard(draft: CardDraft, cardId?: number) {
    const saved = await call('card.save', { ...draft, cardId });
    cards.value = cardId ? cards.value.map((card) => card.id === cardId ? saved : card) : [...cards.value, saved];
  }

  async function removeCard(cardId: number) {
    await call('card.remove', { cardId });
    cards.value = cards.value.filter((card) => card.id !== cardId);
  }

  function updateCardStudy(update: CardReviewUpdate | Pick<Card, 'id' | 'studySelected'>) {
    cards.value = cards.value.map((card) => card.id === update.id ? { ...card, ...update } : card);
  }

  async function setStudySelected(cardId: number, selected: boolean) {
    updateCardStudy(await call('card.setStudySelected', { cardId, selected }));
  }

  return {
    decks, selectedId, selectedDeck, selectedCards, studyCards, counts, loading, loadError,
    load, saveDeck, saveCard, removeCard, updateCardStudy, setStudySelected,
  };
}
