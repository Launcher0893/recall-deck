import { computed, shallowRef } from 'vue';
import { call, errorMessage } from '../../platform/tinyjs';
import type { Card, ReviewRating } from '../../shared/models';
import { gradeAnswer } from './review';

export function useReviewSession() {
  const queue = shallowRef<Card[]>([]);
  const results = shallowRef<{ card: Card; rating: ReviewRating }[]>([]);
  const unavailable = shallowRef<ReadonlySet<number>>(new Set());
  const current = computed<Card | undefined>(() => queue.value[results.value.length]);
  const missed = computed(() => results.value
    .filter(({ card, rating }) => rating !== 'known' && !unavailable.value.has(card.id)).map(({ card }) => card));
  const counts = computed(() => {
    const result = { known: 0, fuzzy: 0, forgotten: 0 };
    for (const { rating } of results.value) result[rating] += 1;
    return result;
  });
  const answer = shallowRef('');
  const submitted = shallowRef(false);
  const automatic = shallowRef<boolean | null>(null);
  const rating = shallowRef<ReviewRating | null>(null);
  const attemptId = shallowRef('');
  const error = shallowRef('');
  const saving = shallowRef(false);

  function submit() {
    if (!current.value || submitted.value || !answer.value.trim()) return;
    automatic.value = gradeAnswer(answer.value, current.value.expected);
    rating.value = automatic.value === true ? 'known' : null;
    submitted.value = true;
  }

  function revealAsForgotten() {
    if (!current.value || submitted.value) return;
    rating.value = 'forgotten';
    submitted.value = true;
  }

  function grade(verdict: ReviewRating) {
    if (submitted.value && !attemptId.value) rating.value = verdict;
  }

  function resetAnswer() {
    answer.value = '';
    submitted.value = false;
    automatic.value = null;
    rating.value = null;
    attemptId.value = '';
    error.value = '';
  }

  async function advance() {
    if (saving.value || rating.value === null || !current.value) return;
    const card = current.value;
    const verdict = rating.value;
    attemptId.value ||= crypto.randomUUID();
    error.value = '';
    saving.value = true;
    try {
      await call('review.record', { attemptId: attemptId.value, cardId: card.id, answer: answer.value, rating: verdict });
      results.value = [...results.value, { card, rating: verdict }];
      resetAnswer();
    } catch (reason) {
      error.value = '未能保存作答。' + errorMessage(reason);
    } finally {
      saving.value = false;
    }
  }

  function retryMissed() {
    start(missed.value);
  }

  function start(cards: Card[]) {
    queue.value = cards.slice();
    results.value = [];
    unavailable.value = new Set();
    resetAnswer();
  }

  function removeCard(cardId: number) {
    if (current.value?.id === cardId) resetAnswer();
    unavailable.value = new Set([...unavailable.value, cardId]);
    queue.value = queue.value.filter((card, index) => index < results.value.length || card.id !== cardId);
  }

  return {
    current, missed, counts, answer, submitted, automatic, rating, error, saving,
    completed: computed(() => results.value.length),
    total: computed(() => queue.value.length),
    gradeLocked: computed(() => !!attemptId.value),
    start, removeCard, submit, revealAsForgotten, grade, advance, retryMissed,
  };
}
