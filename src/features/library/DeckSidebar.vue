<script setup lang="ts">
import { computed } from 'vue';
import { Button as AButton } from '@arco-design/web-vue';
import { IconBook, IconPlus } from '@arco-design/web-vue/es/icon';
import type { Deck } from '../../shared/models';
import './sidebar.css';

const props = defineProps<{
  decks: Deck[];
  childDecks: ReadonlyMap<number, Deck[]>;
  counts: ReadonlyMap<number, number>;
  selectedId: number | undefined;
  canCreate: boolean;
}>();
const rootDecks = computed(() => props.decks.filter((deck) => deck.parentId === null));
const emit = defineEmits<{ create: []; select: [number] }>();
</script>

<template>
  <div>
    <div class="sidebar-heading">
      <h2>卡组</h2>
      <AButton type="text" shape="circle" aria-label="新建卡组" title="新建卡组" :disabled="!canCreate"
        @click="emit('create')">
        <template #icon><IconPlus /></template>
      </AButton>
    </div>
    <nav aria-label="卡组列表">
      <ul class="deck-nav-list">
        <li v-for="deck in rootDecks" :key="deck.id">
          <button type="button" class="deck-link"
            :class="{ 'deck-link-current': selectedId === deck.id }"
            :aria-current="selectedId === deck.id ? 'true' : undefined"
            @click="emit('select', deck.id)">
            <IconBook />
            <span>{{ deck.name }}</span>
            <small>{{ counts.get(deck.id) ?? 0 }}</small>
          </button>
          <ul v-if="childDecks.has(deck.id)" class="deck-nav-list subdeck-list" :aria-label="deck.name + '的子卡组'">
            <li v-for="child in childDecks.get(deck.id)" :key="child.id">
              <button type="button" class="deck-link subdeck-link"
                :class="{ 'deck-link-current': selectedId === child.id }"
                :aria-current="selectedId === child.id ? 'true' : undefined"
                @click="emit('select', child.id)">
                <span class="deck-color" :style="{ backgroundColor: child.color ?? undefined }" aria-hidden="true"></span>
                <span>{{ child.name }}</span>
                <small>{{ counts.get(child.id) ?? 0 }}</small>
              </button>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</template>
