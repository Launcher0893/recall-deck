<script setup lang="ts">
import { IconLayers } from '@arco-design/web-vue/es/icon';
import './shell.css';
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand-icon"><IconLayers /></div>
      <span class="brand-name">Recall Deck</span>
      <span class="brand-caption">记忆卡</span>
    </header>
    <slot name="sidebar" />
    <main class="workspace">
      <div class="workspace-content"><slot /></div>
    </main>
  </div>
</template>
