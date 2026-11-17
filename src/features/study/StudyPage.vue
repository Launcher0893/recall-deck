<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, watch } from 'vue';
import { Alert as AAlert, Button as AButton, Empty as AEmpty, Tag as ATag } from '@arco-design/web-vue';
import { errorMessage } from '../../platform/tinyjs';
import type { Card, CardReviewUpdate, Deck } from '../../shared/models';
import ReviewSession from '../review/ReviewSession.vue';
import { reviewQueue } from '../review/reviewQueue';
import StudyCard from './StudyCard.vue';
import './study.css';

const props = defineProps<{
  cards: Card[];
  decks: Deck[];
  hasCards: boolean;
  addExamples: () => Promise<void>;
  applyReview: (update: CardReviewUpdate) => void;
}>();
const emit = defineEmits<{ manage: [] }>();
const testCards = shallowRef<Card[]>();
const addingExamples = shallowRef(false);
const exampleError = shallowRef('');
const currentId = shallowRef<number>();
const now = shallowRef(Date.now());
const queue = computed(() => reviewQueue(props.cards, now.value));
const current = computed(() => queue.value.find((card) => card.id === currentId.value));
const newCount = computed(() => queue.value.filter((card) => card.dueAt === null).length);
const deckNames = computed(() => new Map(props.decks.map((deck) => [deck.id, deck.name])));
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
const nextDue = computed(() => props.cards.reduce<number | null>((earliest, card) => {
  if (card.dueAt === null || card.dueAt <= now.value) return earliest;
  return earliest === null ? card.dueAt : Math.min(earliest, card.dueAt);
}, null));
let clock: ReturnType<typeof setInterval>;

watch(queue, (cards) => {
  if (!cards.some((card) => card.id === currentId.value)) currentId.value = cards[0]?.id;
}, { immediate: true });

function updateClock() {
  now.value = Date.now();
}

onMounted(() => {
  clock = setInterval(updateClock, 5_000);
  window.addEventListener('focus', updateClock);
});
onUnmounted(() => {
  clearInterval(clock);
  window.removeEventListener('focus', updateClock);
});

function startTest() {
  if (props.cards.length) testCards.value = props.cards.slice();
}

function closeTest() {
  updateClock();
  testCards.value = undefined;
}

async function addExamples() {
  if (addingExamples.value) return;
  addingExamples.value = true;
  exampleError.value = '';
  try {
    await props.addExamples();
  } catch (reason) {
    exampleError.value = '无法添加示例卡片。' + errorMessage(reason);
  } finally {
    addingExamples.value = false;
  }
}
</script>

<template>
  <ReviewSession v-if="testCards" :cards="testCards" @close="closeTest" />
  <section v-else class="study-page" aria-labelledby="study-heading">
    <div class="page-heading">
      <div>
        <h1 id="study-heading">学习与复习</h1>
        <p class="muted">{{ queue.length - newCount }} 张到期 · {{ newCount }} 张新卡</p>
      </div>
      <AButton size="large" :disabled="!cards.length" @click="startTest">键盘自测</AButton>
    </div>
    <StudyCard v-if="current" :key="current.id" :card="current" :apply-review="applyReview">
      <div class="study-card-meta">
        <ATag :color="current.dueAt === null ? 'blue' : 'orange'">{{ current.dueAt === null ? '新卡' : '到期' }}</ATag>
        <span class="muted">{{ deckNames.get(current.deckId) }}</span>
      </div>
    </StudyCard>
    <div v-else class="panel study-empty">
      <AEmpty :description="cards.length ? '当前的学习与复习已完成' : '还没有加入学习的卡片'" />
      <p v-if="!hasCards" class="muted study-guide">在卡组管理中新建卡片，勾选「加入学习」，再回到这里翻面复习。</p>
      <p v-if="nextDue !== null" class="muted">
        下一次复习 · <time :datetime="new Date(nextDue).toISOString()">{{ dateFormat.format(nextDue) }}</time>
      </p>
      <AAlert v-if="exampleError" type="error" role="alert">{{ exampleError }}</AAlert>
      <div v-if="!cards.length" class="heading-actions">
        <AButton type="primary" @click="emit('manage')">{{ hasCards ? '前往卡组勾选' : '前往卡组管理' }}</AButton>
        <AButton v-if="!hasCards" :loading="addingExamples" @click="addExamples">添加示例卡片</AButton>
      </div>
    </div>
  </section>
</template>
