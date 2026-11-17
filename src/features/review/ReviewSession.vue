<script setup lang="ts">
import { useTemplateRef, watchPostEffect } from 'vue';
import { Alert as AAlert, Button as AButton, Tag as ATag } from '@arco-design/web-vue';
import { IconArrowLeft, IconCheckCircle } from '@arco-design/web-vue/es/icon';
import type { Card, Deck } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';
import { submitsAnswer } from './review';
import { useReviewSession } from './useReviewSession';
import './review.css';

const props = defineProps<{ deck: Deck; cards: Card[] }>();
const emit = defineEmits<{ close: [] }>();

const {
  current, missed, answer, submitted, automatic, remembered, error, saving,
  completed, total, gradeLocked, submit, grade, advance, retryMissed,
} = useReviewSession(props.cards);
const textarea = useTemplateRef('answerBox');
const feedback = useTemplateRef('feedback');
const summary = useTemplateRef('summary');
let composing = false;

watchPostEffect(() => {
  composing = false;
  textarea.value?.focus();
  feedback.value?.focus();
  summary.value?.focus();
});

function keydown(event: KeyboardEvent) {
  if (!submitsAnswer(event, composing)) return;
  event.preventDefault();
  submit();
}

</script>

<template>
  <section class="review-page" aria-labelledby="review-heading">
    <div class="page-heading">
      <div>
        <h1 id="review-heading">自测</h1>
        <p class="muted">{{ deck.name }}</p>
      </div>
      <AButton :disabled="saving" @click="emit('close')">
        <template #icon><IconArrowLeft /></template>返回卡组
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

      <form v-if="!submitted" class="panel answer-panel" @submit.prevent="submit">
        <label for="review-answer">你的答案</label>
        <textarea
          id="review-answer" ref="answerBox" v-model="answer" rows="4" maxlength="40000"
          placeholder="在这里输入答案" @keydown="keydown"
          @compositionstart="composing = true" @compositionend="composing = false"
        />
        <div class="action-bar">
          <span class="muted"><kbd>Enter</kbd> 提交 <span class="shortcut-gap"><kbd>Shift + Enter</kbd> 换行</span></span>
          <AButton type="primary" html-type="submit" :disabled="!answer.trim()">提交答案</AButton>
        </div>
      </form>

      <section v-else class="panel feedback-panel">
        <h2 ref="feedback" tabindex="-1" class="focus-heading">对照答案</h2>
        <div class="review-comparison">
          <div><h3>你的答案</h3><p class="submitted-answer">{{ answer }}</p></div>
          <div><h3>参考答案</h3><MarkdownView :source="current.back" /></div>
        </div>
        <div class="grade-footer">
          <ATag v-if="automatic !== null" :color="automatic ? 'green' : 'orange'">
            自动比对{{ automatic ? '一致' : '未匹配' }}
          </ATag>
          <span v-else class="muted">请对照参考答案判分</span>
          <div class="heading-actions" role="group" aria-label="判分结果">
            <AButton :type="remembered === true ? 'primary' : 'secondary'" :aria-pressed="remembered === true"
              :disabled="gradeLocked" @click="grade(true)">记住了</AButton>
            <AButton :type="remembered === false ? 'primary' : 'secondary'" :aria-pressed="remembered === false"
              :disabled="gradeLocked" @click="grade(false)">需复习</AButton>
          </div>
        </div>
        <AAlert v-if="error" type="error" role="alert">{{ error }}</AAlert>
        <div class="dialog-actions">
          <AButton type="primary" :loading="saving" :disabled="remembered === null" @click="advance">
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
        <div><dt>记住</dt><dd>{{ completed - missed.length }}</dd></div>
        <div><dt>待复习</dt><dd>{{ missed.length }}</dd></div>
      </dl>
      <template v-if="missed.length">
        <h3>待复习卡片</h3>
        <ol class="missed-list">
          <li v-for="card in missed" :key="card.id"><MarkdownView :source="card.front" /></li>
        </ol>
        <AButton type="primary" @click="retryMissed">重测待复习卡片</AButton>
      </template>
    </section>
  </section>
</template>
