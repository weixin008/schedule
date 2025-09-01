<template>
  <div class="simplified-scheduling">
    <div class="page-header">
      <h1>简化排班管理</h1>
      <p class="description">
        通过"值班角色配置 + 排班规则"两个核心部分，实现智能排班生成
      </p>
    </div>

    <!-- 配置状态检查 -->
    <el-card class="config-status" shadow="never">
      <template #header>
        <div class="card-header">
          <span>配置状态检查</span>
          <el-button type="primary" size="small" @click="checkSystemStatus">
            刷新状态
          </el-button>
        </div>
      </template>
      
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="status-item">
            <el-icon class="status-icon" :class="statusClass('shifts')">
              <Clock />
            </el-icon>
            <div class="status-content">
              <div class="status-title">班次配置</div>
              <div class="status-value">{{ systemStatus.shifts }}个</div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="6">
          <div class="status-item">
            <el-icon class="status-icon" :class="statusClass('roles')">
              <User />
            </el-icon>
            <div class="status-content">
              <div class="status-title">值班角色</div>
              <div class="status-value">{{ systemStatus.roles }}个</div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="6">
          <div class="status-item">
            <el-icon class="status-icon" :class="statusClass('rules')">
              <Setting />
            </el-icon>
            <div class="status-content">
              <div class="status-title">排班规则</div>
              <div class="status-value">{{ systemStatus.rules }}个</div>
            </div>
          </div>
        </el-col>
        
        <el-col :span="6">
          <div class="status-item">
            <el-icon class="status-icon" :class="statusClass('employees')">
              <UserFilled />
            </el-icon>
            <div class="status-content">
              <div class="status-title">可用员工</div>
              <div class="status-value">{{ systemStatus.employees }}人</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 排班规则选择 -->
    <el-card class="rule-selection" shadow="never">
      <template #header>
        <span>选择排班规则</span>
      </template>
      
      <el-form :model="scheduleForm" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="排班规则">
              <el-select 
                v-model="scheduleForm.ruleId" 
                placeholder="请选择排班规则"
                @change="onRuleChange"
                style="width: 100%"
              >
                <el-option
                  v-for="rule in availableRules"
                  :key="rule.id"
                  :label="rule.name"
                  :value="rule.id"
                >
                  <span style="float: left">{{ rule.name }}</span>
                  <span style="float: right; color: #8492a6; font-size: 13px">
                    {{ rule.rotationType }}
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="6">
            <el-form-item label="开始日期">
              <el-date-picker
                v-model="scheduleForm.startDate"
                type="date"
                placeholder="选择开始日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="6">
            <el-form-item label="结束日期">
              <el-date-picker
                v-model="scheduleForm.endDate"
                type="date"
                placeholder="选择结束日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="4">
            <el-form-item>
              <el-button-group>
                <el-button 
                  type="info" 
                  @click="previewSchedule"
                  :loading="previewLoading"
                >
                  预览
                </el-button>
                <el-button 
                  type="primary" 
                  @click="generateSchedule"
                  :loading="generateLoading"
                >
                  生成排班
                </el-button>
              </el-button-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 规则详情 -->
    <el-card v-if="selectedRule" class="rule-details" shadow="never">
      <template #header>
        <span>规则详情：{{ selectedRule.name }}</span>
      </template>
      
      <el-descriptions :column="2" border>
        <el-descriptions-item label="轮换类型">
          {{ rotationTypeText(selectedRule.rotationType) }}
        </el-descriptions-item>
        <el-descriptions-item label="轮换模式">
          {{ rotationModeText(selectedRule.rotationConfig?.mode) }}
        </el-descriptions-item>
        <el-descriptions-item label="工作日">
          {{ workDaysText(selectedRule.timeConfig?.workDays) }}
        </el-descriptions-item>
        <el-descriptions-item label="跳过节假日">
          {{ selectedRule.timeConfig?.skipHolidays ? '是' : '否' }}
        </el-descriptions-item>
        <el-descriptions-item label="包含班次" span="2">
          <el-tag 
            v-for="shift in ruleShifts" 
            :key="shift.id" 
            type="info" 
            size="small"
            style="margin-right: 8px"
          >
            {{ shift.name }} ({{ shift.startTime }}-{{ shift.endTime }})
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="包含角色" span="2">
          <el-tag 
            v-for="role in ruleRoles" 
            :key="role.id" 
            :type="role.assignmentType === 'SINGLE' ? 'primary' : 'success'"
            size="small"
            style="margin-right: 8px"
          >
            {{ role.name }} ({{ role.assignmentType === 'SINGLE' ? '单人' : '编组' }})
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 排班结果 -->
    <el-card v-if="scheduleResult" class="schedule-result" shadow="never">
      <template #header>
        <div class="card-header">
          <span>排班结果</span>
          <el-tag :type="scheduleResult.success ? 'success' : 'danger'">
            {{ scheduleResult.success ? '成功' : '失败' }}
          </el-tag>
        </div>
      </template>
      
      <div class="result-summary">
        <el-alert
          :title="scheduleResult.message"
          :type="scheduleResult.success ? 'success' : 'error'"
          show-icon
          :closable="false"
        />
        
        <div v-if="scheduleResult.success" class="result-stats">
          <el-row :gutter="20" style="margin-top: 16px">
            <el-col :span="6">
              <el-statistic title="生成排班" :value="scheduleResult.schedules.length" suffix="条" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="冲突数量" :value="scheduleResult.conflicts.length" suffix="个" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="覆盖天数" :value="getUniqueDays(scheduleResult.schedules)" suffix="天" />
            </el-col>
            <el-col :span="6">
              <el-statistic title="涉及人员" :value="getUniquePersons(scheduleResult.schedules)" suffix="人" />
            </el-col>
          </el-row>
        </div>
      </div>

      <!-- 冲突列表 -->
      <div v-if="scheduleResult.conflicts.length > 0" class="conflicts-section">
        <h4>需要处理的冲突：</h4>
        <el-alert
          v-for="(conflict, index) in scheduleResult.conflicts"
          :key="index"
          :title="conflict"
          type="warning"
          show-icon
          :closable="false"
          style="margin-bottom: 8px"
        />
      </div>

      <!-- 排班列表 -->
      <div v-if="scheduleResult.schedules.length > 0" class="schedules-section">
        <h4>生成的排班：</h4>
        <el-table :data="paginatedSchedules" stripe style="width: 100%">
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column label="班次" width="120">
            <template #default="scope">
              {{ getShiftName(scope.row.shiftId) }}
            </template>
          </el-table-column>
          <el-table-column label="角色" width="120">
            <template #default="scope">
              {{ getRoleName(scope.row.roleId) }}
            </template>
          </el-table-column>
          <el-table-column label="分配类型" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.assignmentType === 'SINGLE' ? 'primary' : 'success'" size="small">
                {{ scope.row.assignmentType === 'SINGLE' ? '单人' : '编组' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="分配对象">
            <template #default="scope">
              <span v-if="scope.row.assignmentType === 'SINGLE'">
                {{ getEmployeeName(scope.row.assignedPersonId) }}
              </span>
              <span v-else>
                {{ getGroupName(scope.row.assignedGroupId) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag 
                :type="scope.row.status === 'NORMAL' ? 'success' : 'warning'" 
                size="small"
              >
                {{ statusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        
        <el-pagination
          v-if="scheduleResult.schedules.length > pageSize"
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="scheduleResult.schedules.length"
          layout="prev, pager, next, total"
          style="margin-top: 16px; text-align: center"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, User, Setting, UserFilled } from '@element-plus/icons-vue'
import api from '@/utils/api'

// 响应式数据
const systemStatus = reactive({
  shifts: 0,
  roles: 0,
  rules: 0,
  employees: 0
})

const scheduleForm = reactive({
  ruleId: null,
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 默认30天后
})

const availableRules = ref([])
const selectedRule = ref(null)
const ruleShifts = ref([])
const ruleRoles = ref([])
const scheduleResult = ref(null)
const previewLoading = ref(false)
const generateLoading = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(20)

// 计算属性
const paginatedSchedules = computed(() => {
  if (!scheduleResult.value?.schedules) return []
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return scheduleResult.value.schedules.slice(start, end)
})

// 方法
const checkSystemStatus = async () => {
  try {
    // 检查班次数量
    const shiftsRes = await api.get('/shift')
    systemStatus.shifts = shiftsRes.data.length

    // 检查角色数量
    const rolesRes = await api.get('/shift-role')
    systemStatus.roles = rolesRes.data.length

    // 检查规则数量
    const rulesRes = await api.get('/schedule-rule')
    systemStatus.rules = rulesRes.data.filter(r => r.isActive).length
    availableRules.value = rulesRes.data.filter(r => r.isActive)

    // 检查可用员工数量
    const employeesRes = await api.get('/employee')
    systemStatus.employees = employeesRes.data.filter(e => e.status === 'AVAILABLE').length

  } catch (error) {
    console.error('检查系统状态失败:', error)
    ElMessage.error('检查系统状态失败')
  }
}

const onRuleChange = async () => {
  if (!scheduleForm.ruleId) {
    selectedRule.value = null
    return
  }

  try {
    // 获取规则详情
    const ruleRes = await api.get(`/schedule-rule/${scheduleForm.ruleId}`)
    selectedRule.value = ruleRes.data

    // 获取规则关联的班次
    if (selectedRule.value.timeConfig?.shifts) {
      const shiftIds = selectedRule.value.timeConfig.shifts.map(s => s.id)
      const shiftsRes = await api.get('/shift')
      ruleShifts.value = shiftsRes.data.filter(s => shiftIds.includes(s.id))
    }

    // 获取规则关联的角色
    if (selectedRule.value.roleConfig?.roles) {
      const roleIds = selectedRule.value.roleConfig.roles.map(r => r.id)
      const rolesRes = await api.get('/shift-role')
      ruleRoles.value = rolesRes.data.filter(r => roleIds.includes(r.id))
    }

  } catch (error) {
    console.error('获取规则详情失败:', error)
    ElMessage.error('获取规则详情失败')
  }
}

const previewSchedule = async () => {
  if (!validateForm()) return

  previewLoading.value = true
  try {
    const response = await api.post('/simplified-schedule-engine/preview', {
      ruleId: scheduleForm.ruleId,
      startDate: formatDate(scheduleForm.startDate),
      endDate: formatDate(scheduleForm.endDate)
    })

    scheduleResult.value = response.data
    currentPage.value = 1

    ElMessage.success('预览生成完成')
  } catch (error) {
    console.error('预览排班失败:', error)
    ElMessage.error('预览排班失败')
  } finally {
    previewLoading.value = false
  }
}

const generateSchedule = async () => {
  if (!validateForm()) return

  generateLoading.value = true
  try {
    const response = await api.post('/simplified-schedule-engine/generate', {
      ruleId: scheduleForm.ruleId,
      startDate: formatDate(scheduleForm.startDate),
      endDate: formatDate(scheduleForm.endDate)
    })

    scheduleResult.value = response.data
    currentPage.value = 1

    if (response.data.success) {
      ElMessage.success('排班生成完成')
    } else {
      ElMessage.warning('排班生成部分完成，请检查冲突')
    }
  } catch (error) {
    console.error('生成排班失败:', error)
    ElMessage.error('生成排班失败')
  } finally {
    generateLoading.value = false
  }
}

const validateForm = () => {
  if (!scheduleForm.ruleId) {
    ElMessage.warning('请选择排班规则')
    return false
  }
  if (!scheduleForm.startDate || !scheduleForm.endDate) {
    ElMessage.warning('请选择日期范围')
    return false
  }
  if (scheduleForm.startDate >= scheduleForm.endDate) {
    ElMessage.warning('结束日期必须大于开始日期')
    return false
  }
  return true
}

// 辅助方法
const statusClass = (type: string) => {
  const count = systemStatus[type]
  return count > 0 ? 'status-success' : 'status-warning'
}

const formatDate = (date: Date) => {
  return date.toISOString().split('T')[0]
}

const rotationTypeText = (type: string) => {
  const types = {
    'DAILY': '每日轮换',
    'WEEKLY': '每周轮换',
    'MONTHLY': '每月轮换',
    'CONTINUOUS': '连续轮换',
    'SHIFT_BASED': '基于班次'
  }
  return types[type] || type
}

const rotationModeText = (mode: string) => {
  const modes = {
    'SEQUENTIAL': '顺序轮换',
    'BALANCED': '负载均衡',
    'RANDOM': '随机分配'
  }
  return modes[mode] || mode
}

const workDaysText = (workDays: number[]) => {
  if (!workDays || workDays.length === 0) return '每天'
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return workDays.map(d => dayNames[d]).join(', ')
}

const getShiftName = (shiftId: number) => {
  const shift = ruleShifts.value.find(s => s.id === shiftId)
  return shift ? shift.name : `班次${shiftId}`
}

const getRoleName = (roleId: number) => {
  const role = ruleRoles.value.find(r => r.id === roleId)
  return role ? role.name : `角色${roleId}`
}

const getEmployeeName = (employeeId: number) => {
  // 这里可以从缓存或API获取员工姓名
  return `员工${employeeId}`
}

const getGroupName = (groupId: number) => {
  // 这里可以从缓存或API获取编组名称
  return `编组${groupId}`
}

const statusText = (status: string) => {
  const statuses = {
    'NORMAL': '正常',
    'CONFLICT': '冲突',
    'EMPTY': '空班'
  }
  return statuses[status] || status
}

const getUniqueDays = (schedules: any[]) => {
  const dates = new Set(schedules.map(s => s.date))
  return dates.size
}

const getUniquePersons = (schedules: any[]) => {
  const persons = new Set()
  schedules.forEach(s => {
    if (s.assignedPersonId) persons.add(s.assignedPersonId)
    if (s.assignedGroupId) persons.add(`group_${s.assignedGroupId}`)
  })
  return persons.size
}

// 生命周期
onMounted(() => {
  checkSystemStatus()
})
</script>

<style scoped>
.simplified-scheduling {
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 500;
}

.description {
  color: #666;
  margin: 0;
}

.config-status,
.rule-selection,
.rule-details,
.schedule-result {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.status-icon {
  font-size: 24px;
  margin-right: 12px;
}

.status-icon.status-success {
  color: #67c23a;
}

.status-icon.status-warning {
  color: #e6a23c;
}

.status-content {
  flex: 1;
}

.status-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.status-value {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.result-summary {
  margin-bottom: 24px;
}

.result-stats {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.conflicts-section,
.schedules-section {
  margin-top: 24px;
}

.conflicts-section h4,
.schedules-section h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 500;
}
</style>