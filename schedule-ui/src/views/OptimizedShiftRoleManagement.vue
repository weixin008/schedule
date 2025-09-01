<template>
  <div class="optimized-shift-role-management">
    <div class="page-header">
      <h1>值班角色配置</h1>
      <p class="subtitle">基于实际需求的排班规则配置，简化无用选项</p>
    </div>

    <!-- 角色列表视图 -->
    <div v-if="viewMode === 'list'" class="roles-list-container">
      <div class="list-header">
        <h2>已配置的值班角色</h2>
        <el-button type="primary" @click="createNewRole">
          <el-icon><Plus /></el-icon>
          新建角色
        </el-button>
      </div>

      <div v-if="rolesList.length === 0" class="empty-state">
        <el-empty description="暂无配置的值班角色">
          <el-button type="primary" @click="createNewRole">创建第一个角色</el-button>
        </el-empty>
      </div>

      <div v-else class="roles-list">
        <div 
          v-for="role in rolesList" 
          :key="role.id" 
          class="role-item"
        >
          <div class="role-info">
            <div class="role-name">
              {{ role.name }}
              <el-tag size="small" :type="role.isActive ? 'success' : 'info'">
                {{ role.isActive ? '启用' : '停用' }}
              </el-tag>
            </div>
            
            <div class="role-summary">
              {{ getRotationTypeText(role.extendedConfig?.rotationType) }} | 
              <span v-if="role.extendedConfig?.timeConfig">
                {{ formatTime(role.extendedConfig.timeConfig.startTime) }}-{{ formatTime(role.extendedConfig.timeConfig.endTime) }}
              </span> | 
              {{ formatWorkDays(role.extendedConfig?.timeConfig?.workDays) }} | 
              {{ role.assignmentType === 'SINGLE' ? '单人值班' : '团队值班' }}
              <span v-if="role.extendedConfig?.rotationOrder?.length">
                ({{ role.extendedConfig.rotationOrder.length }}人)
              </span>
            </div>
            
            <div v-if="role.description" class="role-description">
              {{ role.description }}
            </div>
          </div>
          
          <div class="role-actions">
            <el-button size="small" @click="editRole(role)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="danger" @click="deleteRole(role)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色配置视图 -->
    <div v-else class="main-container">
      <!-- 左侧步骤导航 -->
      <div class="steps-sidebar">
        <div class="back-button">
          <el-button @click="backToList">
            <el-icon><ArrowLeft /></el-icon>
            返回列表
          </el-button>
        </div>
        
        <div class="steps-nav">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            :class="['step-item', { 
              'active': currentStep === index, 
              'completed': index < currentStep 
            }]"
            @click="goToStep(index)"
          >
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-title">{{ step.title }}</div>
          </div>
        </div>
      </div>

      <!-- 右侧步骤内容 -->
      <div class="step-content">
        <!-- 操作按钮 -->
        <div class="step-actions">
          <el-button 
            v-if="currentStep > 0" 
            @click="prevStep"
          >
            上一步
          </el-button>
          
          <el-button 
            v-if="currentStep < steps.length - 1" 
            type="primary" 
            @click="nextStep"
            :disabled="!canProceedToNext()"
          >
            下一步
          </el-button>
          
          <el-button 
            v-if="currentStep === steps.length - 1" 
            type="success" 
            @click="saveRole"
            :loading="saving"
          >
            保存配置
          </el-button>
          
          <el-button @click="resetFormWithConfirm">重置</el-button>
        </div>

        <!-- 步骤1: 基础信息配置 -->
        <div v-if="currentStep === 0" class="step-panel">
          <h2>基础信息配置</h2>
          <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="120px">
            <el-form-item label="角色名称" prop="name">
              <el-input v-model="roleForm.name" placeholder="如：带班领导、值班员、考勤监督员" />
            </el-form-item>
            <el-form-item label="角色描述" prop="description">
              <el-input 
                v-model="roleForm.description" 
                type="textarea" 
                :rows="3"
                placeholder="请输入角色职责和要求"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- 步骤2: 时间和工作日设置 -->
        <div v-if="currentStep === 1" class="step-panel">
          <h2>时间和工作日设置</h2>
          <div class="time-config">
            <el-form :model="roleForm.timeConfig" label-width="120px">
              <!-- 值班日期选择 -->
              <el-form-item label="值班日期">
                <el-checkbox-group v-model="roleForm.timeConfig.workDays">
                  <el-checkbox label="1">周一</el-checkbox>
                  <el-checkbox label="2">周二</el-checkbox>
                  <el-checkbox label="3">周三</el-checkbox>
                  <el-checkbox label="4">周四</el-checkbox>
                  <el-checkbox label="5">周五</el-checkbox>
                  <el-checkbox label="6">周六</el-checkbox>
                  <el-checkbox label="0">周日</el-checkbox>
                </el-checkbox-group>
                <div class="workdays-presets" style="margin-top: 10px;">
                  <el-button size="small" @click="setWorkDaysPreset('weekdays')">工作日</el-button>
                  <el-button size="small" @click="setWorkDaysPreset('weekends')">周末</el-button>
                  <el-button size="small" @click="setWorkDaysPreset('all')">全周</el-button>
                </div>
              </el-form-item>
              
              <!-- 值班时间 -->
              <el-form-item label="值班开始时间">
                <el-time-picker 
                  v-model="roleForm.timeConfig.startTime" 
                  format="HH:mm"
                  placeholder="选择开始时间"
                  @change="calculateDuration"
                />
              </el-form-item>
              
              <el-form-item label="值班结束时间">
                <el-time-picker 
                  v-model="roleForm.timeConfig.endTime" 
                  format="HH:mm"
                  placeholder="选择结束时间"
                  @change="calculateDuration"
                />
              </el-form-item>
              
              <el-form-item label="值班时长">
                <el-input-number 
                  v-model="roleForm.timeConfig.duration" 
                  :min="1" 
                  :max="24"
                  :disabled="true"
                />
                <span class="unit">小时（自动计算）</span>
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 步骤3: 值班人员配置 -->
        <div v-if="currentStep === 2" class="step-panel">
          <h2>值班人员配置</h2>
          <div class="personnel-config">
            <div class="config-header">
              <el-radio-group v-model="roleForm.personnelType">
                <el-radio value="single">单人值班</el-radio>
                <el-radio value="group">编组值班</el-radio>
              </el-radio-group>
              <el-button @click="loadEmployees" style="margin-left: 20px;">刷新人员列表</el-button>
            </div>
            
            <!-- 单人值班配置 -->
            <div v-if="roleForm.personnelType === 'single'" class="single-personnel">
              <el-alert 
                title="单人值班模式：每次值班安排一个人，按照设定的顺序轮换" 
                type="info" 
                :closable="false"
                style="margin-bottom: 20px;"
              />
              
              <div class="personnel-selection">
                <div class="available-personnel">
                  <h4>可选人员</h4>
                  <div class="personnel-list">
                    <div 
                      v-for="employee in availableEmployees" 
                      :key="employee.key"
                      class="personnel-item"
                      @click="addToRotation(employee)"
                    >
                      <el-avatar :size="32" :src="employee.avatar">{{ employee.label.charAt(0) }}</el-avatar>
                      <span>{{ employee.label }}</span>
                      <el-button type="primary" size="small" icon="Plus">添加</el-button>
                    </div>
                  </div>
                </div>
                
                <div class="rotation-order">
                  <h4>值班顺序 <el-text type="info">(拖拽调整顺序)</el-text></h4>
                  <div class="rotation-list">
                    <div 
                      v-for="(person, index) in roleForm.rotationOrder" 
                      :key="person.key"
                      class="rotation-item"
                      draggable="true"
                      @dragstart="onDragStart(index)"
                      @dragover.prevent
                      @drop="onDrop(index)"
                    >
                      <div class="order-number">{{ index + 1 }}</div>
                      <el-avatar :size="32" :src="person.avatar">{{ person.label.charAt(0) }}</el-avatar>
                      <span class="person-name">{{ person.label }}</span>
                      <el-button type="danger" size="small" icon="Delete" @click="removeFromRotation(index)">移除</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 编组值班配置 -->
            <div v-if="roleForm.personnelType === 'group'" class="group-personnel">
              <el-alert 
                title="编组值班模式：每次值班安排一个组，按照组别顺序轮换" 
                type="info" 
                :closable="false"
                style="margin-bottom: 20px;"
              />
              
              <div class="group-selection">
                <el-form label-width="120px">
                  <el-form-item label="选择编组">
                    <el-select
                      v-model="roleForm.selectedGroups"
                      multiple
                      placeholder="选择值班编组"
                      style="width: 100%"
                    >
                      <el-option
                        v-for="group in availableGroups"
                        :key="group.id"
                        :label="group.name"
                        :value="group.id"
                      />
                    </el-select>
                    <el-text type="info" style="display: block; margin-top: 8px;">
                      选择已创建的编组进行轮换值班
                    </el-text>
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤4: 轮换规则（简化版） -->
        <div v-if="currentStep === 3" class="step-panel">
          <h2>轮换规则</h2>
          <div class="rules-config">
            <el-form :model="roleForm.rules" label-width="120px">
              <!-- 核心轮换规则 -->
              <el-form-item label="轮换方式">
                <el-radio-group v-model="roleForm.rotationType">
                  <el-radio value="DAILY_ROTATION">每日轮换</el-radio>
                  <el-radio value="WEEKLY_ROTATION">每周轮换</el-radio>
                  <el-radio value="CONSECUTIVE_DAYS">连班模式</el-radio>
                  <el-radio value="GROUP_WEEKLY">编组按周轮换</el-radio>
                </el-radio-group>
                <div class="rotation-descriptions">
                  <div v-if="roleForm.rotationType === 'DAILY_ROTATION'" class="description">
                    <el-text type="info">每天换一个人值班，适用于带班领导等角色</el-text>
                  </div>
                  <div v-if="roleForm.rotationType === 'WEEKLY_ROTATION'" class="description">
                    <el-text type="info">每周换一个人值班，适用于周期性轮换</el-text>
                  </div>
                  <div v-if="roleForm.rotationType === 'CONSECUTIVE_DAYS'" class="description">
                    <el-text type="warning">连班模式：选中的工作日由同一人连续值班，每周轮换下一个人</el-text>
                    <el-text type="info" style="display: block; margin-top: 8px;">
                      例如：选择周五、周六、周日，则本周这三天都是张三值班，下周这三天都是李四值班
                    </el-text>
                  </div>
                  <div v-if="roleForm.rotationType === 'GROUP_WEEKLY'" class="description">
                    <el-text type="info">编组按周轮换，每周由一个组值班</el-text>
                  </div>
                </div>
              </el-form-item>
              
              <!-- 节假日处理 -->
              <el-form-item label="节假日处理">
                <el-radio-group v-model="roleForm.rules.holidayHandling">
                  <el-radio label="normal">正常排班</el-radio>
                  <el-radio label="skip">跳过节假日</el-radio>
                  <el-radio label="double">节假日加强</el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="特殊要求">
                <el-input 
                  v-model="roleForm.rules.specialRequirements" 
                  type="textarea" 
                  :rows="3"
                  placeholder="如：重要会议期间需要双人值班、夜班需要有经验的人员等"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <!-- 步骤5: 预览确认 -->
        <div v-if="currentStep === 4" class="step-panel">
          <h2>配置预览与确认</h2>
          <div class="preview-content">
            <div class="config-overview">
              <el-descriptions title="角色基础信息" :column="2" border>
                <el-descriptions-item label="角色名称">{{ roleForm.name }}</el-descriptions-item>
                <el-descriptions-item label="轮换方式">{{ getRotationTypeText(roleForm.rotationType) }}</el-descriptions-item>
                <el-descriptions-item label="描述" :span="2">{{ roleForm.description || '无' }}</el-descriptions-item>
              </el-descriptions>
              
              <el-descriptions title="时间配置" :column="2" border style="margin-top: 20px;">
                <el-descriptions-item label="开始时间">{{ formatTime(roleForm.timeConfig.startTime) }}</el-descriptions-item>
                <el-descriptions-item label="结束时间">{{ formatTime(roleForm.timeConfig.endTime) }}</el-descriptions-item>
                <el-descriptions-item label="工作时长">{{ roleForm.timeConfig.duration }}小时</el-descriptions-item>
                <el-descriptions-item label="工作日" :span="2">
                  <el-tag 
                    v-for="day in roleForm.timeConfig.workDays" 
                    :key="day"
                    size="small"
                    style="margin-right: 4px;"
                  >
                    {{ getWeekDayName(day) }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
              
              <el-descriptions title="人员配置" :column="1" border style="margin-top: 20px;">
                <el-descriptions-item label="值班模式">
                  {{ roleForm.personnelType === 'single' ? '单人值班' : '编组值班' }}
                </el-descriptions-item>
                
                <template v-if="roleForm.personnelType === 'single'">
                  <el-descriptions-item label="值班顺序">
                    <div class="rotation-preview">
                      <el-tag 
                        v-for="(person, index) in roleForm.rotationOrder" 
                        :key="person.key"
                        style="margin-right: 8px; margin-bottom: 4px;"
                      >
                        {{ index + 1 }}. {{ person.label }}
                      </el-tag>
                    </div>
                  </el-descriptions-item>
                </template>
                
                <template v-else>
                  <el-descriptions-item label="编组配置">
                    <div class="groups-preview">
                      <el-tag 
                        v-for="groupId in roleForm.selectedGroups" 
                        :key="groupId"
                        style="margin-right: 8px; margin-bottom: 4px;"
                      >
                        {{ getGroupName(groupId) }}
                      </el-tag>
                    </div>
                  </el-descriptions-item>
                </template>
              </el-descriptions>
              
              <el-descriptions title="轮换规则" :column="2" border style="margin-top: 20px;">
                <el-descriptions-item label="轮换方式">{{ getRotationTypeText(roleForm.rotationType) }}</el-descriptions-item>
                <el-descriptions-item label="节假日处理">{{ getHolidayText(roleForm.rules.holidayHandling) }}</el-descriptions-item>
                <el-descriptions-item v-if="roleForm.rules.specialRequirements" label="特殊要求" :span="2">
                  {{ roleForm.rules.specialRequirements }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { Plus, Delete, Edit, ArrowLeft, QuestionFilled } from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()

// 简化的步骤配置
const steps = [
  { title: '基础信息', key: 'basic' },
  { title: '时间设置', key: 'time' },
  { title: '人员配置', key: 'personnel' },
  { title: '轮换规则', key: 'rules' },
  { title: '预览确认', key: 'preview' }
]

// 视图模式和状态
const viewMode = ref('list')
const currentStep = ref(0)
const saving = ref(false)
const loading = ref(false)

// 数据
const rolesList = ref([])
const editingRoleId = ref(null)
const availableEmployees = ref([])
const availableGroups = ref([])

// 简化的表单数据
const roleForm = reactive({
  name: '',
  description: '',
  timeConfig: {
    startTime: new Date(2024, 0, 1, 8, 0),
    endTime: new Date(2024, 0, 1, 18, 0),
    duration: 10,
    workDays: ['1', '2', '3', '4', '5'] // 默认工作日
  },
  personnelType: 'single', // 'single' 或 'group'
  rotationOrder: [], // 单人值班顺序
  selectedGroups: [], // 选择的编组
  rotationType: 'DAILY_ROTATION', // 轮换方式
  rules: {
    consecutiveDays: 3, // 连续值班天数
    holidayHandling: 'normal', // 节假日处理
    specialRequirements: '' // 特殊要求
  }
})

// 表单验证规则
const roleRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ]
}

const roleFormRef = ref()
const draggedIndex = ref(-1)

// 初始化
onMounted(() => {
  loadRolesList()
  loadEmployees()
  loadGroups()
})

// 加载角色列表
const loadRolesList = async () => {
  try {
    loading.value = true
    const response = await api.get('/shift-roles')
    rolesList.value = response.data || []
  } catch (error) {
    console.error('加载角色列表失败:', error)
    ElMessage.error('加载角色列表失败')
  } finally {
    loading.value = false
  }
}

// 加载员工数据
const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    const employees = response.data
    
    availableEmployees.value = employees.map(emp => ({
      key: emp.id,
      label: `${emp.name} (${emp.organizationPosition || emp.position || '未分配岗位'})`,
      disabled: false,
      avatar: emp.avatar || null
    }))
  } catch (error) {
    console.error('加载员工数据失败:', error)
    ElMessage.error('加载员工数据失败')
  }
}

// 加载编组数据
const loadGroups = async () => {
  try {
    const response = await api.get('/group')
    availableGroups.value = response.data || []
    console.log('加载编组数据成功:', availableGroups.value.length, '个编组')
  } catch (error) {
    console.error('加载编组数据失败:', error)
    // 编组是可选功能，加载失败时不显示错误消息，只在控制台记录
    // 用户可以通过编组管理页面创建编组
    availableGroups.value = []
  }
}

// 创建新角色
const createNewRole = () => {
  editingRoleId.value = null
  resetForm()
  viewMode.value = 'config'
  currentStep.value = 0
}

// 编辑角色
const editRole = (role) => {
  editingRoleId.value = role.id
  loadRoleToForm(role)
  viewMode.value = 'config'
  currentStep.value = 0
}

// 删除角色
const deleteRole = async (role) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除角色"${role.name}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await api.delete(`/shift-roles/${role.id}`)
    ElMessage.success('角色删除成功')
    await loadRolesList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除角色失败:', error)
      ElMessage.error('删除角色失败')
    }
  }
}

// 返回列表
const backToList = () => {
  viewMode.value = 'list'
  resetForm()
}

// 步骤导航
const goToStep = (step) => {
  if (step <= currentStep.value || canProceedToNext()) {
    currentStep.value = step
  }
}

const nextStep = () => {
  if (canProceedToNext() && currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const canProceedToNext = () => {
  switch (currentStep.value) {
    case 0:
      return roleForm.name.trim() !== ''
    case 1:
      return roleForm.timeConfig.workDays.length > 0
    case 2:
      return roleForm.personnelType === 'group' 
        ? roleForm.selectedGroups.length > 0
        : roleForm.rotationOrder.length > 0
    case 3:
      return true
    default:
      return true
  }
}

// 保存角色
const saveRole = async () => {
  try {
    saving.value = true
    
    const roleData = {
      name: roleForm.name,
      description: roleForm.description,
      assignmentType: roleForm.personnelType === 'single' ? 'SINGLE' : 'GROUP',
      isActive: true,
      extendedConfig: {
        rotationType: roleForm.rotationType,
        timeConfig: roleForm.timeConfig,
        rotationOrder: roleForm.rotationOrder,
        selectedGroups: roleForm.selectedGroups,
        rules: roleForm.rules
      }
    }
    
    if (editingRoleId.value) {
      await api.put(`/shift-roles/${editingRoleId.value}`, roleData)
      ElMessage.success('角色更新成功')
    } else {
      await api.post('/shift-roles', roleData)
      ElMessage.success('角色创建成功')
    }
    
    viewMode.value = 'list'
    await loadRolesList()
  } catch (error) {
    console.error('保存角色失败:', error)
    ElMessage.error('保存角色失败')
  } finally {
    saving.value = false
  }
}

// 工具函数
const formatTime = (time) => {
  if (!time) return '--'
  return time instanceof Date ? time.toTimeString().slice(0, 5) : time
}

const formatWorkDays = (workDays) => {
  if (!workDays || workDays.length === 0) return '未设置'
  const dayNames = { '0': '周日', '1': '周一', '2': '周二', '3': '周三', '4': '周四', '5': '周五', '6': '周六' }
  return workDays.map(day => dayNames[day]).join('、')
}

const getWeekDayName = (day) => {
  const dayNames = { '0': '周日', '1': '周一', '2': '周二', '3': '周三', '4': '周四', '5': '周五', '6': '周六' }
  return dayNames[day] || day
}

const getRotationTypeText = (type) => {
  const typeMap = {
    'DAILY_ROTATION': '每日轮换',
    'WEEKLY_ROTATION': '每周轮换',
    'CONSECUTIVE_DAYS': '连班模式',
    'GROUP_WEEKLY': '编组按周轮换'
  }
  return typeMap[type] || type
}

const getHolidayText = (handling) => {
  const handlingMap = {
    'normal': '正常排班',
    'skip': '跳过节假日',
    'double': '节假日加强'
  }
  return handlingMap[handling] || handling
}

const getGroupName = (groupId) => {
  const group = availableGroups.value.find(g => g.id === groupId)
  return group ? group.name : `编组${groupId}`
}

// 人员管理
const addToRotation = (employee) => {
  if (!roleForm.rotationOrder.find(p => p.key === employee.key)) {
    roleForm.rotationOrder.push({ ...employee })
  }
}

const removeFromRotation = (index) => {
  roleForm.rotationOrder.splice(index, 1)
}

// 拖拽功能
const onDragStart = (index) => {
  draggedIndex.value = index
}

const onDrop = (targetIndex) => {
  if (draggedIndex.value !== -1 && draggedIndex.value !== targetIndex) {
    const draggedItem = roleForm.rotationOrder[draggedIndex.value]
    roleForm.rotationOrder.splice(draggedIndex.value, 1)
    roleForm.rotationOrder.splice(targetIndex, 0, draggedItem)
  }
  draggedIndex.value = -1
}

// 工作日预设
const setWorkDaysPreset = (preset) => {
  switch (preset) {
    case 'weekdays':
      roleForm.timeConfig.workDays = ['1', '2', '3', '4', '5']
      break
    case 'weekends':
      roleForm.timeConfig.workDays = ['6', '0']
      break
    case 'all':
      roleForm.timeConfig.workDays = ['1', '2', '3', '4', '5', '6', '0']
      break
  }
}

// 计算时长
const calculateDuration = () => {
  if (roleForm.timeConfig.startTime && roleForm.timeConfig.endTime) {
    const start = new Date(roleForm.timeConfig.startTime)
    const end = new Date(roleForm.timeConfig.endTime)
    let duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (duration < 0) duration += 24 // 跨日处理
    roleForm.timeConfig.duration = Math.round(duration * 10) / 10
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(roleForm, {
    name: '',
    description: '',
    timeConfig: {
      startTime: new Date(2024, 0, 1, 8, 0),
      endTime: new Date(2024, 0, 1, 18, 0),
      duration: 10,
      workDays: ['1', '2', '3', '4', '5']
    },
    personnelType: 'single',
    rotationOrder: [],
    selectedGroups: [],
    rotationType: 'DAILY_ROTATION',
    rules: {
      consecutiveDays: 3,
      holidayHandling: 'normal',
      specialRequirements: ''
    }
  })
  currentStep.value = 0
}

const resetFormWithConfirm = async () => {
  try {
    await ElMessageBox.confirm('确定要重置所有配置吗？', '确认重置', {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning',
    })
    resetForm()
    ElMessage.success('配置已重置')
  } catch (error) {
    // 用户取消
  }
}

// 加载角色到表单
const loadRoleToForm = (role) => {
  const config = role.extendedConfig || {}
  
  Object.assign(roleForm, {
    name: role.name || '',
    description: role.description || '',
    timeConfig: {
      startTime: config.timeConfig?.startTime ? new Date(config.timeConfig.startTime) : new Date(2024, 0, 1, 8, 0),
      endTime: config.timeConfig?.endTime ? new Date(config.timeConfig.endTime) : new Date(2024, 0, 1, 18, 0),
      duration: config.timeConfig?.duration || 10,
      workDays: config.timeConfig?.workDays || ['1', '2', '3', '4', '5']
    },
    personnelType: role.assignmentType === 'SINGLE' ? 'single' : 'group',
    rotationOrder: config.rotationOrder || [],
    selectedGroups: config.selectedGroups || [],
    rotationType: config.rotationType || 'DAILY_ROTATION',
    rules: {
      consecutiveDays: config.rules?.consecutiveDays || 3,
      holidayHandling: config.rules?.holidayHandling || 'normal',
      specialRequirements: config.rules?.specialRequirements || ''
    }
  })
}
</script>

<style scoped>
/* 样式保持与原版本相似，但更简洁 */
.optimized-shift-role-management {
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

.roles-list-container {
  background: white;
  border-radius: 8px;
  padding: 24px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.list-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.roles-list {
  display: grid;
  gap: 16px;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
}

.role-info {
  flex: 1;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-summary {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.role-description {
  font-size: 12px;
  color: #999;
}

.role-actions {
  display: flex;
  gap: 8px;
}

.main-container {
  display: flex;
  gap: 24px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.steps-sidebar {
  width: 200px;
  background: #f8f9fa;
  padding: 24px 16px;
}

.back-button {
  margin-bottom: 24px;
}

.steps-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.step-item:hover {
  background: #e9ecef;
}

.step-item.active {
  background: #e3f2fd;
  color: #1976d2;
}

.step-item.completed {
  color: #4caf50;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.step-item.active .step-number {
  background: #1976d2;
  color: white;
}

.step-item.completed .step-number {
  background: #4caf50;
  color: white;
}

.step-title {
  font-size: 14px;
  font-weight: 500;
}

.step-content {
  flex: 1;
  padding: 24px;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.step-panel h2 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
}

.workdays-presets {
  display: flex;
  gap: 8px;
}

.personnel-config {
  margin-top: 16px;
}

.config-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.personnel-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 20px;
}

.available-personnel h4,
.rotation-order h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
}

.personnel-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.personnel-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.personnel-item:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.rotation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.rotation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: white;
  cursor: move;
}

.order-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.person-name {
  flex: 1;
}

.group-selection {
  margin-top: 20px;
}

.rotation-descriptions {
  margin-top: 12px;
}

.description {
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #409eff;
}

.config-overview {
  max-width: 800px;
}

.rotation-preview,
.groups-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.unit {
  margin-left: 8px;
  color: #666;
  font-size: 12px;
}
</style>