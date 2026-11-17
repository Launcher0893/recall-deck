import { computed, shallowRef } from 'vue';
import { call, errorMessage } from '../../platform/tinyjs';
import type { Card } from '../../shared/models';
import { gradeAnswer } from './review';

export function useReviewSession(cards: Card[]) {
  const queue = shallowRef(cards.slice());
  const results = shallowRef<{ card: Card; remembered: boolean }[]>([]);
  const current = computed<Card | undefined>(() => queue.value[results.value.length]);
  const missed = computed(() => results.value.filter((result) => !result.remembered).map((result) => result.card));
  const answer = shallowRef('');
  const submitted = shallowRef(false);
  const automatic = shallowRef<boolean | null>(null);
  const remembered = shallowRef<boolean | null>(null);
  const attemptId = shallowRef('');
  const error = shallowRef('');
  const saving = shallowRef(false);

  function submit() {
    if (!current.value || submitted.value || !answer.value.trim()) return;
    automatic.value = gradeAnswer(answer.value, current.value.expected);
    remembered.value = automatic.value;
    submitted.value = true;
  }

  function grade(verdict: boolean) {
    if (submitted.value && !attemptId.value) remembered.value = verdict;
  }

  function resetAnswer() {
    answer.value = '';
    submitted.value = false;
    automatic.value = null;
    remembered.value = null;
    attemptId.value = '';
    error.value = '';
  }

  async function advance() {
    if (saving.value || remembered.value === null || !current.value) return;
    const card = current.value;
    const verdict = remembered.value;
    attemptId.value ||= crypto.randomUUID();
    error.value = '';
    saving.value = true;
    try {
      await call('review.record', { attemptId: attemptId.value, cardId: card.id, answer: answer.value, remembered: verdict });
      results.value = [...results.value, { card, remembered: verdict }];
      resetAnswer();
    } catch (reason) {
      error.value = '未能保存作答。' + errorMessage(reason);
    } finally {
      saving.value = false;
    }
  }

  function retryMissed() {
    queue.value = missed.value;
    results.value = [];
    resetAnswer();
  }

  return {
    current, missed, answer, submitted, automatic, remembered, error, saving,
    completed: computed(() => results.value.length),
    total: computed(() => queue.value.length),
    gradeLocked: computed(() => !!attemptId.value),
    submit, grade, advance, retryMissed,
  };
}
