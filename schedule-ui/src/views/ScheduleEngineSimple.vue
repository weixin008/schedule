<template>
  <div class="schedule-engine-simple">
    <h1>智能排班测试页面</h1>
    
    <el-card>
      <template #header>
        <span>排班规则列表</span>
        <el-button type="primary" @click="loadRules">刷新</el-button>
      </template>
      
      <div v-if="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else>
        <div v-if="rules.length === 0">暂无排班规则</div>
        <ul v-else>
          <li v-for="rule in rules" :key="rule.id">
            {{ rule.name }} - {{ rule.description }}
          </li>
        </ul>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import apiClient from '@/api';

const rules = ref([]);
const loading = ref(false);
const error = ref('');

const loadRules = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await apiClient.get('/schedule-rules');
    rules.value = response.data || [];
    // 规则加载完成
  } catch (err: any) {
    error.value = `加载失败: ${err.message}`;
    ElMessage.error(error.value);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadRules();
});
</script>

<style lang="scss" scoped>
.schedule-engine-simple {
  padding: 20px;
  
  .error {
    color: #f56c6c;
    padding: 10px;
    background-color: #fef0f0;
    border-radius: 4px;
  }
}
</style>