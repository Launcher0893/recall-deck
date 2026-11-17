<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import {
  Alert as AAlert, Button as AButton, Empty as AEmpty, Select as ASelect,
  Spin as ASpin, Tabs as ATabs, TabPane as ATabPane,
} from '@arco-design/web-vue';
import { call, errorMessage } from '../../platform/tinyjs';
import type { Statistics } from '../../shared/models';
import { activityChart, retentionChart, trendChart } from './charts';
import StatisticsChart from './StatisticsChart.vue';
import './statistics.css';

const tab = shallowRef('retention');
const statistics = shallowRef<Statistics>();
const range = shallowRef<number>(14);
const rangeOptions = [
  { value: 14, label: '最近 14 天' },
  { value: 30, label: '最近 30 天' },
  { value: 0, label: '全部日期' },
];
const loading = shallowRef(false);
const error = shallowRef('');

const retention = computed(() => statistics.value && retentionChart(statistics.value));
const activity = computed(() => statistics.value && activityChart(statistics.value, range.value));
const trend = computed(() => statistics.value && trendChart(statistics.value));
const samples = computed(() => statistics.value?.retention.reduce((sum, point) => sum + point.samples, 0) ?? 0);

async function load() {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    statistics.value = await call('statistics.summary', {});
  } catch (reason) {
    error.value = '无法读取统计数据。' + errorMessage(reason);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="statistics-page" aria-labelledby="statistics-heading">
    <div class="page-heading">
      <h1 id="statistics-heading">数据统计</h1>
    </div>
    <div v-if="loading" class="panel statistics-status" role="status"><ASpin /> 正在读取统计数据</div>
    <div v-else-if="error" class="panel statistics-status">
      <AAlert type="error" role="alert">{{ error }}</AAlert>
      <AButton @click="load">重试读取</AButton>
    </div>
    <ATabs v-else-if="statistics" v-model:active-key="tab" lazy-load destroy-on-hide>
      <ATabPane key="retention" title="遗忘曲线">
        <section v-if="retention" class="panel statistics-panel" aria-labelledby="retention-title">
          <div class="statistics-panel-heading">
            <div>
              <h2 id="retention-title">遗忘曲线对比</h2>
              <p class="muted">横轴为两次判分的时间间隔，按对数刻度显示。</p>
            </div>
            <span class="statistics-number">{{ samples }} 次有效复习</span>
          </div>
          <StatisticsChart :chart="retention" title="遗忘曲线对比" />
          <p v-if="!samples" class="statistics-notice">将卡片标为「认识」后再次复习，便会开始积累个人曲线数据。</p>
          <p class="statistics-method muted">
            艾宾浩斯曲线使用重学时节省的时间比例。卡片曲线按间隔分组，分别将认识、模糊、忘记计为 100%、50%、0%，取组内平均。
            艾宾浩斯数据见 Murre 与 Dros（2015）表 3，DOI 10.1371/journal.pone.0120644。
          </p>
        </section>
      </ATabPane>
      <ATabPane key="activity" title="每日记忆">
        <section v-if="activity" class="panel statistics-panel" aria-labelledby="activity-title">
          <div class="statistics-panel-heading">
            <div>
              <h2 id="activity-title">每日记忆与复习预测</h2>
              <p class="muted">按日期统计翻面判分，每张卡每天用最后一次判分计数。</p>
            </div>
            <ASelect v-model="range" :options="rangeOptions" aria-label="每日记忆日期范围" class="statistics-range" />
          </div>
          <StatisticsChart :key="range" :chart="activity" title="每日记忆卡片数量与复习预测" />
          <p class="statistics-method muted">
            今天及逾期预计需复习 <strong>{{ statistics.dueToday }} 张</strong>。灰色柱显示未来 7 天在当前学习安排下预计需复习的卡片。
            个人遗忘样本充足时，估计遗忘较快的「认识」卡会提前计入。
          </p>
        </section>
      </ATabPane>
      <ATabPane key="trend" title="状态趋势">
        <section v-if="trend" class="panel statistics-panel" aria-labelledby="trend-title">
          <div class="statistics-panel-heading">
            <div>
              <h2 id="trend-title">记忆卡片状态趋势</h2>
              <p class="muted">从最早可用记录开始，显示每天结束时的卡片状态和今天的实时状态。</p>
            </div>
          </div>
          <StatisticsChart v-if="trend.points.length" :chart="trend" title="已加入记忆与判分状态趋势" />
          <AEmpty v-else description="将卡片加入学习后，这里会显示状态变化" />
          <p class="statistics-method muted">
            已加入记忆包括尚未判分的卡片。旧版加入时间以最早可用判分估算，升级后的加入、移出和判分按实际记录统计。
          </p>
        </section>
      </ATabPane>
    </ATabs>
  </section>
</template>
