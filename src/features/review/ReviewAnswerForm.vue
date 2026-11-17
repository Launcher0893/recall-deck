<script setup lang="ts">
import { onMounted, shallowRef, useTemplateRef } from 'vue';
import { Button as AButton } from '@arco-design/web-vue';
import { submitsAnswer } from './review';

const answer = defineModel<string>({ required: true });
const emit = defineEmits<{ submit: []; forget: [] }>();
const textarea = useTemplateRef('answerBox');
const composing = shallowRef<boolean>(false);

onMounted(() => textarea.value?.focus());

function keydown(event: KeyboardEvent) {
  if (!submitsAnswer(event, composing.value)) return;
  event.preventDefault();
  emit('submit');
}
</script>

<template>
  <form class="panel answer-panel" @submit.prevent="emit('submit')">
    <label for="review-answer">你的答案</label>
    <textarea
      id="review-answer" ref="answerBox" v-model="answer" rows="4" maxlength="40000"
      placeholder="在这里输入答案" @keydown="keydown"
      @compositionstart="composing = true" @compositionend="composing = false"
    />
    <div class="action-bar">
      <span class="muted"><kbd>Enter</kbd> 提交 <span class="shortcut-gap"><kbd>Shift + Enter</kbd> 换行</span></span>
      <div class="heading-actions">
        <AButton @click="emit('forget')">想不起来</AButton>
        <AButton type="primary" html-type="submit" :disabled="!answer.trim()">提交答案</AButton>
      </div>
    </div>
  </form>
</template>
