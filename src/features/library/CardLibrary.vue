<script setup lang="ts">
import { shallowRef } from 'vue';
import { Button as AButton, Empty as AEmpty } from '@arco-design/web-vue';
import { IconDelete, IconEdit, IconPlayArrow, IconPlus } from '@arco-design/web-vue/es/icon';
import type { Card, Deck } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';
import './library.css';

defineProps<{ deck: Deck; cards: Card[] }>();
const emit = defineEmits<{ add: []; edit: [Card]; remove: [Card]; rename: []; start: [] }>();
const revealed = shallowRef<ReadonlySet<number>>(new Set());

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
        <p class="muted">{{ cards.length }} 张卡片</p>
      </div>
      <div class="heading-actions">
        <AButton size="large" :disabled="!cards.length" @click="emit('start')">
          <template #icon><IconPlayArrow /></template>开始自测
        </AButton>
        <AButton size="large" type="primary" @click="emit('add')">
          <template #icon><IconPlus /></template>新建卡片
        </AButton>
      </div>
    </div>

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
