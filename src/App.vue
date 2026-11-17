<script setup lang="ts">
import { onMounted, shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton, ConfigProvider as AConfigProvider, Spin as ASpin } from '@arco-design/web-vue';
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
import { IconBook, IconLayers } from '@arco-design/web-vue/es/icon';
import AppShell from './shell/AppShell.vue';
import CardLibrary from './features/library/CardLibrary.vue';
import DeckSidebar from './features/library/DeckSidebar.vue';
import LibraryDialogs from './features/library/LibraryDialogs.vue';
import type { LibraryDialog } from './features/library/LibraryDialogs.vue';
import { useLibrary } from './features/library/useLibrary';
import StudyPage from './features/study/StudyPage.vue';

const {
  decks, selectedId, selectedDeck, selectedCards, studyCards, counts, loading, loadError,
  load, saveDeck, saveCard, removeCard, setStudySelected, updateCardStudy,
} = useLibrary();
const page = shallowRef<'study' | 'library'>('study');
const dialog = shallowRef<LibraryDialog>();

onMounted(load);

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
        <DeckSidebar v-if="page === 'library'" :decks="decks" :counts="counts" :selected-id="selectedId"
          :can-create="!loading && !loadError"
          @create="dialog = { type: 'deck', deck: null }" @select="selectedId = $event" />
      </template>

      <div v-if="loading" class="panel load-panel" role="status"><ASpin /> 正在读取卡库</div>
      <div v-else-if="loadError" class="panel load-panel">
        <AAlert type="error" role="alert">{{ loadError }}</AAlert>
        <AButton @click="load">重试读取</AButton>
      </div>
      <StudyPage v-else-if="page === 'study'" :decks="decks" :cards="studyCards" :apply-review="updateCardStudy"
        @manage="page = 'library'" />
      <CardLibrary v-else-if="selectedDeck" :key="selectedDeck.id" :deck="selectedDeck" :cards="selectedCards"
        :set-study-selected="setStudySelected"
        @add="dialog = { type: 'card', card: null, deckId: selectedDeck.id }"
        @edit="dialog = { type: 'card', card: $event, deckId: $event.deckId }"
        @remove="dialog = { type: 'delete', card: $event }"
        @rename="dialog = { type: 'deck', deck: selectedDeck }" />
    </AppShell>

    <LibraryDialogs v-if="dialog" :dialog="dialog" :save-deck="saveDeck" :save-card="saveCard" :remove-card="removeCard"
      @close="dialog = undefined" />
  </AConfigProvider>
</template>

<style scoped>
.load-panel { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px; }
.page-nav { padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-soft); }
</style>
