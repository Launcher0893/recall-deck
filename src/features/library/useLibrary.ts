import { computed, shallowRef } from 'vue';
import { call, errorMessage } from '../../platform/tinyjs';
import type { Card, CardDraft, CardReviewUpdate, Deck, Library, StudySelectionChange } from '../../shared/models';
import { useDeckNavigation } from './useDeckNavigation';

export function useLibrary() {
  const decks = shallowRef<Deck[]>([]);
  const cards = shallowRef<Card[]>([]);
  const { restoreSelection, ...navigation } = useDeckNavigation(decks, cards);
  const loading = shallowRef(false);
  const loadError = shallowRef('');
  const studyCards = computed(() => cards.value.filter((card) => card.studySelected));
  const hasCards = computed(() => cards.value.length > 0);
  let pending: Promise<unknown> = Promise.resolve();

  function runInOrder<T>(operation: () => Promise<T>) {
    const result = pending.then(operation, operation);
    pending = result;
    return result;
  }

  function applyLibrary(library: Library) {
    decks.value = library.decks;
    cards.value = library.cards;
    restoreSelection();
  }

  async function load() {
    if (loading.value) return;
    loading.value = true;
    loadError.value = '';
    try {
      await runInOrder(async () => applyLibrary(await call('library.list', {})));
    } catch (error) {
      loadError.value = '无法读取卡库。' + errorMessage(error);
    } finally {
      loading.value = false;
    }
  }

  function addExamples() {
    return runInOrder(async () => {
      if (!hasCards.value) applyLibrary(await call('library.addExamples', {}));
    });
  }

  function saveDeck(name: string, deckId?: number) {
    return runInOrder(async () => {
      const saved = await call('deck.save', { deckId, name });
      decks.value = deckId === undefined
        ? [...decks.value, saved]
        : decks.value.map((deck) => deck.id === deckId ? saved : deck);
      navigation.selectedId.value = saved.id;
    });
  }

  function saveCard(draft: CardDraft, cardId?: number) {
    return runInOrder(async () => {
      const saved = await call('card.save', { ...draft, cardId });
      if (cardId === undefined) {
        cards.value = [...cards.value, saved];
        return;
      }
      const { deckId, front, back, expected } = saved;
      cards.value = cards.value.map((card) => card.id === cardId ? { ...card, deckId, front, back, expected } : card);
    });
  }

  function removeCard(cardId: number) {
    return runInOrder(async () => {
      await call('card.remove', { cardId });
      cards.value = cards.value.filter((card) => card.id !== cardId);
    });
  }

  function updateCardStudy(update: CardReviewUpdate) {
    cards.value = cards.value.map((card) => card.id === update.id ? { ...card, ...update } : card);
  }

  function saveStudySelection(changes: StudySelectionChange[]) {
    return runInOrder(async () => {
      await call('library.saveStudySelection', { changes });
      const selectionById = new Map(changes.map((change) => [change.id, change.studySelected]));
      cards.value = cards.value.map((card) => {
        const studySelected = selectionById.get(card.id);
        return studySelected === undefined ? card : { ...card, studySelected };
      });
    });
  }

  return {
    ...navigation, decks, cards, studyCards, hasCards, loading, loadError,
    load, addExamples, saveDeck, saveCard, removeCard, updateCardStudy, saveStudySelection,
  };
}
