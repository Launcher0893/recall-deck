<script setup lang="ts">
import { shallowRef } from 'vue';
import {
  Alert as AAlert, Button as AButton, Empty as AEmpty, Input as AInput,
  Modal as AModal, Select as ASelect, Tag as ATag,
} from '@arco-design/web-vue';
import { errorMessage } from '../../platform/tinyjs';
import type { Card, Deck, StudySelectionChange } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';
import { useStudySelection } from './useStudySelection';

const props = defineProps<{
  cards: Card[];
  decks: Deck[];
  initialDeckId?: number;
  saveSelection: (changes: StudySelectionChange[]) => Promise<void>;
}>();
const emit = defineEmits<{ close: [] }>();

const {
  query, deckId, deckById, deckOptions, visibleCards, selectedIds, visibleSelectedCount, changes, setSelected,
} = useStudySelection(() => props.cards, () => props.decks, props.initialDeckId);
const busy = shallowRef(false);
const error = shallowRef('');

function toggleCard(card: Card, event: Event) {
  setSelected([card], (event.target as HTMLInputElement).checked);
}

function close() {
  if (!busy.value) emit('close');
}

async function save() {
  if (busy.value || !changes.value.length) return;
  busy.value = true;
  error.value = '';
  try {
    await props.saveSelection(changes.value);
    emit('close');
  } catch (reason) {
    error.value = '无法保存学习卡片。' + errorMessage(reason);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AModal :visible="true" title="选择学习卡片" :width="740" :mask-closable="false"
    :closable="!busy" :esc-to-close="!busy" @cancel="close">
    <div class="selection-controls">
      <AInput v-model="query" allow-clear placeholder="搜索卡片正面"
        :input-attrs="{ 'aria-label': '搜索卡片正面' }" :disabled="busy" />
      <ASelect v-if="deckOptions.length > 1 || deckId !== undefined" v-model="deckId" :options="deckOptions" allow-clear
        placeholder="全部卡组" aria-label="按卡组筛选" :disabled="busy" />
    </div>
    <div class="selection-toolbar">
      <p class="muted" aria-live="polite">共 {{ cards.length }} 张，已选 {{ selectedIds.size }} 张</p>
      <div class="heading-actions">
        <AButton size="small" :disabled="busy || visibleSelectedCount === visibleCards.length"
          @click="setSelected(visibleCards, true)">全选当前结果</AButton>
        <AButton size="small" :disabled="busy || visibleSelectedCount === 0"
          @click="setSelected(visibleCards, false)">取消选中当前结果</AButton>
      </div>
    </div>
    <ul v-if="visibleCards.length" class="selection-list" aria-label="学习卡片">
      <li v-for="card in visibleCards" :key="card.id" class="selection-row"
        :class="{ 'selection-row-selected': selectedIds.has(card.id) }">
        <label class="selection-toggle">
          <input type="checkbox" :checked="selectedIds.has(card.id)" :disabled="busy"
            :aria-labelledby="'study-card-front-' + card.id" @change="toggleCard(card, $event)" />
        </label>
        <div :id="'study-card-front-' + card.id" class="selection-front">
          <MarkdownView :source="card.front" />
        </div>
        <ATag v-if="deckOptions.length > 1" :color="deckById.get(card.deckId)?.color ?? undefined">
          {{ deckById.get(card.deckId)?.name }}
        </ATag>
      </li>
    </ul>
    <AEmpty v-else description="没有匹配的卡片" />
    <AAlert v-if="error" class="selection-error" type="error" role="alert">{{ error }}</AAlert>
    <template #footer>
      <AButton :disabled="busy" @click="close">取消</AButton>
      <AButton type="primary" :loading="busy" :disabled="!changes.length" @click="save">保存选择</AButton>
    </template>
  </AModal>
</template>

<style scoped>
.selection-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 10px; }
.selection-toolbar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin: 14px 0 10px;
}
.selection-list {
  list-style: none; margin: 0; padding: 0; max-height: min(52vh, 460px);
  overflow: auto; border: 1px solid var(--border-soft); border-radius: 6px;
}
.selection-row {
  position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center; gap: 10px; min-height: 43px; padding: 9px 12px;
}
.selection-row + .selection-row { border-top: 1px solid var(--border-soft); }
.selection-row-selected { background: var(--color-primary-light-1); }
.selection-row:hover { background: var(--color-fill-1); }
.selection-toggle input { margin: 0; accent-color: var(--accent); cursor: pointer; }
.selection-toggle::after { content: ''; position: absolute; inset: 0; cursor: pointer; }
.selection-toggle:has(input:disabled)::after { cursor: default; }
.selection-front { min-width: 0; max-height: 7em; overflow: hidden; overflow-wrap: anywhere; }
.selection-error { margin-top: 10px; }
</style>
