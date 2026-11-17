<script setup lang="ts">
import { onMounted, shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton, ConfigProvider as AConfigProvider, Spin as ASpin } from '@arco-design/web-vue';
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
import { IconBook, IconLayers } from '@arco-design/web-vue/es/icon';
import AppShell from './shell/AppShell.vue';
import CardLibrary from './features/library/CardLibrary.vue';
import DeckSidebar from './features/library/DeckSidebar.vue';
import LibraryDialogs, { type LibraryDialog } from './features/library/LibraryDialogs.vue';
import StudySelectionDialog from './features/library/StudySelectionDialog.vue';
import { useLibrary } from './features/library/useLibrary';
import StudyPage from './features/study/StudyPage.vue';
import type { Card } from './shared/models';

const {
  decks, cards, childDecks, selectedId, selectedDeck, selectedCards, studyCards, hasCards, counts, loading, loadError,
  load, addExamples, saveDeck, saveCard, removeCard, saveStudySelection, updateCardStudy, cardDeckOptions,
} = useLibrary();
const page = shallowRef<'study' | 'library'>('study');
const dialog = shallowRef<LibraryDialog | { type: 'study-selection' }>();

onMounted(load);

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
          <button type="button" class="deck-link" :class="{ 'deck-link-current': page === 'study' }"
            :aria-current="page === 'study' ? 'page' : undefined" @click="page = 'study'">
            <IconBook /><span>学习与复习</span>
          </button>
          <button type="button" class="deck-link" :class="{ 'deck-link-current': page === 'library' }"
            :aria-current="page === 'library' ? 'page' : undefined" @click="page = 'library'">
            <IconLayers /><span>卡组管理</span>
          </button>
        </nav>
        <DeckSidebar v-if="page === 'library'" :decks="decks" :child-decks="childDecks" :counts="counts" :selected-id="selectedId"
          :can-create="!loading && !loadError"
          @create="dialog = { type: 'deck', deck: null }" @select="selectedId = $event" />
      </template>

      <div v-if="loading" class="panel load-panel" role="status"><ASpin /> 正在读取卡库</div>
      <div v-else-if="loadError" class="panel load-panel">
        <AAlert type="error" role="alert">{{ loadError }}</AAlert>
        <AButton @click="load">重试读取</AButton>
      </div>
      <StudyPage v-else-if="page === 'study'" :decks="decks" :cards="studyCards" :has-cards="hasCards"
        :add-examples="addExamples" :apply-review="updateCardStudy"
        @manage="page = 'library'" />
      <CardLibrary v-else-if="selectedDeck" :key="selectedDeck.id" :deck="selectedDeck" :cards="selectedCards"
        :subdecks="childDecks.get(selectedDeck.id)"
        :can-select-study="hasCards" @select-study="dialog = { type: 'study-selection' }"
        @add="openCardEditor(null)"
        @edit="openCardEditor"
        @remove="dialog = { type: 'delete', card: $event }"
        @rename="dialog = { type: 'deck', deck: selectedDeck }" />
    </AppShell>

    <StudySelectionDialog v-if="dialog?.type === 'study-selection'" :cards="cards" :decks="decks"
      :save-selection="saveStudySelection" @close="dialog = undefined" />
    <LibraryDialogs v-else-if="dialog" :dialog="dialog" :save-deck="saveDeck" :save-card="saveCard" :remove-card="removeCard"
      @close="dialog = undefined" />
  </AConfigProvider>
</template>

<style scoped>
.load-panel { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px; }
.page-nav { padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-soft); }
</style>
