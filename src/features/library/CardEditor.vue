<script setup lang="ts">
import { reactive, shallowRef } from 'vue';
import { Button as AButton, Modal as AModal, Select as ASelect, Textarea as ATextarea, Alert as AAlert } from '@arco-design/web-vue';
import type { Card, CardDraft, Deck } from '../../shared/models';
import MarkdownView from '../../shared/markdown/MarkdownView';

const props = defineProps<{ card: Card | null; deckId: number; options: Deck[]; busy: boolean; error: string }>();
const emit = defineEmits<{ close: []; save: [CardDraft] }>();
const draft = reactive<CardDraft>({
  deckId: props.deckId,
  front: props.card?.front ?? '',
  back: props.card?.back ?? '',
  expected: props.card?.expected ?? '',
});
const preview = shallowRef(false);

function save() {
  if (props.busy || !draft.front.trim() || !draft.back.trim()) return;
  emit('save', { ...draft });
}
</script>

<template>
  <AModal
    :visible="true"
    :title="card ? '编辑卡片' : '新建卡片'"
    :width="720"
    :footer="false"
    :mask-closable="false"
    :closable="!busy"
    :esc-to-close="!busy"
    @cancel="emit('close')"
  >
    <form class="editor" @submit.prevent="save">
      <div v-if="options.length > 1" class="editor-fields">
        <label id="card-deck-label">所属卡组</label>
        <ASelect v-model="draft.deckId" aria-labelledby="card-deck-label" :options="options"
          :field-names="{ value: 'id', label: 'name' }" :disabled="busy" />
      </div>
      <div class="editor-toolbar">
        <span>支持 Markdown 及公式 <code>$…$</code>、<code>$$…$$</code></span>
        <AButton size="small" :aria-pressed="preview" @click="preview = !preview">
          {{ preview ? '返回编辑' : '预览卡面' }}
        </AButton>
      </div>
      <div v-if="preview" class="editor-preview">
        <section>
          <h3>正面</h3>
          <MarkdownView v-if="draft.front.trim()" :source="draft.front" />
          <p v-else class="muted">正面为空</p>
        </section>
        <section>
          <h3>背面</h3>
          <MarkdownView v-if="draft.back.trim()" :source="draft.back" />
          <p v-else class="muted">背面为空</p>
        </section>
      </div>
      <div v-show="!preview" class="editor-fields">
        <label for="card-front">正面 <span class="required">*</span></label>
        <ATextarea v-model="draft.front" :textarea-attrs="{ id: 'card-front' }" :max-length="40_000" :auto-size="{ minRows: 4, maxRows: 8 }"
          :disabled="busy" placeholder="输入题目或提示" />
        <label for="card-back">背面 <span class="required">*</span></label>
        <ATextarea v-model="draft.back" :textarea-attrs="{ id: 'card-back' }" :max-length="40_000" :auto-size="{ minRows: 4, maxRows: 8 }"
          :disabled="busy" placeholder="输入参考答案和解释" />
      </div>
      <div class="editor-fields">
        <label for="expected-answer">用于自动比对的答案 <span class="muted">（可选）</span></label>
        <ATextarea v-model="draft.expected" :textarea-attrs="{ id: 'expected-answer' }" :max-length="4_000"
          :auto-size="{ minRows: 2, maxRows: 4 }" :disabled="busy" placeholder="填写可直接比较的纯文本答案" />
      </div>
      <AAlert v-if="error" type="error" role="alert">{{ error }}</AAlert>
      <div class="dialog-actions">
        <AButton :disabled="busy" @click="emit('close')">取消</AButton>
        <AButton type="primary" html-type="submit" :loading="busy" :disabled="!draft.front.trim() || !draft.back.trim()">
          保存卡片
        </AButton>
      </div>
    </form>
  </AModal>
</template>
