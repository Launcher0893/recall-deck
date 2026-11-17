<script lang="ts">
import type { Card, Deck } from '../../shared/models';

export type LibraryDialog =
  | { type: 'deck'; deck: Deck | null }
  | { type: 'card'; card: Card | null; deckId: number; options: Deck[] }
  | { type: 'delete'; card: Card };
</script>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton, Input as AInput, Modal as AModal } from '@arco-design/web-vue';
import type { CardDraft } from '../../shared/models';
import { errorMessage } from '../../platform/tinyjs';
import CardEditor from './CardEditor.vue';
import './editor.css';

const props = defineProps<{
  dialog: LibraryDialog;
  saveDeck: (name: string, deckId?: number) => Promise<void>;
  saveCard: (draft: CardDraft, cardId?: number) => Promise<void>;
  removeCard: (cardId: number) => Promise<void>;
}>();
const emit = defineEmits<{ close: [] }>();

const deckName = shallowRef(props.dialog.type === 'deck' ? props.dialog.deck?.name ?? '' : '');
const busy = shallowRef(false);
const error = shallowRef('');

function close() {
  if (!busy.value) emit('close');
}

async function persist(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await action();
    emit('close');
  } catch (reason) {
    error.value = '操作失败。' + errorMessage(reason);
  } finally {
    busy.value = false;
  }
}

function saveDeck() {
  const { dialog } = props;
  const name = deckName.value.trim();
  if (dialog.type !== 'deck' || !name) return;
  return persist(() => props.saveDeck(name, dialog.deck?.id));
}

function saveCard(draft: CardDraft) {
  const { dialog } = props;
  if (dialog.type !== 'card') return;
  return persist(() => props.saveCard(draft, dialog.card?.id));
}

function removeCard() {
  const { dialog } = props;
  if (dialog.type !== 'delete') return;
  return persist(() => props.removeCard(dialog.card.id));
}
</script>

<template>
  <CardEditor v-if="dialog.type === 'card'" :card="dialog.card" :deck-id="dialog.deckId" :options="dialog.options"
    :busy="busy" :error="error" @save="saveCard" @close="close" />
  <AModal v-else-if="dialog.type === 'deck'" :visible="true" :title="dialog.deck ? '重命名卡组' : '新建卡组'"
    :footer="false" :mask-closable="false" :closable="!busy" :esc-to-close="!busy" @cancel="close">
    <form class="editor" @submit.prevent="saveDeck">
      <div class="editor-fields">
        <label for="deck-name">卡组名称</label>
        <AInput v-model="deckName" :input-attrs="{ id: 'deck-name' }" :max-length="80" :disabled="busy" />
      </div>
      <AAlert v-if="error" type="error" role="alert">{{ error }}</AAlert>
      <div class="dialog-actions">
        <AButton :disabled="busy" @click="close">取消</AButton>
        <AButton type="primary" html-type="submit" :loading="busy" :disabled="!deckName.trim()">保存卡组</AButton>
      </div>
    </form>
  </AModal>
  <AModal v-else :visible="true" title="删除卡片" :footer="false"
    :mask-closable="false" :closable="!busy" :esc-to-close="!busy" @cancel="close">
    <p>确定从当前卡组删除这张卡片吗？</p>
    <AAlert v-if="error" type="error" role="alert">{{ error }}</AAlert>
    <div class="dialog-actions">
      <AButton :disabled="busy" @click="close">取消</AButton>
      <AButton type="primary" status="danger" :loading="busy" @click="removeCard">确认删除</AButton>
    </div>
  </AModal>
</template>
