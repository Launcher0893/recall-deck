<script setup lang="ts">
import { onMounted, shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton, ConfigProvider as AConfigProvider, Spin as ASpin } from '@arco-design/web-vue';
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn';
import AppShell from './shell/AppShell.vue';
import CardLibrary from './features/library/CardLibrary.vue';
import DeckSidebar from './features/library/DeckSidebar.vue';
import LibraryDialogs from './features/library/LibraryDialogs.vue';
import type { LibraryDialog } from './features/library/LibraryDialogs.vue';
import { useLibrary } from './features/library/useLibrary';
import ReviewSession from './features/review/ReviewSession.vue';
import type { Card, Deck } from './shared/models';

const {
  decks, selectedId, selectedDeck, selectedCards, counts, loading, loadError,
  load, saveDeck, saveCard, removeCard,
} = useLibrary();
const session = shallowRef<{ deck: Deck; cards: Card[] }>();
const dialog = shallowRef<LibraryDialog>();

onMounted(load);

function startReview() {
  if (selectedDeck.value && selectedCards.value.length) {
    session.value = { deck: selectedDeck.value, cards: selectedCards.value };
  }
}
</script>

<template>
  <AConfigProvider :locale="zhCN">
    <AppShell>
      <template #sidebar>
        <DeckSidebar :decks="decks" :counts="counts" :selected-id="selectedId"
          :can-create="!loading && !loadError && !session" :can-select="!session"
          @create="dialog = { type: 'deck', deck: null }" @select="selectedId = $event" />
      </template>

      <div v-if="loading" class="panel load-panel" role="status"><ASpin /> 正在读取卡库</div>
      <div v-else-if="loadError" class="panel load-panel">
        <AAlert type="error" role="alert">{{ loadError }}</AAlert>
        <AButton @click="load">重试读取</AButton>
      </div>
      <ReviewSession v-else-if="session" :deck="session.deck" :cards="session.cards" @close="session = undefined" />
      <CardLibrary v-else-if="selectedDeck" :key="selectedDeck.id" :deck="selectedDeck" :cards="selectedCards"
        @add="dialog = { type: 'card', card: null, deckId: selectedDeck.id }"
        @edit="dialog = { type: 'card', card: $event, deckId: $event.deckId }"
        @remove="dialog = { type: 'delete', card: $event }"
        @rename="dialog = { type: 'deck', deck: selectedDeck }"
        @start="startReview" />
    </AppShell>

    <LibraryDialogs v-if="dialog" :dialog="dialog" :save-deck="saveDeck" :save-card="saveCard" :remove-card="removeCard"
      @close="dialog = undefined" />
  </AConfigProvider>
</template>

<style scoped>
.load-panel { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px; }
</style>
