<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef } from 'vue';
import { Alert as AAlert, Button as AButton } from '@arco-design/web-vue';
import { call, errorMessage } from '../../platform/tinyjs';
import type { Card, CardReviewUpdate, ReviewRating, StudyAttempt } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';
import { ratings } from '../review/ratings';

const props = defineProps<{
  card: Card;
  revision?: StudyAttempt;
  canGoBack: boolean;
  applyReview: (update: CardReviewUpdate, attempt: StudyAttempt) => void;
}>();
const emit = defineEmits<{ previous: []; cancelRevision: [] }>();
const heading = useTemplateRef('heading');
const scrollArea = useTemplateRef('scrollArea');
const flipped = shallowRef(false);
const pending = shallowRef<StudyAttempt>();
const saving = shallowRef(false);
const error = shallowRef('');
const ratingStatuses = { known: 'success', fuzzy: 'warning', forgotten: 'danger' } as const;

onMounted(() => heading.value?.focus());

function flip() {
  flipped.value = !flipped.value;
  if (scrollArea.value) scrollArea.value.scrollTop = 0;
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
    const update = props.revision
      ? await call('study.revise', { ...attempt, expectedRating: props.revision.rating })
      : await call('study.record', attempt);
    props.applyReview(update, attempt);
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
      <section class="panel study-face" :class="{ 'study-face-showing-back': flipped }" aria-labelledby="study-card-heading">
        <slot />
        <div class="study-face-heading">
          <h2 id="study-card-heading" ref="heading" tabindex="-1" class="focus-heading">
            {{ flipped ? '背面' : '正面' }}
          </h2>
          <span class="muted">点击翻面</span>
        </div>
        <div class="study-face-content" aria-live="polite">
          <Transition name="study-flip" mode="out-in">
            <MarkdownView :key="Number(flipped)" :source="flipped ? card.back : card.front" />
          </Transition>
        </div>
        <button type="button" class="study-flip-target" aria-label="翻面" :aria-pressed="flipped" @click="flip" />
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
        <AButton v-for="(item, value) in ratings" :key="value" size="large" type="secondary"
          :status="ratingStatuses[value]" :disabled="!!pending"
          :loading="saving && pending?.rating === value" @click="saveRating(value)">{{ item.label }}</AButton>
      </div>
    </footer>
  </div>
</template>
