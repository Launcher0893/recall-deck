<script setup lang="ts">
import { useTemplateRef, watchPostEffect } from 'vue';
import katex from 'katex';

const props = defineProps<{ source: string; displayMode: boolean }>();
const output = useTemplateRef<HTMLElement>('output');

watchPostEffect(() => {
  const element = output.value;
  if (!element) return;
  try {
    katex.render(props.source, element, {
      displayMode: props.displayMode,
      trust: false,
      maxSize: 20,
      maxExpand: 500,
    });
    element.classList.remove('formula-invalid');
    element.removeAttribute('title');
  } catch (error) {
    element.textContent = props.source;
    element.classList.add('formula-invalid');
    element.title = '公式语法无效或暂不支持';
    if (!(error instanceof katex.ParseError)) console.error(error);
  }
});
</script>

<template>
  <component :is="displayMode ? 'div' : 'span'" ref="output" :class="{ 'formula-block': displayMode }" />
</template>
