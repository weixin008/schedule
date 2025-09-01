<template>
  <div class="role-based-schedule-generation">
    <div class="page-header">
      <h1>基于角色的排班生成</h1>
      <p class="subtitle">使用已配置的值班角色规则生成排班表</p>
    </div>

    <el-card class="generation-card">
      <template #header>
        <div class="card-header">
          <span>排班生成配置</span>
          <el-button type="primary" @click="generateSchedule" :loading="generating">
            生成排班
          </el-button>
        </div>
      </template>

      <!-- 日期范围选择 -->
      <div class="date-range-section">
        <h3>排班日期范围</h3>
        <el-form :model="generationForm" label-width="120px">
          <el-form-item label="开始日期">
            <el-date-picker
              v-model="generationForm.startDate"
              type="date"
              placeholder="选择开始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker
              v-model="generationForm.endDate"
              type="date"
              placeholder="选择结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="清除现有排班">
            <el-switch v-model="generationForm.clearExisting" />
            <el-text type="info" style="margin-left: 10px;">
              开启后将清除指定日期范围内的现有排班记录
            </el-text>
          </el-form-item>
        </el-form>
      </div>

      <!-- 角色选择 -->
      <div class="roles-selection-section">
        <h3>选择值班角色</h3>
        <div v-if="availableRoles.length === 0" class="no-roles">
          <el-empty description="暂无可用的值班角色">
            <el-button type="primary" @click="goToRoleConfig">
              去配置角色
            </el-button>
          </el-empty>
        </div>
        <div v-else class="roles-list">
          <div 
            v-for="role in availableRoles" 
            :key="role.id"
            class="role-card"
            :class="{ 'selected': generationForm.selectedRoleIds.includes(role.id) }"
            @click="toggleRoleSelection(role.id)"
          >
            <div class="role-header">
              <div class="role-name">
                {{ role.name }}
                <el-tag size="small" :type="getRoleTypeTag(role.extendedConfig?.rotationType)">
                  {{ getRotationTypeText(role.extendedConfig?.rotationType) }}
                </el-tag>
              </div>
              <el-checkbox 
                :model-value="generationForm.selectedRoleIds.includes(role.id)"
                @change="toggleRoleSelection(role.id)"
              />
            </div>
            
            <div class="role-details">
              <div class="detail-item">
                <span class="label">工作日：</span>
                <span>{{ formatWorkDays(role.extendedConfig?.timeConfig?.workDays) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">时间：</span>
                <span>{{ formatTime(role.extendedConfig?.timeConfig?.startTime) }} - {{ formatTime(role.extendedConfig?.timeConfig?.endTime) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">人员：</span>
                <span v-if="role.assignmentType === 'SINGLE'">
                  {{ role.extendedConfig?.rotationOrder?.length || 0 }}人轮换
                </span>
                <span v-else>
                  {{ role.extendedConfig?.selectedGroups?.length || 0 }}个编组
                </span>
              </div>
              <div v-if="role.description" class="detail-item">
                <span class="label">描述：</span>
                <span>{{ role.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 生成预览 -->
      <div v-if="generationForm.selectedRoleIds.length > 0" class="preview-section">
        <h3>生成预览</h3>
        <el-alert
          title="即将生成的排班"
          type="info"
          :closable="false"
          style="margin-bottom: 16px;"
        >
          <ul>
            <li>日期范围：{{ generationForm.startDate }} 至 {{ generationForm.endDate }}</li>
            <li>选择角色：{{ selectedRoles.length }}个</li>
            <li>清除现有：{{ generationForm.clearExisting ? '是' : '否' }}</li>
          </ul>
        </el-alert>
        
        <div class="selected-roles-summary">
          <h4>已选择的角色：</h4>
          <div class="roles-tags">
            <el-tag 
              v-for="role in selectedRoles" 
              :key="role.id"
              size="large"
              :type="getRoleTypeTag(role.extendedConfig?.rotationType)"
              closable
              @close="toggleRoleSelection(role.id)"
            >
              {{ role.name }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <el-button @click="validateConfiguration" :loading="validating">
          验证配置
        </el-button>
        <el-button type="primary" @click="generateSchedule" :loading="generating">
          生成排班
        </el-button>
        <el-button @click="goToRoleConfig">
          管理角色
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
              <p>应用角色：{{ generateResult.data.rolesApplied }} 个</p>
            </div>
            <div v-else-if="!generateResult.success">
              <p style="color: #f56c6c;">{{ generateResult.error }}</p>
            </div>
          </template>
          <template #extra>
            <el-button v-if="generateResult.success" type="primary" @click="goToCalendar">
              查看排班日历
            </el-button>
          </template>
        </el-result>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()

// 响应式数据
const generating = ref(false)
const validating = ref(false)
const generateResult = ref(null)
const availableRoles = ref([])

// 表单数据
const generationForm = reactive({
  startDate: '',
  endDate: '',
  selectedRoleIds: [],
  clearExisting: false
})

// 计算属性
const selectedRoles = computed(() => {
  return availableRoles.value.filter(role => 
    generationForm.selectedRoleIds.includes(role.id)
  )
})

// 初始化
onMounted(() => {
  initializeDates()
  loadAvailableRoles()
})

// 初始化日期
const initializeDates = () => {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  generationForm.startDate = today.toISOString().split('T')[0]
  generationForm.endDate = nextWeek.toISOString().split('T')[0]
}

// 加载可用角色
const loadAvailableRoles = async () => {
  try {
    const response = await api.get('/shift-roles')
    availableRoles.value = (response.data || []).filter(role => role.isActive)
    console.log('加载可用角色:', availableRoles.value.length, '个角色')
  } catch (error) {
    console.error('加载角色失败:', error)
    ElMessage.error('加载角色失败')
  }
}

// 切换角色选择
const toggleRoleSelection = (roleId) => {
  const index = generationForm.selectedRoleIds.indexOf(roleId)
  if (index > -1) {
    generationForm.selectedRoleIds.splice(index, 1)
  } else {
    generationForm.selectedRoleIds.push(roleId)
  }
}

// 验证配置
const validateConfiguration = () => {
  const errors = []
  
  if (!generationForm.startDate || !generationForm.endDate) {
    errors.push('请选择排班日期范围')
  }
  
  if (generationForm.selectedRoleIds.length === 0) {
    errors.push('请至少选择一个值班角色')
  }
  
  // 检查角色配置完整性
  for (const role of selectedRoles.value) {
    const config = role.extendedConfig || {}
    if (role.assignmentType === 'SINGLE') {
      if (!config.rotationOrder || config.rotationOrder.length === 0) {
        errors.push(`角色"${role.name}"未配置值班人员`)
      }
    } else {
      if (!config.selectedGroups || config.selectedGroups.length === 0) {
        errors.push(`角色"${role.name}"未配置值班编组`)
      }
    }
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
  if (!validateConfiguration()) {
    return
  }
  
  try {
    generating.value = true
    generateResult.value = null
    
    const requestData = {
      startDate: generationForm.startDate,
      endDate: generationForm.endDate,
      roleIds: generationForm.selectedRoleIds,
      clearExisting: generationForm.clearExisting
    }
    
    console.log('发送排班生成请求:', requestData)
    
    const response = await api.post('/advanced-schedule/generate-from-roles', requestData)
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

// 导航函数
const goToRoleConfig = () => {
  router.push('/schedule/roles')
}

const goToCalendar = () => {
  router.push('/schedule/calendar')
}

// 工具函数
const formatTime = (time) => {
  if (!time) return '--'
  if (typeof time === 'string') return time
  if (time instanceof Date) return time.toTimeString().slice(0, 5)
  return '--'
}

const formatWorkDays = (workDays) => {
  if (!workDays || workDays.length === 0) return '未设置'
  const dayNames = { '0': '周日', '1': '周一', '2': '周二', '3': '周三', '4': '周四', '5': '周五', '6': '周六' }
  return workDays.map(day => dayNames[day]).join('、')
}

const getRotationTypeText = (type) => {
  const typeMap = {
    'DAILY_ROTATION': '每日轮换',
    'WEEKLY_ROTATION': '每周轮换',
    'WEEKEND_CONTINUOUS': '周末连续',
    'GROUP_WEEKLY': '编组轮换'
  }
  return typeMap[type] || '未知'
}

const getRoleTypeTag = (type) => {
  const tagMap = {
    'DAILY_ROTATION': 'primary',
    'WEEKLY_ROTATION': 'success',
    'WEEKEND_CONTINUOUS': 'warning',
    'GROUP_WEEKLY': 'info'
  }
  return tagMap[type] || 'info' // 使用 'info' 而不是 'default'
}
</script>

<style scoped>
.role-based-schedule-generation {
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

.generation-card, .result-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.date-range-section, .roles-selection-section, .preview-section {
  margin-bottom: 32px;
}

.date-range-section h3, .roles-selection-section h3, .preview-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.no-roles {
  text-align: center;
  padding: 40px 20px;
}

.roles-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.role-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.role-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.role-card.selected {
  border-color: #409eff;
  background: #f0f9ff;
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.role-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item {
  font-size: 14px;
  color: #666;
}

.detail-item .label {
  font-weight: 500;
  color: #333;
}

.selected-roles-summary {
  margin-top: 16px;
}

.selected-roles-summary h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.roles-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
</style>