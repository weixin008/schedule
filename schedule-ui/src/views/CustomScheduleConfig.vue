<template>
  <div class="custom-schedule-config">
    <div class="page-header">
      <h1>12人单位排班配置</h1>
      <p class="subtitle">专门为你的需求定制的排班配置：3人带班领导每日轮换，9人值班员混合轮换</p>
    </div>

    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>排班配置</span>
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

      <!-- 带班领导配置 -->
      <div class="leader-section">
        <h3>带班领导配置</h3>
        <el-alert
          title="带班领导规则说明"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <p>• 3人每日轮换，全周值班</p>
          <p>• 今天A领导，明天B领导，后天C领导，大后天又是A领导</p>
        </el-alert>
        
        <el-form label-width="120px">
          <el-form-item label="启用带班领导">
            <el-switch v-model="rules.leader.enabled" />
          </el-form-item>
          
          <div v-if="rules.leader.enabled">
            <el-form-item label="选择领导">
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
              <el-text type="warning" style="display: block; margin-top: 8px;">
                必须选择3名领导，系统会自动每日轮换
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
          </div>
        </el-form>
      </div>

      <!-- 值班员配置 -->
      <div class="duty-officer-section">
        <h3>值班员配置</h3>
        <el-alert
          title="值班员规则说明"
          type="warning"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <p><strong>重要：这是你的核心需求</strong></p>
          <p>• 周一至周四：每天换一个人值班（4个人轮换）</p>
          <p>• 周五至周日：同一个人连续值班3天</p>
          <p>• 下一周的周五至周日：换下一个人连续值班3天</p>
          <p>• 值班时间：默认8点至次日8点（24小时），可自定义</p>
        </el-alert>
        
        <el-form label-width="120px">
          <el-form-item label="启用值班员">
            <el-switch v-model="rules.dutyOfficer.enabled" />
          </el-form-item>
          
          <div v-if="rules.dutyOfficer.enabled">
            <el-form-item label="选择值班员">
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
              <el-text type="warning" style="display: block; margin-top: 8px;">
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
              <span style="margin: 0 10px;">至次日</span>
              <el-time-picker
                v-model="rules.dutyOfficer.endTime"
                placeholder="结束时间"
                format="HH:mm"
                value-format="HH:mm"
              />
              <el-text type="info" style="display: block; margin-top: 8px;">
                默认8:00至次日8:00（24小时值班）
              </el-text>
            </el-form-item>
          </div>
        </el-form>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button @click="validateConfig" :loading="validating">
          验证配置
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

    <!-- 配置说明 -->
    <el-card class="help-card">
      <template #header>
        <span>配置说明</span>
      </template>
      
      <div class="help-content">
        <h4>关于你提到的问题：</h4>
        <ol>
          <li><strong>周五至周日连续值班</strong>：现在已修复算法，确保同一人连续值班3天</li>
          <li><strong>值班频率设置</strong>：在高级排班中不使用，因为我们有专门的算法</li>
          <li><strong>排班周期</strong>：在智能排班中确实没用，因为你选择了具体的日期范围</li>
          <li><strong>连班设置</strong>：这个功能与我们的专门算法重合，建议使用这个专门页面</li>
          <li><strong>24小时值班</strong>：默认8:00-8:00，你可以根据需要修改时间</li>
        </ol>
        
        <h4>使用建议：</h4>
        <ul>
          <li>使用这个专门的配置页面，而不是通用的"值班角色配置"</li>
          <li>先添加12名员工（3名领导+9名值班员）</li>
          <li>选择合适的日期范围（建议1-2周进行测试）</li>
          <li>点击"验证配置"确保设置正确</li>
          <li>点击"生成排班"创建排班表</li>
        </ul>
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
    startTime: '08:00',
    endTime: '08:00' // 次日8点
  }
})

// 员工数据
const leaderEmployees = ref([])
const dutyEmployees = ref([])

// 初始化
onMounted(() => {
  initializeDates()
  loadEmployees()
})

// 初始化日期
const initializeDates = () => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 14) // 2周测试期
  
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

// 验证配置
const validateConfig = () => {
  const errors = []
  
  if (!scheduleForm.startDate || !scheduleForm.endDate) {
    errors.push('请选择排班日期范围')
  }
  
  if (rules.leader.enabled && rules.leader.personnelIds.length !== 3) {
    errors.push('带班领导必须选择3人')
  }
  
  if (rules.dutyOfficer.enabled && rules.dutyOfficer.personnelIds.length < 9) {
    errors.push('值班员建议选择9人')
  }
  
  if (errors.length > 0) {
    ElMessage.error(errors.join('；'))
    return false
  }
  
  ElMessage.success('配置验证通过')
  return true
}

// 生成排班
const generateSchedule = async () => {
  if (!validateConfig()) {
    return
  }
  
  try {
    generating.value = true
    generateResult.value = null
    
    const advancedRules = []
    
    // 带班领导规则
    if (rules.leader.enabled && rules.leader.personnelIds.length === 3) {
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
.custom-schedule-config {
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

.config-card, .result-card, .help-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-range-section, .leader-section, .duty-officer-section {
  margin-bottom: 32px;
}

.date-range-section h3, .leader-section h3, .duty-officer-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.actions {
  margin-top: 32px;
  text-align: center;
}

.actions .el-button {
  margin: 0 8px;
}

.result-content {
  text-align: center;
}

.help-content h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #409eff;
}

.help-content ol, .help-content ul {
  text-align: left;
  padding-left: 20px;
}

.help-content li {
  margin-bottom: 8px;
  line-height: 1.5;
}
</style>