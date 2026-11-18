<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { Button as AButton, Empty as AEmpty, Tag as ATag } from '@arco-design/web-vue';
import { IconDelete, IconEdit, IconPlus } from '@arco-design/web-vue/es/icon';
import type { Card, Deck, StudyMode } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';
import { ratings } from '../review/ratings';
import './library.css';

const props = defineProps<{
  deck: Deck;
  subdecks?: Deck[];
  cards: Card[];
  canSelectStudy: boolean;
}>();
const emit = defineEmits<{
  add: []; edit: [Card]; remove: [Card]; rename: []; selectStudy: []; study: [StudyMode]; test: [];
}>();
const revealed = shallowRef<ReadonlySet<number>>(new Set());
const studyCount = computed(() => props.cards.filter((card) => card.studySelected).length);
const subdeckById = computed(() => new Map(props.subdecks?.map((deck) => [deck.id, deck])));
const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

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
        <AButton size="large" :disabled="!canSelectStudy" @click="emit('selectStudy')">选择学习卡片</AButton>
        <AButton size="large" type="primary" @click="emit('add')">
          <template #icon><IconPlus /></template>新建卡片
        </AButton>
      </div>
    </div>

    <div v-if="cards.length" class="heading-actions deck-study-actions" aria-label="按卡组开始">
      <AButton :disabled="!studyCount" @click="emit('study', 'learn')">学习本组</AButton>
      <AButton :disabled="!studyCount" @click="emit('study', 'review')">复习本组</AButton>
      <AButton :disabled="!studyCount" @click="emit('test')">自测本组</AButton>
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
        <div class="card-schedule" role="group" aria-label="复习状态">
          <ATag v-if="subdeckById.has(card.deckId)" :color="subdeckById.get(card.deckId)?.color ?? undefined">
            {{ subdeckById.get(card.deckId)?.name }}
          </ATag>
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

<style scoped>
.deck-study-actions { margin-bottom: 16px; }
</style>
