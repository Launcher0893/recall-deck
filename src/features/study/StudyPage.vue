<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton, Empty as AEmpty, Tag as ATag } from '@arco-design/web-vue';
import { errorMessage } from '../../platform/tinyjs';
import type { Card, Deck, ReviewRating, StudyAttempt, StudyMode } from '../../shared/models';
import { ratings } from '../review/ratings';
import StudyCard from './StudyCard.vue';
import { useStudyQueue } from './useStudyQueue';
import './study.css';

const props = defineProps<{
  cards: Card[];
  decks: Deck[];
  mode: StudyMode;
  scopeName?: string;
  hasPendingTest: boolean;
  saving: boolean;
  previousAttempt?: StudyAttempt;
  hasCards: boolean;
  addExamples: () => Promise<void>;
  saveReview: (mode: StudyMode, attempt: StudyAttempt, expectedRating?: ReviewRating) => Promise<void>;
}>();
const emit = defineEmits<{ manage: []; test: []; clearScope: [] }>();
const addingExamples = shallowRef(false);
const exampleError = shallowRef('');
const revising = shallowRef(false);
const { current, remaining, nextDue } = useStudyQueue(() => props.cards, props.mode);
const title = computed(() => props.mode === 'learn' ? '学习' : '复习');
const previousCard = computed(() => props.cards.find((card) => card.id === props.previousAttempt?.cardId));
const displayedCard = computed(() => revising.value ? previousCard.value : current.value);
const revision = computed(() => revising.value ? props.previousAttempt : undefined);
const deckNames = computed(() => new Map(props.decks.map((deck) => [deck.id, deck.name])));
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

async function saveRating(attempt: StudyAttempt, expectedRating?: ReviewRating) {
  await props.saveReview(props.mode, attempt, expectedRating);
  revising.value = false;
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
  <section class="study-page" aria-labelledby="study-heading">
    <div class="page-heading">
      <div>
        <h1 id="study-heading">{{ title }}</h1>
        <p class="muted">{{ scopeName ? scopeName + ' · ' : '' }}{{ remaining }} 张{{ mode === 'learn' ? '待学习' : '已到期' }}</p>
      </div>
      <div class="heading-actions">
        <AButton v-if="scopeName" :disabled="saving" @click="emit('clearScope')">全部卡组</AButton>
        <AButton :disabled="saving || (!cards.length && !hasPendingTest)" @click="emit('test')">
          {{ hasPendingTest ? '继续自测' : '键盘自测' }}
        </AButton>
      </div>
    </div>
    <StudyCard v-if="displayedCard" :key="displayedCard.id + (revision ? ':revision' : ':current')"
      :card="displayedCard" :revision="revision" :can-go-back="!!previousCard"
      :save-review="saveRating" @previous="revising = true" @cancel-revision="revising = false">
      <div class="study-card-meta">
        <ATag v-if="revision" :color="ratings[revision.rating].color">上一次判分 · {{ ratings[revision.rating].label }}</ATag>
        <ATag v-else :color="mode === 'learn' ? 'blue' : 'orange'">{{ mode === 'learn' ? '新卡' : '到期' }}</ATag>
        <span class="muted">{{ deckNames.get(displayedCard.deckId) }}</span>
      </div>
    </StudyCard>
    <div v-else class="panel study-empty">
      <AEmpty :description="cards.length ? (mode === 'learn' ? '没有待学习的新卡' : '没有到期的卡片') : '还没有加入学习的卡片'" />
      <p v-if="!hasCards" class="muted study-guide">在卡组管理中新建卡片，通过「选择学习卡片」添加到学习队列。</p>
      <p v-if="mode === 'review' && nextDue !== null" class="muted">
        下一次复习 · <time :datetime="new Date(nextDue).toISOString()">{{ dateFormat.format(nextDue) }}</time>
      </p>
      <AAlert v-if="exampleError" type="error" role="alert">{{ exampleError }}</AAlert>
      <div v-if="!cards.length" class="heading-actions">
        <AButton type="primary" @click="emit('manage')">前往卡组管理</AButton>
        <AButton v-if="!hasCards && mode === 'learn'" :loading="addingExamples" @click="addExamples">添加示例卡片</AButton>
      </div>
      <AButton v-if="previousCard" @click="revising = true">上一张</AButton>
    </div>
  </section>
</template>
