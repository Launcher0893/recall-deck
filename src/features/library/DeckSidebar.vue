<script setup lang="ts">
import { Button as AButton } from '@arco-design/web-vue';
import { IconBook, IconPlus } from '@arco-design/web-vue/es/icon';
import type { Deck } from '../../shared/models';
import './sidebar.css';

defineProps<{
  decks: Deck[];
  counts: ReadonlyMap<number, number>;
  selectedId: number | undefined;
  canCreate: boolean;
  canSelect: boolean;
}>();
const emit = defineEmits<{ create: []; select: [number] }>();
</script>

<template>
  <aside class="sidebar" aria-label="卡组">
    <div class="sidebar-heading">
      <h2>卡组</h2>
      <AButton type="text" shape="circle" aria-label="新建卡组" title="新建卡组" :disabled="!canCreate"
        @click="emit('create')">
        <template #icon><IconPlus /></template>
      </AButton>
    </div>
    <nav aria-label="卡组列表">
      <button v-for="deck in decks" :key="deck.id" type="button" class="deck-link"
        :class="{ 'deck-link-current': selectedId === deck.id }"
        :aria-current="selectedId === deck.id ? 'page' : undefined" :disabled="!canSelect"
        @click="emit('select', deck.id)">
        <IconBook />
        <span>{{ deck.name }}</span>
        <small>{{ counts.get(deck.id) ?? 0 }}</small>
      </button>
    </nav>
  </aside>
</template>
