<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton, Empty as AEmpty, Tag as ATag } from '@arco-design/web-vue';
import { errorMessage } from '../../platform/tinyjs';
import type { Card, CardReviewUpdate, Deck } from '../../shared/models';
import ReviewSession from '../review/ReviewSession.vue';
import StudyCard from './StudyCard.vue';
import { useStudyQueue } from './useStudyQueue';
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
const { current, newCount, dueCount, nextDue, refresh } = useStudyQueue(() => props.cards);
const deckNames = computed(() => new Map(props.decks.map((deck) => [deck.id, deck.name])));
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

function startTest() {
  if (props.cards.length) testCards.value = props.cards.slice();
}

function closeTest() {
  refresh();
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
        <p class="muted">{{ dueCount }} 张到期 · {{ newCount }} 张新卡</p>
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
      <p v-if="!hasCards" class="muted study-guide">在卡组管理中新建卡片，通过「选择学习卡片」添加到学习队列。</p>
      <p v-if="nextDue !== null" class="muted">
        下一次复习 · <time :datetime="new Date(nextDue).toISOString()">{{ dateFormat.format(nextDue) }}</time>
      </p>
      <AAlert v-if="exampleError" type="error" role="alert">{{ exampleError }}</AAlert>
      <div v-if="!cards.length" class="heading-actions">
        <AButton type="primary" @click="emit('manage')">前往卡组管理</AButton>
        <AButton v-if="!hasCards" :loading="addingExamples" @click="addExamples">添加示例卡片</AButton>
      </div>
    </div>
  </section>
</template>
