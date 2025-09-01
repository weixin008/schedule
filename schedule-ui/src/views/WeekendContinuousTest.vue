<template>
  <div class="weekend-continuous-test">
    <h1>周末连续值班测试</h1>
    
    <el-card>
      <h3>测试周末连续值班算法</h3>
      
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
        
        <el-form-item label="测试人员">
          <el-select
            v-model="testForm.personnelIds"
            multiple
            placeholder="选择测试人员"
            style="width: 100%"
          >
            <el-option
              v-for="emp in employees"
              :key="emp.id"
              :label="emp.name"
              :value="emp.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <div class="test-buttons">
        <el-button @click="testWeekendContinuous" type="primary">测试周末连续值班</el-button>
        <el-button @click="generateRealSchedule" type="success">生成真实排班</el-button>
      </div>
    </el-card>
    
    <!-- 测试结果展示 -->
    <el-card v-if="testResult" style="margin-top: 20px;">
      <h3>测试结果</h3>
      
      <div v-if="testResult.assignments">
        <h4>排班安排：</h4>
        <el-table :data="testResult.assignments" stripe>
          <el-table-column prop="date" label="日期" width="120">
            <template #default="{ row }">
              {{ formatDate(row.date) }}
            </template>
          </el-table-column>
          <el-table-column prop="dayOfWeek" label="星期" width="80">
            <template #default="{ row }">
              {{ getDayName(row.dayOfWeek) }}
            </template>
          </el-table-column>
          <el-table-column prop="assignedPersonId" label="值班人员" width="120">
            <template #default="{ row }">
              {{ getPersonName(row.assignedPersonId) }}
            </template>
          </el-table-column>
          <el-table-column prop="assignmentType" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.assignmentType === 'WEEKDAY' ? 'primary' : 'success'">
                {{ row.assignmentType === 'WEEKDAY' ? '工作日' : '周末' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="weekNumber" label="周数" width="80" />
        </el-table>
        
        <div v-if="testResult.validation" style="margin-top: 20px;">
          <h4>验证结果：</h4>
          <el-alert
            :title="testResult.validation.valid ? '验证通过' : '验证失败'"
            :type="testResult.validation.valid ? 'success' : 'error'"
            :closable="false"
          >
            <div v-if="!testResult.validation.valid">
              <p v-for="error in testResult.validation.errors" :key="error">{{ error }}</p>
            </div>
            <p>周末连续性检查：{{ testResult.validation.weekendContinuityCheck ? '通过' : '失败' }}</p>
          </el-alert>
        </div>
        
        <div v-if="testResult.report" style="margin-top: 20px;">
          <h4>统计报告：</h4>
          <el-row :gutter="20">
            <el-col :span="6">
              <el-statistic title="总天数" :value="testResult.report.totalDays" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="工作日" :value="testResult.report.weekdayDays" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="周末天数" :value="testResult.report.weekendDays" />
            </el-col>
          </el-row>
          
          <h5 style="margin-top: 20px;">人员工作量：</h5>
          <el-table :data="testResult.report.personnelWorkload" stripe>
            <el-table-column prop="personName" label="姓名" />
            <el-table-column prop="weekdayDays" label="工作日天数" />
            <el-table-column prop="weekendDays" label="周末天数" />
            <el-table-column prop="totalDays" label="总天数" />
          </el-table>
        </div>
      </div>
      
      <div v-else>
        <pre>{{ JSON.stringify(testResult, null, 2) }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const testForm = reactive({
  startDate: '',
  endDate: '',
  personnelIds: []
})

const testResult = ref(null)
const employees = ref([])

onMounted(() => {
  initializeDates()
  loadEmployees()
})

const initializeDates = () => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 14)
  
  testForm.startDate = today.toISOString().split('T')[0]
  testForm.endDate = nextWeek.toISOString().split('T')[0]
}

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    employees.value = response.data || []
    
    // 自动选择前9个员工作为测试
    if (employees.value.length >= 9) {
      testForm.personnelIds = employees.value.slice(0, 9).map(emp => emp.id)
    }
  } catch (error) {
    console.error('加载员工失败:', error)
    ElMessage.error('加载员工失败')
  }
}

const testWeekendContinuous = async () => {
  try {
    if (testForm.personnelIds.length === 0) {
      ElMessage.error('请选择测试人员')
      return
    }
    
    // 这里我们需要创建一个专门的测试API
    const requestData = {
      startDate: testForm.startDate,
      endDate: testForm.endDate,
      personnelIds: testForm.personnelIds
    }
    
    // 暂时使用生成排班的API来测试
    const response = await api.post('/advanced-schedule/generate', {
      startDate: testForm.startDate,
      endDate: testForm.endDate,
      clearExisting: false,
      rules: [{
        roleId: 2,
        ruleName: '测试值班员',
        ruleType: 'WEEKEND_CONTINUOUS',
        personnelIds: testForm.personnelIds,
        workDays: [1, 2, 3, 4, 5, 6, 0],
        startTime: '08:00',
        endTime: '08:00',
        rotationConfig: {
          weekdayRotation: 'DAILY',
          weekendRotation: 'CONTINUOUS',
          continuousDays: 3
        }
      }]
    })
    
    testResult.value = response.data
    
    if (response.data.success) {
      ElMessage.success('测试完成')
    } else {
      ElMessage.error('测试失败')
    }
  } catch (error) {
    console.error('测试失败:', error)
    testResult.value = { error: error.message }
    ElMessage.error('测试失败')
  }
}

const generateRealSchedule = async () => {
  try {
    const response = await api.post('/advanced-schedule/generate', {
      startDate: testForm.startDate,
      endDate: testForm.endDate,
      clearExisting: true,
      rules: [{
        roleId: 2,
        ruleName: '值班员',
        ruleType: 'WEEKEND_CONTINUOUS',
        personnelIds: testForm.personnelIds,
        workDays: [1, 2, 3, 4, 5, 6, 0],
        startTime: '08:00',
        endTime: '08:00',
        rotationConfig: {
          weekdayRotation: 'DAILY',
          weekendRotation: 'CONTINUOUS',
          continuousDays: 3
        }
      }]
    })
    
    testResult.value = response.data
    
    if (response.data.success) {
      ElMessage.success('排班生成成功')
    } else {
      ElMessage.error('排班生成失败')
    }
  } catch (error) {
    console.error('生成失败:', error)
    ElMessage.error('生成失败')
  }
}

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getDayName = (dayOfWeek) => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return days[dayOfWeek]
}

const getPersonName = (personId) => {
  const person = employees.value.find(emp => emp.id === personId)
  return person ? person.name : `员工${personId}`
}
</script>

<style scoped>
.weekend-continuous-test {
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