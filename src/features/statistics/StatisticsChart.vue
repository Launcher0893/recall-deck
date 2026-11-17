<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef, watchPostEffect } from 'vue';
import { formatValue, type ChartData } from './charts';
import { drawChart, xPosition } from './drawChart';

const props = defineProps<{ chart: ChartData; title: string }>();
const canvas = useTemplateRef('canvas');
const viewport = shallowRef({ width: 0, height: 0 });
const selectedIndex = shallowRef<number>();
const active = computed(() => {
  const last = props.chart.points.length - 1;
  return Math.min(last, Math.max(0, selectedIndex.value ?? props.chart.initialIndex ?? last));
});
const selected = computed(() => props.chart.points[active.value]);
const details = computed(() => props.chart.series.filter(series => props.chart.kind === 'line' || series.values[active.value] != null));
let observer: ResizeObserver | undefined;

onMounted(() => {
  if (!canvas.value) return;
  observer = new ResizeObserver(([entry]) => {
    viewport.value = { width: entry.contentRect.width, height: entry.contentRect.height };
  });
  observer.observe(canvas.value);
});
onUnmounted(() => observer?.disconnect());

watchPostEffect(() => {
  const element = canvas.value;
  const { width, height } = viewport.value;
  if (!element || !width || !height) return;
  const scale = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * scale);
  const pixelHeight = Math.round(height * scale);
  if (element.width !== pixelWidth) element.width = pixelWidth;
  if (element.height !== pixelHeight) element.height = pixelHeight;
  const context = element.getContext('2d');
  if (!context) return;
  context.setTransform(scale, 0, 0, scale, 0, 0);
  drawChart(context, props.chart, width, height, active.value);
});

function selectPoint(event: PointerEvent) {
  const element = canvas.value;
  if (!element || !viewport.value.width) return;
  const cursor = event.clientX - element.getBoundingClientRect().left;
  let closest = 0;
  let minimum = Infinity;
  for (let index = 0; index < props.chart.points.length; index++) {
    const distance = Math.abs(xPosition(props.chart, index, viewport.value.width) - cursor);
    if (distance >= minimum) break;
    minimum = distance;
    closest = index;
  }
  selectedIndex.value = closest;
}

function step(event: KeyboardEvent) {
  const last = props.chart.points.length - 1;
  switch (event.key) {
    case 'ArrowLeft': selectedIndex.value = Math.max(0, active.value - 1); break;
    case 'ArrowRight': selectedIndex.value = Math.min(last, active.value + 1); break;
    case 'Home': selectedIndex.value = 0; break;
    case 'End': selectedIndex.value = last; break;
    default: return;
  }
  event.preventDefault();
}
</script>

<template>
  <figure class="statistics-figure">
    <ul class="statistics-legend" aria-label="图例">
      <li v-for="series in chart.series" :key="series.label">
        <span class="statistics-swatch" :style="{ backgroundColor: series.color }" />{{ series.label }}
      </li>
    </ul>
    <canvas ref="canvas" class="statistics-canvas" role="img"
      :aria-label="title + '，使用左右方向键查看数据点'" tabindex="0"
      @pointermove="selectPoint" @pointerdown="selectPoint" @keydown="step" />
    <figcaption v-if="selected" class="statistics-detail" aria-live="polite" aria-atomic="true">
      <strong>{{ selected.label }}</strong>
      <span v-for="series in details" :key="series.label">
        {{ series.label }} <b>{{ formatValue(series.values[active], chart.percent) }}</b>
      </span>
      <span v-if="selected.note" class="muted">{{ selected.note }}</span>
    </figcaption>
  </figure>
</template>
