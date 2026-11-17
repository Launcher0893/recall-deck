<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton, Empty as AEmpty, Tag as ATag } from '@arco-design/web-vue';
import { IconDelete, IconEdit, IconPlus } from '@arco-design/web-vue/es/icon';
import { errorMessage } from '../../platform/tinyjs';
import type { Card, Deck } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';
import { ratings } from '../review/ratings';
import './library.css';

const props = defineProps<{
  deck: Deck;
  cards: Card[];
  setStudySelected: (cardId: number, selected: boolean) => Promise<void>;
}>();
const emit = defineEmits<{ add: []; edit: [Card]; remove: [Card]; rename: [] }>();
const revealed = shallowRef<ReadonlySet<number>>(new Set());
const pending = reactive(new Set<number>());
const selectionError = shallowRef('');
const studyCount = computed(() => props.cards.filter((card) => card.studySelected).length);
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

async function changeStudySelection(card: Card, event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = input.checked;
  pending.add(card.id);
  selectionError.value = '';
  try {
    await props.setStudySelected(card.id, selected);
  } catch (error) {
    input.checked = card.studySelected;
    selectionError.value = '无法保存学习勾选。' + errorMessage(error);
  } finally {
    pending.delete(card.id);
  }
}

function toggle(cardId: number) {
  const next = new Set(revealed.value);
  if (next.has(cardId)) next.delete(cardId);
  else next.add(cardId);
  revealed.value = next;
}
</script>

<template>
  <section aria-labelledby="deck-heading">
    <div class="page-heading">
      <div>
        <div class="heading-title">
          <h1 id="deck-heading">{{ deck.name }}</h1>
          <AButton type="text" shape="circle" aria-label="重命名卡组" title="重命名卡组" @click="emit('rename')">
            <template #icon><IconEdit /></template>
          </AButton>
        </div>
        <p class="muted">{{ cards.length }} 张卡片 · {{ studyCount }} 张已加入学习</p>
      </div>
      <div class="heading-actions">
        <AButton size="large" type="primary" @click="emit('add')">
          <template #icon><IconPlus /></template>新建卡片
        </AButton>
      </div>
    </div>

    <AAlert v-if="selectionError" type="error" role="alert">{{ selectionError }}</AAlert>
    <div v-if="!cards.length" class="panel empty-panel">
      <AEmpty description="这个卡组还没有卡片" />
      <AButton type="primary" @click="emit('add')">添加第一张卡片</AButton>
    </div>
    <ul v-else class="card-list">
      <li v-for="card in cards" :key="card.id" class="panel library-card">
        <div class="library-card-main">
          <div class="library-front">
            <MarkdownView :source="card.front" />
          </div>
          <div class="card-actions">
            <AButton type="text" shape="circle" aria-label="编辑卡片" title="编辑卡片" @click="emit('edit', card)">
              <template #icon><IconEdit /></template>
            </AButton>
            <AButton type="text" shape="circle" status="danger" aria-label="删除卡片" title="删除卡片" @click="emit('remove', card)">
              <template #icon><IconDelete /></template>
            </AButton>
          </div>
        </div>
        <div class="card-schedule" role="group" aria-label="复习状态">
          <label class="study-checkbox">
            <input type="checkbox" :checked="card.studySelected" :disabled="pending.has(card.id)"
              @change="changeStudySelection(card, $event)" />
            加入学习
          </label>
          <ATag v-if="card.reviewState" :color="ratings[card.reviewState].color">{{ ratings[card.reviewState].label }}</ATag>
          <ATag v-else>未学习</ATag>
          <span v-if="card.studySelected && card.dueAt !== null" class="muted">
            下次复习 ·
            <time :datetime="new Date(card.dueAt).toISOString()">{{ dateFormat.format(card.dueAt) }}</time>
          </span>
        </div>
        <div v-if="revealed.has(card.id)" class="library-back">
          <h3>背面</h3>
          <MarkdownView :source="card.back" />
        </div>
        <AButton type="text" size="small" :aria-expanded="revealed.has(card.id)" @click="toggle(card.id)">
          {{ revealed.has(card.id) ? '收起背面' : '查看背面' }}
        </AButton>
      </li>
    </ul>
  </section>
</template>
