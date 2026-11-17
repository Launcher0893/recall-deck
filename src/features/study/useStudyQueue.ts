import { computed, onMounted, onUnmounted, shallowRef, watch } from 'vue';
import type { Card } from '../../shared/models';
import { reviewQueue } from '../review/reviewQueue';

export function useStudyQueue(cards: () => readonly Card[]) {
  const now = shallowRef(Date.now());
  const currentId = shallowRef<number>();
  const queue = computed(() => reviewQueue(cards(), now.value));
  const current = computed(() => queue.value.find((card) => card.id === currentId.value));
  const newCount = computed(() => queue.value.filter((card) => card.dueAt === null).length);
  const dueCount = computed(() => queue.value.length - newCount.value);
  const nextDue = computed(() => cards().reduce<number | null>((earliest, card) => {
    if (card.dueAt === null || card.dueAt <= now.value) return earliest;
    return earliest === null ? card.dueAt : Math.min(earliest, card.dueAt);
  }, null));

  watch(queue, (available) => {
    if (!available.some((card) => card.id === currentId.value)) currentId.value = available[0]?.id;
  }, { immediate: true });

  function refresh() {
    now.value = Date.now();
  }

  let clock: ReturnType<typeof setInterval>;
  onMounted(() => {
    clock = setInterval(refresh, 5_000);
    window.addEventListener('focus', refresh);
  });
  onUnmounted(() => {
    clearInterval(clock);
    window.removeEventListener('focus', refresh);
  });

  return { current, newCount, dueCount, nextDue, refresh };
}
