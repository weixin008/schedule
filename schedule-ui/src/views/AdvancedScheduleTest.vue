<template>
  <div class="advanced-schedule-test">
    <h1>高级排班功能测试</h1>
    
    <el-card>
      <h3>测试高级排班API</h3>
      
      <el-form :model="testForm" label-width="120px">
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="testForm.startDate"
            type="date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="testForm.endDate"
            type="date"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </el-form>
      
      <div class="test-buttons">
        <el-button @click="testRuleTemplates">测试规则模板</el-button>
        <el-button @click="testValidateRules">测试规则验证</el-button>
        <el-button @click="testGenerateSchedule" type="primary">测试生成排班</el-button>
        <el-button @click="testClearRange" type="danger">测试清除排班</el-button>
      </div>
    </el-card>
    
    <el-card v-if="testResult" style="margin-top: 20px;">
      <h3>测试结果</h3>
      <pre>{{ JSON.stringify(testResult, null, 2) }}</pre>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const testForm = reactive({
  startDate: '',
  endDate: ''
})

const testResult = ref(null)

onMounted(() => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  testForm.startDate = today.toISOString().split('T')[0]
  testForm.endDate = nextWeek.toISOString().split('T')[0]
})

const testRuleTemplates = async () => {
  try {
    const response = await api.get('/advanced-schedule/rule-templates')
    testResult.value = response.data
    ElMessage.success('规则模板获取成功')
  } catch (error) {
    console.error('测试失败:', error)
    testResult.value = { error: error.message }
    ElMessage.error('测试失败')
  }
}

const testValidateRules = async () => {
  try {
    const sampleRules = [
      {
        roleId: 1,
        ruleName: '测试带班领导',
        ruleType: 'DAILY_ROTATION',
        personnelIds: [1, 2, 3],
        workDays: [1, 2, 3, 4, 5, 6, 0],
        startTime: '08:00',
        endTime: '18:00'
      }
    ]
    
    const response = await api.post('/advanced-schedule/validate-rules', sampleRules)
    testResult.value = response.data
    ElMessage.success('规则验证完成')
  } catch (error) {
    console.error('测试失败:', error)
    testResult.value = { error: error.message }
    ElMessage.error('测试失败')
  }
}

const testGenerateSchedule = async () => {
  try {
    const requestData = {
      startDate: testForm.startDate,
      endDate: testForm.endDate,
      clearExisting: true,
      rules: [
        {
          roleId: 1,
          ruleName: '测试带班领导',
          ruleType: 'DAILY_ROTATION',
          personnelIds: [1, 2, 3],
          workDays: [1, 2, 3, 4, 5, 6, 0],
          startTime: '08:00',
          endTime: '18:00'
        }
      ]
    }
    
    const response = await api.post('/advanced-schedule/generate', requestData)
    testResult.value = response.data
    
    if (response.data.success) {
      ElMessage.success('排班生成成功')
    } else {
      ElMessage.error('排班生成失败')
    }
  } catch (error) {
    console.error('测试失败:', error)
    testResult.value = { error: error.message }
    ElMessage.error('测试失败')
  }
}

const testClearRange = async () => {
  try {
    const response = await api.delete('/advanced-schedule/clear-range', {
      params: {
        startDate: testForm.startDate,
        endDate: testForm.endDate
      }
    })
    testResult.value = response.data
    ElMessage.success('清除排班成功')
  } catch (error) {
    console.error('测试失败:', error)
    testResult.value = { error: error.message }
    ElMessage.error('测试失败')
  }
}
</script>

<style scoped>
.advanced-schedule-test {
  padding: 20px;
}

.test-buttons {
  margin-top: 20px;
}

.test-buttons .el-button {
  margin-right: 12px;
}

pre {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}
</style>