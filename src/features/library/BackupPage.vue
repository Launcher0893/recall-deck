<script setup lang="ts">
import { shallowRef } from 'vue';
import { Alert as AAlert, Button as AButton } from '@arco-design/web-vue';
import { call, errorMessage } from '../../platform/tinyjs';

const props = defineProps<{ restore: () => Promise<{ path: string } | null> }>();
const busy = shallowRef<'export' | 'restore'>();
const status = shallowRef('');
const error = shallowRef('');

async function run(action: 'export' | 'restore') {
  if (busy.value) return;
  busy.value = action;
  status.value = '';
  error.value = '';
  try {
    const result = await (action === 'export' ? call('backup.export', {}) : props.restore());
    if (result) status.value = action === 'export'
      ? `备份已保存到 ${result.path}`
      : `卡库已恢复。恢复前的备份保存在 ${result.path}`;
  } catch (reason) {
    error.value = errorMessage(reason);
  } finally {
    busy.value = undefined;
  }
}
</script>

<template>
  <section aria-labelledby="backup-heading">
    <div class="page-heading"><h1 id="backup-heading">备份与恢复</h1></div>
    <div class="panel backup-panel">
      <p>备份包含卡组、卡片、复习日程和作答历史。恢复时会先保存当前卡库的副本。</p>
      <div class="heading-actions">
        <AButton type="primary" :loading="busy === 'export'" :disabled="!!busy" @click="run('export')">导出备份</AButton>
        <AButton :loading="busy === 'restore'" :disabled="!!busy" @click="run('restore')">从备份恢复</AButton>
      </div>
      <AAlert v-if="error" type="error" role="alert">{{ error }}</AAlert>
      <AAlert v-if="status" type="success" role="status">{{ status }}</AAlert>
    </div>
  </section>
</template>

<style scoped>
.backup-panel { display: grid; gap: 16px; padding: 24px; overflow-wrap: anywhere; }
</style>
