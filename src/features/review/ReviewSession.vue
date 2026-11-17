<script setup lang="ts">
import { useTemplateRef, watchPostEffect } from 'vue';
import { Alert as AAlert, Button as AButton, Tag as ATag } from '@arco-design/web-vue';
import { IconArrowLeft, IconCheckCircle } from '@arco-design/web-vue/es/icon';
import type { Card } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';
import { ratings } from './ratings';
import ReviewAnswerForm from './ReviewAnswerForm.vue';
import { useReviewSession } from './useReviewSession';
import './review.css';

const props = defineProps<{ cards: Card[] }>();
const emit = defineEmits<{ close: [] }>();

const {
  current, missed, counts, answer, submitted, automatic, rating, error, saving,
  completed, total, gradeLocked, submit, revealAsForgotten, grade, advance, retryMissed,
} = useReviewSession(props.cards);
const feedback = useTemplateRef('feedback');
const summary = useTemplateRef('summary');

watchPostEffect(() => {
  feedback.value?.focus();
  summary.value?.focus();
});
</script>

<template>
  <section class="review-page" aria-labelledby="review-heading">
    <div class="page-heading">
      <div>
        <h1 id="review-heading">键盘自测</h1>
        <p class="muted">检验记忆，学习安排由翻面复习的判分更新。</p>
      </div>
      <AButton :disabled="saving" @click="emit('close')">
        <template #icon><IconArrowLeft /></template>返回学习与复习
      </AButton>
    </div>

    <template v-if="current">
      <div class="review-progress">
        <progress :value="completed" :max="total" aria-label="自测进度" />
        <span>第 {{ completed + 1 }} 题 / 共 {{ total }} 题</span>
      </div>

      <section class="panel question-panel">
        <h2>题目</h2>
        <MarkdownView :source="current.front" />
      </section>

      <ReviewAnswerForm v-if="!submitted" v-model="answer" @submit="submit" @forget="revealAsForgotten" />

      <section v-else class="panel feedback-panel">
        <h2 ref="feedback" tabindex="-1" class="focus-heading">对照答案</h2>
        <div class="review-comparison">
          <div><h3>你的答案</h3><p class="submitted-answer">{{ answer.trim() ? answer : '未填写' }}</p></div>
          <div><h3>参考答案</h3><MarkdownView :source="current.back" /></div>
        </div>
        <div class="grade-footer">
          <ATag v-if="automatic !== null" :color="automatic ? 'green' : 'orange'">
            自动比对{{ automatic ? '一致' : '未匹配' }}
          </ATag>
          <span v-else class="muted">请对照参考答案判分</span>
          <div class="heading-actions" role="group" aria-label="判分结果">
            <AButton v-for="(item, value) in ratings" :key="value"
              :type="rating === value ? 'primary' : 'secondary'" :aria-pressed="rating === value"
              :disabled="gradeLocked" @click="grade(value)">{{ item.label }}</AButton>
          </div>
        </div>
        <AAlert v-if="error" type="error" role="alert">{{ error }}</AAlert>
        <div class="dialog-actions">
          <AButton type="primary" :loading="saving" :disabled="rating === null" @click="advance">
            {{ error ? '重试保存' : completed + 1 === total ? '完成自测' : '下一题' }}
          </AButton>
        </div>
      </section>
    </template>

    <section v-else class="panel result-panel">
      <div class="result-title">
        <IconCheckCircle />
        <h2 ref="summary" tabindex="-1" class="focus-heading">本轮自测完成</h2>
      </div>
      <dl class="result-counts">
        <div><dt>已答</dt><dd>{{ completed }}</dd></div>
        <div v-for="(item, value) in ratings" :key="value"><dt>{{ item.label }}</dt><dd>{{ counts[value] }}</dd></div>
      </dl>
      <template v-if="missed.length">
        <h3>模糊和忘记的卡片</h3>
        <ol class="missed-list">
          <li v-for="card in missed" :key="card.id"><MarkdownView :source="card.front" /></li>
        </ol>
        <AButton type="primary" @click="retryMissed">重测这些卡片</AButton>
      </template>
    </section>
  </section>
</template>
