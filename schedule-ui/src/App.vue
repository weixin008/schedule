<script lang="ts" setup>
import { onMounted } from 'vue';
import { useSettingsStore } from './stores/settings';

const settingsStore = useSettingsStore();

onMounted(() => {
  settingsStore.fetchSettings();
});
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style scoped>
/* We can add global layout styles here later */
#app {
  height: 100vh;
  width: 100vw;
}
</style>
