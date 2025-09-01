<template>
  <div class="consecutive-test">
    <div class="page-header">
      <h1>连班功能测试</h1>
      <p class="subtitle">测试连班排班的生成和显示功能</p>
    </div>

    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>连班排班测试</span>
          <el-button type="primary" @click="generateConsecutiveSchedule" :loading="generating">
            生成连班排班
          </el-button>
        </div>
      </template>

      <!-- 配置表单 -->
      <el-form :model="testForm" label-width="120px">
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="testForm.startDate"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="testForm.endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <el-form-item label="选择人员">
          <el-select
            v-model="testForm.personnelIds"
            multiple
            placeholder="选择值班人员"
            style="width: 100%"
          >
            <el-option
              v-for="emp in employees"
              :key="emp.id"
              :label="emp.name"
              :value="emp.id"
            />
          </el-select>
          <el-text type="info" style="display: block; margin-top: 8px;">
            建议选择3-5名人员进行连班测试
          </el-text>
        </el-form-item>

        <el-form-item label="工作日">
          <el-checkbox-group v-model="testForm.workDays">
            <el-checkbox :value="1">周一</el-checkbox>
            <el-checkbox :value="2">周二</el-checkbox>
            <el-checkbox :value="3">周三</el-checkbox>
            <el-checkbox :value="4">周四</el-checkbox>
            <el-checkbox :value="5">周五</el-checkbox>
            <el-checkbox :value="6">周六</el-checkbox>
            <el-checkbox :value="0">周日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="清除现有排班">
          <el-switch v-model="testForm.clearExisting" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 测试结果 -->
    <el-card v-if="testResult" class="result-card">
      <template #header>
        <span>测试结果</span>
      </template>
      
      <div class="result-content">
        <el-result
          :icon="testResult.success ? 'success' : 'error'"
          :title="testResult.message"
        >
          <template #sub-title>
            <div v-if="testResult.success && testResult.data">
              <p>生成排班记录：{{ testResult.data.scheduleCount }} 条</p>
              <p>日期范围：{{ testResult.data.dateRange.startDate }} 至 {{ testResult.data.dateRange.endDate }}</p>
              <p>应用规则：{{ testResult.data.rulesApplied }} 个</p>
            </div>
            <div v-else-if="!testResult.success">
              <p style="color: #f56c6c;">{{ testResult.error }}</p>
            </div>
          </template>
          
          <template #extra>
            <el-button type="primary" @click="viewScheduleCalendar">
              查看排班日历
            </el-button>
          </template>
        </el-result>
      </div>
    </el-card>

    <!-- 排班预览 -->
    <el-card v-if="schedulePreview.length > 0" class="preview-card">
      <template #header>
        <span>排班预览</span>
      </template>
      
      <el-table :data="schedulePreview" style="width: 100%">
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="dayOfWeek" label="星期" width="80" />
        <el-table-column prop="employeeName" label="值班人员" width="120" />
        <el-table-column prop="notes" label="备注" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()
const generating = ref(false)
const employees = ref([])
const testResult = ref(null)
const schedulePreview = ref([])

// 测试表单
const testForm = reactive({
  startDate: '',
  endDate: '',
  personnelIds: [],
  workDays: [1, 2, 3, 4, 5, 6, 0], // 默认全周
  clearExisting: true
})

// 初始化
onMounted(() => {
  initializeDates()
  loadEmployees()
})

// 初始化日期
const initializeDates = () => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 14) // 两周时间
  
  testForm.startDate = today.toISOString().split('T')[0]
  testForm.endDate = nextWeek.toISOString().split('T')[0]
}

// 加载员工数据
const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    employees.value = response.data || []
    
    // 默认选择前3名员工
    if (employees.value.length >= 3) {
      testForm.personnelIds = employees.value.slice(0, 3).map(emp => emp.id)
    }
    
    console.log('加载员工数据:', employees.value.length, '名员工')
  } catch (error) {
    console.error('加载员工数据失败:', error)
    ElMessage.error('加载员工数据失败')
  }
}

// 生成连班排班
const generateConsecutiveSchedule = async () => {
  try {
    generating.value = true
    testResult.value = null
    schedulePreview.value = []
    
    // 验证表单
    if (!testForm.startDate || !testForm.endDate) {
      ElMessage.error('请选择日期范围')
      return
    }
    
    if (testForm.personnelIds.length === 0) {
      ElMessage.error('请选择值班人员')
      return
    }
    
    if (testForm.workDays.length === 0) {
      ElMessage.error('请选择工作日')
      return
    }
    
    const requestData = {
      startDate: testForm.startDate,
      endDate: testForm.endDate,
      clearExisting: testForm.clearExisting,
      rules: [{
        roleId: 2,
        ruleName: '连班测试',
        ruleType: 'WEEKEND_CONTINUOUS',
        personnelIds: testForm.personnelIds,
        workDays: testForm.workDays,
        startTime: '08:00',
        endTime: '18:00',
        rotationConfig: {
          weekdayRotation: 'DAILY',
          weekendRotation: 'CONTINUOUS',
          continuousDays: 3  // 连续3天值班，然后轮换
        }
      }]
    }
    
    console.log('发送连班排班生成请求:', requestData)
    
    const response = await api.post('/advanced-schedule/generate', requestData)
    testResult.value = response.data
    
    if (response.data.success) {
      ElMessage.success('连班排班生成成功')
      await loadSchedulePreview()
    } else {
      ElMessage.error(`连班排班生成失败: ${response.data.message}`)
    }
  } catch (error) {
    console.error('生成连班排班失败:', error)
    testResult.value = {
      success: false,
      message: '生成连班排班失败',
      error: error.response?.data?.message || error.message
    }
    ElMessage.error('生成连班排班失败')
  } finally {
    generating.value = false
  }
}

// 加载排班预览
const loadSchedulePreview = async () => {
  try {
    const response = await api.get('/schedules')
    const schedules = response.data || []
    
    // 过滤指定日期范围的排班
    const startDate = new Date(testForm.startDate)
    const endDate = new Date(testForm.endDate)
    
    const filteredSchedules = schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date)
      return scheduleDate >= startDate && scheduleDate <= endDate
    })
    
    // 转换为预览格式
    schedulePreview.value = filteredSchedules.map(schedule => {
      const employee = employees.value.find(emp => emp.id === schedule.assignedPersonId)
      const date = new Date(schedule.date)
      
      return {
        date: schedule.date.split('T')[0],
        dayOfWeek: date.toLocaleDateString('zh-CN', { weekday: 'long' }),
        employeeName: employee?.name || `ID:${schedule.assignedPersonId}`,
        notes: schedule.notes || ''
      }
    }).sort((a, b) => a.date.localeCompare(b.date))
    
    console.log('排班预览数据:', schedulePreview.value.length, '条记录')
  } catch (error) {
    console.error('加载排班预览失败:', error)
  }
}

// 查看排班日历
const viewScheduleCalendar = () => {
  router.push('/schedule-calendar')
}
</script>

<style scoped>
.consecutive-test {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  color: #303133;
}

.subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.test-card,
.result-card,
.preview-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-content {
  text-align: center;
}
</style>