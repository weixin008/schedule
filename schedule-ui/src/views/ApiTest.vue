<template>
  <div class="api-test">
    <h2>API测试页面</h2>
    
    <el-card class="test-card">
      <template #header>
        <span>员工API测试</span>
      </template>
      
      <div class="test-section">
        <el-button @click="testEmployees" type="primary">测试获取员工</el-button>
        <div v-if="employeesResult" class="result">
          <h4>结果:</h4>
          <pre>{{ JSON.stringify(employeesResult, null, 2) }}</pre>
        </div>
      </div>
    </el-card>
    
    <el-card class="test-card">
      <template #header>
        <span>排班规则API测试</span>
      </template>
      
      <div class="test-section">
        <el-button @click="testScheduleRules" type="primary">测试获取排班规则</el-button>
        <div v-if="scheduleRulesResult" class="result">
          <h4>结果:</h4>
          <pre>{{ JSON.stringify(scheduleRulesResult, null, 2) }}</pre>
        </div>
      </div>
    </el-card>
    
    <el-card class="test-card">
      <template #header>
        <span>班次API测试</span>
      </template>
      
      <div class="test-section">
        <el-button @click="testShifts" type="primary">测试获取班次</el-button>
        <div v-if="shiftsResult" class="result">
          <h4>结果:</h4>
          <pre>{{ JSON.stringify(shiftsResult, null, 2) }}</pre>
        </div>
      </div>
    </el-card>
    
    <el-card class="test-card">
      <template #header>
        <span>值班角色API测试</span>
      </template>
      
      <div class="test-section">
        <el-button @click="testShiftRoles" type="primary">测试获取值班角色</el-button>
        <div v-if="shiftRolesResult" class="result">
          <h4>结果:</h4>
          <pre>{{ JSON.stringify(shiftRolesResult, null, 2) }}</pre>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import apiClient from '@/api';

const employeesResult = ref(null);
const scheduleRulesResult = ref(null);
const shiftsResult = ref(null);
const shiftRolesResult = ref(null);

const testEmployees = async () => {
  try {
    const response = await apiClient.get('/employee');
    employeesResult.value = response.data;
    ElMessage.success('员工API测试成功');
  } catch (error) {
    console.error('员工API测试失败:', error);
    employeesResult.value = { error: error.message, details: error.response?.data };
    ElMessage.error('员工API测试失败');
  }
};

const testScheduleRules = async () => {
  try {
    const response = await apiClient.get('/schedule-rules');
    scheduleRulesResult.value = response.data;
    ElMessage.success('排班规则API测试成功');
  } catch (error) {
    console.error('排班规则API测试失败:', error);
    scheduleRulesResult.value = { error: error.message, details: error.response?.data };
    ElMessage.error('排班规则API测试失败');
  }
};

const testShifts = async () => {
  try {
    const response = await apiClient.get('/shifts');
    shiftsResult.value = response.data;
    ElMessage.success('班次API测试成功');
  } catch (error) {
    console.error('班次API测试失败:', error);
    shiftsResult.value = { error: error.message, details: error.response?.data };
    ElMessage.error('班次API测试失败');
  }
};

const testShiftRoles = async () => {
  try {
    const response = await apiClient.get('/shift-roles');
    shiftRolesResult.value = response.data;
    ElMessage.success('值班角色API测试成功');
  } catch (error) {
    console.error('值班角色API测试失败:', error);
    shiftRolesResult.value = { error: error.message, details: error.response?.data };
    ElMessage.error('值班角色API测试失败');
  }
};
</script>

<style lang="scss" scoped>
.api-test {
  padding: 20px;
  
  .test-card {
    margin-bottom: 20px;
    
    .test-section {
      .result {
        margin-top: 16px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 4px;
        
        h4 {
          margin: 0 0 8px 0;
        }
        
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 12px;
          max-height: 300px;
          overflow-y: auto;
        }
      }
    }
  }
}
</style>