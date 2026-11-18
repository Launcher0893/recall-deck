<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef } from 'vue';
import { Alert as AAlert, Button as AButton } from '@arco-design/web-vue';
import { errorMessage } from '../../platform/tinyjs';
import type { Card, ReviewRating, StudyAttempt } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';
import { ratings } from '../review/ratings';

const props = defineProps<{
  card: Card;
  revision?: StudyAttempt;
  canGoBack: boolean;
  saveReview: (attempt: StudyAttempt, expectedRating?: ReviewRating) => Promise<void>;
}>();
const emit = defineEmits<{ previous: []; cancelRevision: [] }>();
const face = useTemplateRef('face');
const scrollArea = useTemplateRef('scrollArea');
const flipped = shallowRef(false);
const pending = shallowRef<StudyAttempt>();
const saving = shallowRef(false);
const error = shallowRef('');
const ratingStatuses = { known: 'success', fuzzy: 'warning', forgotten: 'danger' } as const;
const shortcuts: Readonly<Partial<Record<string, ReviewRating>>> = { '1': 'known', '2': 'fuzzy', '3': 'forgotten' };

onMounted(() => face.value?.focus());

function flip() {
  flipped.value = !flipped.value;
  if (scrollArea.value) scrollArea.value.scrollTop = 0;
}

function clickFace(event: MouseEvent) {
  const { target, currentTarget } = event;
  if (event.defaultPrevented || !(target instanceof Element) || !(currentTarget instanceof HTMLElement)) return;
  if (target.closest('a, button, input, textarea, select, [contenteditable], [role="button"]')) return;

  const selection = window.getSelection();
  if (selection?.rangeCount && !selection.isCollapsed && selection.getRangeAt(0).intersectsNode(currentTarget)) return;

  const scrollable = target.closest<HTMLElement>('pre, .formula-block');
  if (scrollable && scrollable.scrollWidth > scrollable.clientWidth) {
    const bounds = scrollable.getBoundingClientRect();
    if (event.clientY >= bounds.top + scrollable.clientTop + scrollable.clientHeight) return;
  }
  flip();
}

function handleShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    flip();
  } else {
    const rating = shortcuts[event.key];
    if (!rating || pending.value) return;
    event.preventDefault();
    void saveRating(rating);
  }
}

async function saveRating(rating: ReviewRating) {
  if (saving.value) return;
  const attempt = pending.value ??= {
    attemptId: props.revision?.attemptId ?? crypto.randomUUID(),
    cardId: props.card.id,
    rating,
  };
  saving.value = true;
  error.value = '';
  try {
    await props.saveReview(attempt, props.revision?.rating);
  } catch (reason) {
    error.value = '无法保存学习进度。' + errorMessage(reason);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="study-card-layout">
    <div ref="scrollArea" class="study-card-scroll">
      <section ref="face" class="panel study-face" :class="{ 'study-face-showing-back': flipped }" tabindex="0"
        aria-labelledby="study-card-heading" aria-describedby="study-flip-hint" aria-keyshortcuts="Enter Space"
        @click="clickFace" @keydown.self="handleShortcut">
        <slot />
        <div class="study-face-heading">
          <h2 id="study-card-heading">{{ flipped ? '背面' : '正面' }}</h2>
          <span id="study-flip-hint" class="muted">点击翻面</span>
        </div>
        <div class="study-face-content" aria-live="polite">
          <Transition name="study-flip" mode="out-in">
            <MarkdownView :key="Number(flipped)" :source="flipped ? card.back : card.front" />
          </Transition>
        </div>
      </section>
    </div>
    <footer class="study-rating-bar">
      <div v-if="error && pending" class="study-error">
        <AAlert type="error" role="alert">{{ error }}</AAlert>
        <AButton @click="saveRating(pending.rating)">重试保存</AButton>
      </div>
      <div v-if="revision || canGoBack" class="study-navigation">
        <AButton v-if="revision" type="text" :disabled="saving" @click="emit('cancelRevision')">返回当前进度</AButton>
        <AButton v-else type="text" :disabled="!!pending" @click="emit('previous')">上一张</AButton>
      </div>
      <div class="study-rating-actions" role="group" aria-label="熟悉度">
        <AButton v-for="(item, value, index) in ratings" :key="value" size="large" type="secondary"
          :aria-keyshortcuts="String(index + 1)"
          :status="ratingStatuses[value]" :disabled="!!pending"
          :loading="saving && pending?.rating === value" @click="saveRating(value)">{{ item.label }}</AButton>
      </div>
    </footer>
  </div>
</template>
