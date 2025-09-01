<template>
  <div class="advanced-schedule-config">
    <div class="page-header">
      <h1>高级排班配置</h1>
      <p class="subtitle">配置复杂的轮换规则，支持带班领导、值班员和考勤监督员的不同排班模式</p>
    </div>

    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>排班规则配置</span>
          <el-button type="primary" @click="generateSchedule" :loading="generating">
            生成排班
          </el-button>
        </div>
      </template>

      <!-- 日期范围选择 -->
      <div class="date-range-section">
        <h3>排班日期范围</h3>
        <el-form :model="scheduleForm" label-width="120px">
          <el-form-item label="开始日期">
            <el-date-picker
              v-model="scheduleForm.startDate"
              type="date"
              placeholder="选择开始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker
              v-model="scheduleForm.endDate"
              type="date"
              placeholder="选择结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="清除现有排班">
            <el-switch v-model="scheduleForm.clearExisting" />
            <el-text type="info" style="margin-left: 10px;">
              开启后将清除指定日期范围内的现有排班记录
            </el-text>
          </el-form-item>
        </el-form>
      </div>

      <!-- 排班规则配置 -->
      <div class="rules-section">
        <h3>排班规则</h3>
        
        <!-- 带班领导规则 -->
        <el-card class="rule-card" shadow="never">
          <template #header>
            <div class="rule-header">
              <el-checkbox v-model="rules.leader.enabled">带班领导</el-checkbox>
              <el-tag type="info" size="small">每日轮换</el-tag>
            </div>
          </template>
          
          <div v-if="rules.leader.enabled" class="rule-content">
            <el-form label-width="120px">
              <el-form-item label="人员选择">
                <el-select
                  v-model="rules.leader.personnelIds"
                  multiple
                  placeholder="选择3名带班领导"
                  style="width: 100%"
                >
                  <el-option
                    v-for="emp in leaderEmployees"
                    :key="emp.id"
                    :label="emp.name"
                    :value="emp.id"
                  />
                </el-select>
                <el-text type="info" style="display: block; margin-top: 8px;">
                  建议选择3名领导，每日轮换值班
                </el-text>
              </el-form-item>
              <el-form-item label="值班时间">
                <el-time-picker
                  v-model="rules.leader.startTime"
                  placeholder="开始时间"
                  format="HH:mm"
                  value-format="HH:mm"
                />
                <span style="margin: 0 10px;">至</span>
                <el-time-picker
                  v-model="rules.leader.endTime"
                  placeholder="结束时间"
                  format="HH:mm"
                  value-format="HH:mm"
                />
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <!-- 值班员规则 -->
        <el-card class="rule-card" shadow="never">
          <template #header>
            <div class="rule-header">
              <el-checkbox v-model="rules.dutyOfficer.enabled">值班员</el-checkbox>
              <el-tag type="warning" size="small">混合轮换</el-tag>
            </div>
          </template>
          
          <div v-if="rules.dutyOfficer.enabled" class="rule-content">
            <el-alert
              title="值班员轮换规则"
              type="info"
              :closable="false"
              style="margin-bottom: 16px;"
            >
              <p>• 周一至周四：每日轮换不同的人值班</p>
              <p>• 周五至周日：同一人连续值班3天，下周换下一个人</p>
            </el-alert>
            
            <el-form label-width="120px">
              <el-form-item label="人员选择">
                <el-select
                  v-model="rules.dutyOfficer.personnelIds"
                  multiple
                  placeholder="选择9名值班员"
                  style="width: 100%"
                >
                  <el-option
                    v-for="emp in dutyEmployees"
                    :key="emp.id"
                    :label="emp.name"
                    :value="emp.id"
                  />
                </el-select>
                <el-text type="info" style="display: block; margin-top: 8px;">
                  建议选择9名值班员，确保轮换的合理性
                </el-text>
              </el-form-item>
              <el-form-item label="值班时间">
                <el-time-picker
                  v-model="rules.dutyOfficer.startTime"
                  placeholder="开始时间"
                  format="HH:mm"
                  value-format="HH:mm"
                />
                <span style="margin: 0 10px;">至</span>
                <el-time-picker
                  v-model="rules.dutyOfficer.endTime"
                  placeholder="结束时间"
                  format="HH:mm"
                  value-format="HH:mm"
                />
              </el-form-item>
            </el-form>
          </div>
        </el-card>

        <!-- 考勤监督员规则 -->
        <el-card class="rule-card" shadow="never">
          <template #header>
            <div class="rule-header">
              <el-checkbox v-model="rules.supervisor.enabled">考勤监督员</el-checkbox>
              <el-tag type="success" size="small">编组轮换</el-tag>
            </div>
          </template>
          
          <div v-if="rules.supervisor.enabled" class="rule-content">
            <el-alert
              title="考勤监督员编组规则"
              type="info"
              :closable="false"
              style="margin-bottom: 16px;"
            >
              <p>• 按组值班：每周一至周五由一组人员值班</p>
              <p>• 每周轮换：下一周由下一组值班</p>
            </el-alert>
            
            <el-form label-width="120px">
              <el-form-item label="编组选择">
                <el-select
                  v-model="rules.supervisor.groupIds"
                  multiple
                  placeholder="选择监督员编组"
                  style="width: 100%"
                >
                  <el-option
                    v-for="group in supervisorGroups"
                    :key="group.id"
                    :label="group.name"
                    :value="group.id"
                  />
                </el-select>
                <el-text type="info" style="display: block; margin-top: 8px;">
                  选择已创建的监督员编组，建议至少2个组
                </el-text>
              </el-form-item>
              <el-form-item label="值班时间">
                <el-time-picker
                  v-model="rules.supervisor.startTime"
                  placeholder="开始时间"
                  format="HH:mm"
                  value-format="HH:mm"
                />
                <span style="margin: 0 10px;">至</span>
                <el-time-picker
                  v-model="rules.supervisor.endTime"
                  placeholder="结束时间"
                  format="HH:mm"
                  value-format="HH:mm"
                />
              </el-form-item>
            </el-form>
          </div>
        </el-card>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button @click="validateRules" :loading="validating">
          验证规则
        </el-button>
        <el-button type="primary" @click="generateSchedule" :loading="generating">
          生成排班
        </el-button>
        <el-button type="danger" @click="clearScheduleRange" :loading="clearing">
          清除排班
        </el-button>
      </div>
    </el-card>

    <!-- 生成结果 -->
    <el-card v-if="generateResult" class="result-card">
      <template #header>
        <span>生成结果</span>
      </template>
      
      <div class="result-content">
        <el-result
          :icon="generateResult.success ? 'success' : 'error'"
          :title="generateResult.message"
        >
          <template #sub-title>
            <div v-if="generateResult.success && generateResult.data">
              <p>生成排班记录：{{ generateResult.data.scheduleCount }} 条</p>
              <p>日期范围：{{ generateResult.data.dateRange.startDate }} 至 {{ generateResult.data.dateRange.endDate }}</p>
              <p>应用规则：{{ generateResult.data.rulesApplied }} 个</p>
            </div>
            <div v-else-if="!generateResult.success">
              <p style="color: #f56c6c;">{{ generateResult.error }}</p>
            </div>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

// 响应式数据
const generating = ref(false)
const validating = ref(false)
const clearing = ref(false)
const generateResult = ref(null)

// 表单数据
const scheduleForm = reactive({
  startDate: '',
  endDate: '',
  clearExisting: false
})

// 排班规则
const rules = reactive({
  leader: {
    enabled: true,
    personnelIds: [],
    startTime: '08:00',
    endTime: '18:00'
  },
  dutyOfficer: {
    enabled: true,
    personnelIds: [],
    startTime: '18:00',
    endTime: '08:00'
  },
  supervisor: {
    enabled: false,
    groupIds: [],
    startTime: '08:00',
    endTime: '18:00'
  }
})

// 员工和组数据
const leaderEmployees = ref([])
const dutyEmployees = ref([])
const supervisorGroups = ref([])

// 初始化
onMounted(() => {
  initializeDates()
  loadEmployees()
  loadGroups()
})

// 初始化日期
const initializeDates = () => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  scheduleForm.startDate = today.toISOString().split('T')[0]
  scheduleForm.endDate = nextWeek.toISOString().split('T')[0]
}

// 加载员工数据
const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    const employees = response.data
    
    // 分类员工
    leaderEmployees.value = employees.filter(emp => 
      emp.tags?.includes('领导') || 
      emp.organizationPosition?.includes('领导') ||
      emp.organizationPosition?.includes('主任') ||
      emp.organizationPosition?.includes('院长')
    )
    
    dutyEmployees.value = employees.filter(emp => 
      !emp.tags?.includes('领导') && 
      emp.status === 'ON_DUTY' &&
      !emp.organizationPosition?.includes('领导') &&
      !emp.organizationPosition?.includes('主任') &&
      !emp.organizationPosition?.includes('院长')
    )
    
    console.log('员工分类完成:', {
      leaders: leaderEmployees.value.length,
      dutyOfficers: dutyEmployees.value.length
    })
  } catch (error) {
    console.error('加载员工数据失败:', error)
    ElMessage.error('加载员工数据失败')
  }
}

// 加载编组数据
const loadGroups = async () => {
  try {
    const response = await api.get('/group')
    supervisorGroups.value = response.data || []
    console.log('加载编组数据:', supervisorGroups.value.length, '个编组')
  } catch (error) {
    console.error('加载编组数据失败:', error)
    // 编组是可选功能，加载失败时不显示错误消息
    supervisorGroups.value = []
  }
}

// 验证规则
const validateRules = async () => {
  try {
    validating.value = true
    
    const advancedRules = buildAdvancedRules()
    if (advancedRules.length === 0) {
      ElMessage.warning('请至少启用一个排班规则')
      return
    }
    
    const response = await api.post('/advanced-schedule/validate-rules', advancedRules)
    
    if (response.data.success) {
      ElMessage.success('规则验证通过')
    } else {
      ElMessage.error(`规则验证失败: ${response.data.message}`)
    }
  } catch (error) {
    console.error('验证规则失败:', error)
    ElMessage.error('验证规则失败')
  } finally {
    validating.value = false
  }
}

// 生成排班
const generateSchedule = async () => {
  try {
    generating.value = true
    generateResult.value = null
    
    // 验证表单
    if (!scheduleForm.startDate || !scheduleForm.endDate) {
      ElMessage.error('请选择排班日期范围')
      return
    }
    
    const advancedRules = buildAdvancedRules()
    if (advancedRules.length === 0) {
      ElMessage.error('请至少启用一个排班规则')
      return
    }
    
    const requestData = {
      startDate: scheduleForm.startDate,
      endDate: scheduleForm.endDate,
      clearExisting: scheduleForm.clearExisting,
      rules: advancedRules
    }
    
    console.log('发送排班生成请求:', requestData)
    
    const response = await api.post('/advanced-schedule/generate', requestData)
    generateResult.value = response.data
    
    if (response.data.success) {
      ElMessage.success('排班生成成功')
    } else {
      ElMessage.error(`排班生成失败: ${response.data.message}`)
    }
  } catch (error) {
    console.error('生成排班失败:', error)
    generateResult.value = {
      success: false,
      message: '生成排班失败',
      error: error.response?.data?.message || error.message
    }
    ElMessage.error('生成排班失败')
  } finally {
    generating.value = false
  }
}

// 构建高级排班规则
const buildAdvancedRules = () => {
  const advancedRules = []
  
  // 带班领导规则
  if (rules.leader.enabled && rules.leader.personnelIds.length > 0) {
    advancedRules.push({
      roleId: 1,
      ruleName: '带班领导',
      ruleType: 'DAILY_ROTATION',
      personnelIds: rules.leader.personnelIds,
      workDays: [1, 2, 3, 4, 5, 6, 0], // 全周
      startTime: rules.leader.startTime,
      endTime: rules.leader.endTime
    })
  }
  
  // 值班员规则
  if (rules.dutyOfficer.enabled && rules.dutyOfficer.personnelIds.length > 0) {
    advancedRules.push({
      roleId: 2,
      ruleName: '值班员',
      ruleType: 'WEEKEND_CONTINUOUS',
      personnelIds: rules.dutyOfficer.personnelIds,
      workDays: [1, 2, 3, 4, 5, 6, 0], // 全周
      startTime: rules.dutyOfficer.startTime,
      endTime: rules.dutyOfficer.endTime,
      rotationConfig: {
        weekdayRotation: 'DAILY',
        weekendRotation: 'CONTINUOUS',
        continuousDays: 3
      }
    })
  }
  
  // 考勤监督员规则
  if (rules.supervisor.enabled && rules.supervisor.groupIds.length > 0) {
    advancedRules.push({
      roleId: 3,
      ruleName: '考勤监督员',
      ruleType: 'GROUP_WEEKLY',
      personnelIds: [],
      groupIds: rules.supervisor.groupIds,
      workDays: [1, 2, 3, 4, 5], // 周一至周五
      startTime: rules.supervisor.startTime,
      endTime: rules.supervisor.endTime,
      rotationConfig: {
        groupRotationWeeks: 1
      }
    })
  }
  
  return advancedRules
}

// 清除排班范围
const clearScheduleRange = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要清除 ${scheduleForm.startDate} 至 ${scheduleForm.endDate} 的所有排班记录吗？`,
      '确认清除',
      {
        confirmButtonText: '确定清除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    clearing.value = true
    
    const response = await api.delete('/advanced-schedule/clear-range', {
      params: {
        startDate: scheduleForm.startDate,
        endDate: scheduleForm.endDate
      }
    })
    
    if (response.data.success) {
      ElMessage.success('排班记录清除成功')
    } else {
      ElMessage.error(`清除失败: ${response.data.message}`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清除排班记录失败:', error)
      ElMessage.error('清除排班记录失败')
    }
  } finally {
    clearing.value = false
  }
}
</script>

<style scoped>
.advanced-schedule-config {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.subtitle {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.config-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-range-section {
  margin-bottom: 32px;
}

.date-range-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.rules-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.rule-card {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rule-content {
  padding-top: 16px;
}

.actions {
  margin-top: 32px;
  text-align: center;
}

.actions .el-button {
  margin: 0 8px;
}

.result-card {
  margin-top: 24px;
}

.result-content {
  text-align: center;
}
</style>