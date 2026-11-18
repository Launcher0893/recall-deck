<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton, ConfigProvider as AConfigProvider, Modal as AModal, Spin as ASpin } from '@arco-design/web-vue';
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
import { IconBarChart, IconBook, IconHistory, IconLayers, IconSave } from '@arco-design/web-vue/es/icon';
import AppShell from './shell/AppShell.vue';
import CardLibrary from './features/library/CardLibrary.vue';
import BackupPage from './features/library/BackupPage.vue';
import DeckSidebar from './features/library/DeckSidebar.vue';
import LibraryDialogs, { type LibraryDialog } from './features/library/LibraryDialogs.vue';
import StudySelectionDialog from './features/library/StudySelectionDialog.vue';
import { useLibrary } from './features/library/useLibrary';
import StudyPage from './features/study/StudyPage.vue';
import StatisticsPage from './features/statistics/StatisticsPage.vue';
import ReviewSession from './features/review/ReviewSession.vue';
import { useReviewSession } from './features/review/useReviewSession';
import { call } from './platform/tinyjs';
import type { Card, ReviewRating, StudyAttempt, StudyMode } from './shared/models';

const {
  decks, cards, childDecks, selectedId, selectedDeck, selectedCards, cardsForDeck, studyCards, hasCards, counts, loading, loadError,
  load, addExamples, saveDeck, saveCard, removeCard, saveStudySelection, updateCardStudy, cardDeckOptions,
} = useLibrary();
type Page = StudyMode | 'library' | 'statistics' | 'backup';
const page = shallowRef<Page | 'test'>('learn');
const returnPage = shallowRef<Page>('learn');
const studyDeckId = shallowRef<number>();
const testDeckId = shallowRef<number>();
const replaceTest = shallowRef<number>();
const restoring = shallowRef(false);
const savingStudy = shallowRef(false);
const reviewSession = useReviewSession();
const hasPendingTest = computed(() => reviewSession.total.value > 0 || reviewSession.completed.value > 0);
const navigationLocked = computed(() => restoring.value || savingStudy.value || reviewSession.saving.value);
const scopeName = computed(() => decks.value.find((deck) => deck.id === studyDeckId.value)?.name);
const testScopeName = computed(() => decks.value.find((deck) => deck.id === testDeckId.value)?.name);
const scopedStudyCards = computed(() => studyDeckId.value === undefined
  ? studyCards.value : cardsForDeck(studyDeckId.value).filter((card) => card.studySelected));
const previousAttempts = shallowRef<Partial<Record<StudyMode, StudyAttempt>>>({});
const dialog = shallowRef<LibraryDialog | { type: 'study-selection'; deckId?: number }>();

onMounted(load);

async function saveStudyRating(mode: StudyMode, attempt: StudyAttempt, expectedRating?: ReviewRating) {
  savingStudy.value = true;
  try {
    const update = expectedRating === undefined
      ? await call('study.record', attempt)
      : await call('study.revise', { ...attempt, expectedRating });
    updateCardStudy(update);
    const otherMode = mode === 'learn' ? 'review' : 'learn';
    const other = previousAttempts.value[otherMode];
    previousAttempts.value = { [mode]: attempt, [otherMode]: other?.cardId === attempt.cardId ? undefined : other };
  } finally {
    savingStudy.value = false;
  }
}

function navigate(target: Page) {
  if (navigationLocked.value) return;
  if (target === 'learn' || target === 'review') studyDeckId.value = undefined;
  page.value = target;
}

function startDeckStudy(mode: StudyMode) {
  studyDeckId.value = selectedId.value;
  page.value = mode;
}

function resumeTest() {
  if (navigationLocked.value) return;
  if (page.value !== 'test') returnPage.value = page.value;
  page.value = 'test';
}

function startTest(deckId?: number) {
  const available = deckId === undefined ? studyCards.value : cardsForDeck(deckId).filter((card) => card.studySelected);
  if (!available.length) return;
  testDeckId.value = deckId;
  reviewSession.start(available);
  resumeTest();
}

function startDeckTest() {
  const deckId = selectedId.value;
  if (hasPendingTest.value && testDeckId.value === deckId) resumeTest();
  else if (hasPendingTest.value) replaceTest.value = deckId;
  else startTest(deckId);
}

function pauseTest() {
  page.value = returnPage.value;
}

function finishTest() {
  reviewSession.start([]);
  pauseTest();
}

async function deleteCard(cardId: number) {
  await removeCard(cardId);
  if (hasPendingTest.value) reviewSession.removeCard(cardId);
}

async function restoreLibrary() {
  restoring.value = true;
  try {
    const result = await call('backup.restore', {});
    if (result) {
      reviewSession.start([]);
      previousAttempts.value = {};
      studyDeckId.value = undefined;
      selectedId.value = undefined;
      await load();
    }
    return result;
  } finally {
    restoring.value = false;
  }
}

function openCardEditor(card: Card | null) {
  const deck = selectedDeck.value;
  if (!deck) return;
  const options = cardDeckOptions(deck, card?.deckId);
  const deckId = card?.deckId ?? (deck.parentId === null ? options[0].id : deck.id);
  dialog.value = { type: 'card', card, deckId, options };
}
</script>

<template>
  <AConfigProvider :locale="zhCN">
    <AppShell>
      <template #sidebar>
        <nav aria-label="页面" class="page-nav">
          <button type="button" class="deck-link" :class="{ 'deck-link-current': page === 'learn' }"
            :aria-current="page === 'learn' ? 'page' : undefined" :disabled="navigationLocked" @click="navigate('learn')">
            <IconBook /><span>学习</span>
          </button>
          <button type="button" class="deck-link" :class="{ 'deck-link-current': page === 'review' }"
            :aria-current="page === 'review' ? 'page' : undefined" :disabled="navigationLocked" @click="navigate('review')">
            <IconHistory /><span>复习</span>
          </button>
          <button type="button" class="deck-link" :class="{ 'deck-link-current': page === 'library' }"
            :aria-current="page === 'library' ? 'page' : undefined" :disabled="navigationLocked" @click="navigate('library')">
            <IconLayers /><span>卡组管理</span>
          </button>
          <button type="button" class="deck-link" :class="{ 'deck-link-current': page === 'statistics' }"
            :aria-current="page === 'statistics' ? 'page' : undefined" :disabled="navigationLocked" @click="navigate('statistics')">
            <IconBarChart /><span>数据统计</span>
          </button>
          <button v-if="hasPendingTest || page === 'test'" type="button" class="deck-link"
            :class="{ 'deck-link-current': page === 'test' }" :aria-current="page === 'test' ? 'page' : undefined"
            :disabled="navigationLocked" @click="resumeTest">
            <IconBook /><span>{{ page === 'test' ? '键盘自测' : '继续自测' }}</span>
          </button>
          <button type="button" class="deck-link" :class="{ 'deck-link-current': page === 'backup' }"
            :aria-current="page === 'backup' ? 'page' : undefined" :disabled="navigationLocked" @click="navigate('backup')">
            <IconSave /><span>备份与恢复</span>
          </button>
        </nav>
        <DeckSidebar v-if="page === 'library'" :decks="decks" :child-decks="childDecks" :counts="counts" :selected-id="selectedId"
          :can-create="!loading && !loadError"
          @create="dialog = { type: 'deck', deck: null }" @select="selectedId = $event" />
      </template>

      <StatisticsPage v-if="page === 'statistics'" />
      <BackupPage v-else-if="page === 'backup'" :restore="restoreLibrary" />
      <div v-else-if="loading" class="panel load-panel" role="status"><ASpin /> 正在读取卡库</div>
      <div v-else-if="loadError" class="panel load-panel">
        <AAlert type="error" role="alert">{{ loadError }}</AAlert>
        <AButton @click="load">重试读取</AButton>
      </div>
      <ReviewSession v-else-if="page === 'test'" :session="reviewSession" :scope-name="testScopeName"
        @pause="pauseTest" @finish="finishTest" />
      <StudyPage v-else-if="page === 'learn' || page === 'review'" :key="page + (studyDeckId ?? '')" :mode="page"
        :decks="decks" :cards="scopedStudyCards" :scope-name="scopeName" :has-pending-test="hasPendingTest"
        :has-cards="hasCards" :previous-attempt="previousAttempts[page]"
        :add-examples="addExamples" :save-review="saveStudyRating" :saving="savingStudy"
        @manage="navigate('library')" @clear-scope="studyDeckId = undefined"
        @test="hasPendingTest ? resumeTest() : startTest(studyDeckId)" />
      <CardLibrary v-else-if="selectedDeck" :key="selectedDeck.id" :deck="selectedDeck" :cards="selectedCards"
        :subdecks="childDecks.get(selectedDeck.id)"
        :can-select-study="hasCards" @select-study="dialog = { type: 'study-selection', deckId: selectedCards.length ? selectedDeck.id : undefined }"
        @study="startDeckStudy" @test="startDeckTest"
        @add="openCardEditor(null)"
        @edit="openCardEditor"
        @remove="dialog = { type: 'delete', card: $event }"
        @rename="dialog = { type: 'deck', deck: selectedDeck }" />
    </AppShell>

    <StudySelectionDialog v-if="dialog?.type === 'study-selection'" :cards="cards" :decks="decks" :initial-deck-id="dialog.deckId"
      :save-selection="saveStudySelection" @close="dialog = undefined" />
    <LibraryDialogs v-else-if="dialog" :dialog="dialog" :save-deck="saveDeck" :save-card="saveCard" :remove-card="deleteCard"
      @close="dialog = undefined" />
    <AModal v-if="replaceTest !== undefined" :visible="true" title="开始新的自测？" ok-text="开始本组自测"
      cancel-text="取消" :mask-closable="false" @ok="startTest(replaceTest); replaceTest = undefined"
      @cancel="replaceTest = undefined">
      <p>开始后会结束当前这一轮，已保存的作答记录会保留。</p>
    </AModal>
  </AConfigProvider>
</template>

<style scoped>
.load-panel { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px; }
.page-nav { padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-soft); }
</style>
