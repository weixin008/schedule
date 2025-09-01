<template>
  <div class="improved-shift-role-management">
    <!-- 角色列表视图 -->
    <div v-if="viewMode === 'list'" class="roles-list-container">
      <div class="list-header">
        <h2>值班角色配置</h2>
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
                <span v-if="role.extendedConfig.timeConfig.crossDay">(次日)</span>
              </span> | 
              {{ formatWorkDays(role.extendedConfig?.timeConfig?.workDays) }}
            </div>
            
            <div v-if="role.description" class="role-description">
              {{ role.description }}
            </div>
          </div>
          
          <div class="role-actions">
            <el-button size="small" @click="editRole(role)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteRole(role)">删除</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 角色配置视图 -->
    <div v-else class="config-container">
      <div class="config-header">
        <div class="header-left">
          <el-button @click="backToList">
            <el-icon><ArrowLeft /></el-icon>
            返回列表
          </el-button>
          <h2>{{ editingRoleId ? '编辑角色' : '新建角色' }}</h2>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="saveRole" :loading="saving">
            <el-icon v-if="!saving"><Check /></el-icon>
            {{ editingRoleId ? '更新角色' : '创建角色' }}
          </el-button>
          <el-button type="success" @click="createNewRole" v-if="editingRoleId" style="margin-left: 8px;">
            <el-icon><Plus /></el-icon>
            继续新建
          </el-button>
        </div>
      </div>

      <div class="config-content">
        <el-form :model="roleForm" :rules="roleRules" ref="roleFormRef" label-width="100px" class="role-form">
          <!-- 左侧：基础信息和排班规则 -->
          <div class="form-left">
            <!-- 基础信息 -->
            <el-card class="config-section">
              <template #header>
                <span>基础信息</span>
              </template>
              
              <el-form-item label="角色名称" prop="name">
                <el-input v-model="roleForm.name" placeholder="如：带班领导、值班员" />
              </el-form-item>

              <el-form-item label="班次类别" prop="shiftCategory">
                <el-select v-model="roleForm.shiftCategory" placeholder="选择班次类别" @change="onShiftCategoryChange">
                  <el-option label="全天班" value="FULL_DAY" />
                  <el-option label="白夜班" value="DAY_NIGHT" />
                  <el-option label="早晚班" value="MORNING_EVENING" />
                  <el-option label="自定义" value="CUSTOM" />
                </el-select>
                <div class="category-description">
                  <el-text type="info" size="small">
                    {{ getShiftCategoryDescription(roleForm.shiftCategory) }}
                  </el-text>
                </div>
              </el-form-item>
              
              <el-form-item label="角色描述">
                <el-input 
                  v-model="roleForm.description" 
                  type="textarea" 
                  :rows="2"
                  placeholder="请输入角色职责和要求"
                />
              </el-form-item>
            </el-card>

            <!-- 排班规则 -->
            <el-card class="config-section">
              <template #header>
                <span>排班规则</span>
              </template>
              
              <el-form-item label="轮换方式" prop="rotationType">
                <el-radio-group v-model="roleForm.rotationType" @change="onRotationTypeChange">
                  <el-radio value="DAILY_ROTATION">每日轮换</el-radio>
                  <el-radio value="WEEKLY_ROTATION">每周轮换</el-radio>
                  <el-radio value="CONTINUOUS">连班模式</el-radio>
                </el-radio-group>
              </el-form-item>

              <!-- 值班时间 -->
              <el-form-item label="值班时间">
                <div class="time-config">
                  <el-time-picker 
                    v-model="roleForm.startTime" 
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="开始时间"
                    @change="calculateDuration"
                  />
                  <span class="time-separator">至</span>
                  <el-time-picker 
                    v-model="roleForm.endTime" 
                    format="HH:mm"
                    value-format="HH:mm"
                    placeholder="结束时间"
                    @change="calculateDuration"
                  />
                  <el-checkbox v-model="roleForm.crossDay" @change="calculateDuration">
                    次日
                  </el-checkbox>
                </div>
                <div class="time-info">
                  <el-text type="info">
                    时长：{{ roleForm.duration }}小时
                  </el-text>
                </div>
                <div class="time-presets">
                  <el-button size="small" @click="setTimePreset('24h')">24小时</el-button>
                  <el-button size="small" @click="setTimePreset('day')">白班(8-18)</el-button>
                  <el-button size="small" @click="setTimePreset('night')">夜班(18-8)</el-button>
                </div>
              </el-form-item>

              <!-- 工作日选择 -->
              <el-form-item label="工作日">
                <el-checkbox-group v-model="roleForm.workDays">
                  <el-checkbox label="1">周一</el-checkbox>
                  <el-checkbox label="2">周二</el-checkbox>
                  <el-checkbox label="3">周三</el-checkbox>
                  <el-checkbox label="4">周四</el-checkbox>
                  <el-checkbox label="5">周五</el-checkbox>
                  <el-checkbox label="6">周六</el-checkbox>
                  <el-checkbox label="0">周日</el-checkbox>
                </el-checkbox-group>
                <div class="workdays-presets">
                  <el-button size="small" @click="setWorkDaysPreset('weekdays')">工作日</el-button>
                  <el-button size="small" @click="setWorkDaysPreset('weekends')">周末</el-button>
                  <el-button size="small" @click="setWorkDaysPreset('all')">全周</el-button>
                </div>
              </el-form-item>

              <!-- 连班模式说明（仅在连班模式时显示） -->
              <el-form-item v-if="roleForm.rotationType === 'CONTINUOUS'" label="连班说明">
                <div class="continuous-description">
                  <p>连班模式：同一周内选中的工作日由同一人值班，每周轮换到下一个人</p>
                  <p>连班天数由选择的工作日自动确定</p>
                </div>
              </el-form-item>
            </el-card>
          </div>

          <!-- 右侧：人员配置 -->
          <div class="form-right">
            <el-card class="config-section">
              <template #header>
                <span>人员配置</span>
              </template>
              
              <el-form-item label="值班模式">
                <el-radio-group v-model="roleForm.personnelType">
                  <el-radio value="single">单人值班</el-radio>
                  <el-radio value="group">编组值班</el-radio>
                </el-radio-group>
              </el-form-item>

              <!-- 单人值班配置 -->
              <div v-if="roleForm.personnelType === 'single'" class="single-personnel">
                <el-form-item label="选择人员">
                  <el-select
                    v-model="roleForm.selectedPersonnel"
                    multiple
                    placeholder="选择值班人员"
                    style="width: 100%"
                    filterable
                  >
                    <el-option
                      v-for="emp in availableEmployees"
                      :key="emp.id"
                      :label="`${emp.name} - ${emp.position || emp.department || '未分配岗位'}`"
                      :value="emp.id"
                    />
                  </el-select>
                  <el-text type="info" style="display: block; margin-top: 8px;">
                    已选择 {{ roleForm.selectedPersonnel.length }} 人，将按顺序轮换值班
                  </el-text>
                </el-form-item>
              </div>

              <!-- 编组值班配置 -->
              <div v-if="roleForm.personnelType === 'group'" class="group-personnel">
                <el-form-item label="选择编组">
                  <div class="group-selection">
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
                      >
                        <span>{{ group.name }}</span>
                        <span style="float: right; color: #8492a6; font-size: 13px">
                          ({{ group.memberIds?.length || group.members || 0 }}人)
                        </span>
                      </el-option>
                    </el-select>
                    <el-button 
                      type="primary" 
                      link 
                      @click="showGroupManager = true"
                      style="margin-top: 8px;"
                    >
                      <el-icon><Setting /></el-icon>
                      管理编组
                    </el-button>
                  </div>
                  <el-text type="info" style="display: block; margin-top: 8px;">
                    已选择 {{ roleForm.selectedGroups.length }} 个编组，将按顺序轮换值班
                  </el-text>
                </el-form-item>

                <!-- 编组详情 -->
                <div v-if="roleForm.selectedGroups.length > 0" class="selected-groups-detail">
                  <el-divider>已选编组详情</el-divider>
                  <div 
                    v-for="groupId in roleForm.selectedGroups" 
                    :key="groupId"
                    class="group-detail-item"
                  >
                    <div class="group-info">
                      <strong>{{ getGroupName(groupId) }}</strong>
                      <span class="member-count">({{ getGroupMemberCount(groupId) }}人)</span>
                    </div>
                    <div class="group-members">
                      <el-tag 
                        v-for="member in getGroupMembers(groupId)" 
                        :key="member.id"
                        size="small"
                        style="margin-right: 4px; margin-bottom: 4px;"
                      >
                        {{ member.name }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 预览信息 -->
              <div class="preview-info">
                <el-divider>配置预览</el-divider>
                <div class="preview-item">
                  <strong>轮换方式：</strong>{{ getRotationTypeText(roleForm.rotationType) }}
                </div>
                <div class="preview-item">
                  <strong>值班时间：</strong>{{ roleForm.startTime }}-{{ roleForm.endTime }}
                  <span v-if="roleForm.crossDay">(次日)</span>
                  ({{ roleForm.duration }}小时)
                </div>
                <div class="preview-item">
                  <strong>工作日：</strong>{{ formatWorkDays(roleForm.workDays) }}
                </div>
                <div v-if="roleForm.rotationType === 'CONTINUOUS'" class="preview-item">
                  <strong>连班模式：</strong>同一周内选中工作日由同一人值班，每周轮换
                </div>
                <div class="preview-item">
                  <strong>人员安排：</strong>
                  <span v-if="roleForm.personnelType === 'single'">
                    单人值班 ({{ roleForm.selectedPersonnel.length }}人轮换)
                  </span>
                  <span v-else>
                    编组值班 ({{ roleForm.selectedGroups.length }}组轮换)
                  </span>
                </div>
              </div>
            </el-card>
          </div>
        </el-form>

        <!-- 已配置角色和覆盖分析 -->
        <div class="analysis-section">
          <el-row :gutter="20">
            <!-- 已配置角色 -->
            <el-col :span="24">
              <el-card class="analysis-card roles-coverage-card">
                <template #header>
                  <span>已配置角色覆盖情况 ({{ rolesList.length }})</span>
                </template>
                <div v-if="rolesList.length === 0" class="empty-hint">
                  <el-text type="info">暂无已配置的角色</el-text>
                </div>
                <div v-else class="roles-coverage-grid">
                  <div 
                    v-for="role in rolesList" 
                    :key="role.id" 
                    class="role-coverage-item"
                  >
                    <div class="role-header">
                      <div class="role-name">
                        {{ role.name }}
                        <el-tag size="small" :type="role.isActive ? 'success' : 'info'">
                          {{ role.isActive ? '启用' : '停用' }}
                        </el-tag>
                      </div>
                      <div class="role-category">
                        {{ getShiftCategoryText(role.extendedConfig?.shiftCategory) }}
                      </div>
                    </div>
                    
                    <!-- 工作日覆盖 -->
                    <div class="coverage-row">
                      <span class="coverage-label">工作日:</span>
                      <div class="day-coverage-mini">
                        <div 
                          v-for="day in weekDays" 
                          :key="day.value"
                          class="day-item-mini"
                          :class="{ 
                            'covered': role.extendedConfig?.timeConfig?.workDays?.includes(day.value),
                            'uncovered': !role.extendedConfig?.timeConfig?.workDays?.includes(day.value)
                          }"
                        >
                          {{ day.label.slice(1) }}
                        </div>
                      </div>
                    </div>
                    
                    <!-- 时间覆盖 -->
                    <div class="coverage-row">
                      <span class="coverage-label">时间段:</span>
                      <div class="time-coverage-mini">
                        <div 
                          v-for="slot in getCurrentTimeSlots(role.extendedConfig?.shiftCategory)" 
                          :key="slot.label"
                          class="time-slot-mini"
                          :class="{ 
                            'covered': isRoleTimeSlotCovered(role, slot),
                            'uncovered': !isRoleTimeSlotCovered(role, slot)
                          }"
                        >
                          {{ slot.label }}
                        </div>
                      </div>
                    </div>
                    
                    <div class="role-time-info">
                      {{ role.extendedConfig?.timeConfig?.startTime }}-{{ role.extendedConfig?.timeConfig?.endTime }}
                      <span v-if="role.extendedConfig?.timeConfig?.crossDay">(次日)</span>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>

            <!-- 覆盖分析 -->
            <el-col :span="24">
              <el-row :gutter="20">
                <!-- 工作日覆盖分析 -->
                <el-col :span="12">
                  <el-card class="analysis-card">
                    <template #header>
                      <span>工作日覆盖分析</span>
                    </template>
                    <div class="coverage-analysis">
                      <div class="day-coverage">
                        <div 
                          v-for="day in weekDays" 
                          :key="day.value"
                          class="day-item"
                          :class="{ 'covered': isDayCovered(day.value), 'uncovered': !isDayCovered(day.value) }"
                        >
                          <span class="day-name">{{ day.label }}</span>
                          <el-icon v-if="isDayCovered(day.value)" class="check-icon"><Check /></el-icon>
                          <el-icon v-else class="warning-icon"><Warning /></el-icon>
                        </div>
                      </div>
                      
                      <!-- 覆盖建议 -->
                      <div v-if="dayGaps.length > 0" class="coverage-suggestions">
                        <h4>未覆盖工作日</h4>
                        <div class="gap-tags">
                          <el-tag v-for="gap in dayGaps" :key="gap" type="warning" size="small">
                            {{ gap }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </el-card>
                </el-col>

                <!-- 时间段覆盖分析 -->
                <el-col :span="12">
                  <el-card class="analysis-card">
                    <template #header>
                      <span>{{ getShiftCategoryText(roleForm.shiftCategory) }}时间段覆盖</span>
                    </template>
                    <div class="coverage-analysis">
                      <div class="time-coverage">
                        <div class="time-slots">
                          <div 
                            v-for="slot in currentTimeSlots" 
                            :key="slot.label"
                            class="time-slot"
                            :class="{ 'covered': isTimeSlotCovered(slot), 'uncovered': !isTimeSlotCovered(slot) }"
                          >
                            <span>{{ slot.label }}</span>
                            <small>{{ slot.time }}</small>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 时间段建议 -->
                      <div v-if="timeGaps.length > 0" class="coverage-suggestions">
                        <h4>未覆盖时间段</h4>
                        <div class="gap-tags">
                          <el-tag v-for="gap in timeGaps" :key="gap" type="warning" size="small">
                            {{ gap }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                  </el-card>
                </el-col>
              </el-row>
            </el-col>
          </el-row>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button @click="backToList">取消</el-button>
        </div>
      </div>
    </div>

    <!-- 编组管理对话框 -->
    <el-dialog
      v-model="showGroupManager"
      title="编组管理"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="group-manager">
        <div class="group-manager-header">
          <el-button type="primary" @click="showCreateGroup = true">
            <el-icon><Plus /></el-icon>
            新建编组
          </el-button>
        </div>

        <div class="groups-list">
          <div 
            v-for="group in availableGroups" 
            :key="group.id"
            class="group-item"
          >
            <div class="group-header">
              <div class="group-name">
                {{ group.name }}
                <el-tag size="small">{{ group.members }}人</el-tag>
              </div>
              <div class="group-actions">
                <el-button size="small" @click="editGroup(group)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteGroup(group)">删除</el-button>
              </div>
            </div>
            <div class="group-members-list">
              <el-tag 
                v-for="member in group.memberList || []" 
                :key="member.id"
                size="small"
                style="margin-right: 4px; margin-bottom: 4px;"
              >
                {{ member.name }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showGroupManager = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 创建/编辑编组对话框 -->
    <el-dialog
      v-model="showCreateGroup"
      :title="editingGroup ? '编辑编组' : '新建编组'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="groupForm" label-width="80px">
        <el-form-item label="编组名称">
          <el-input v-model="groupForm.name" placeholder="请输入编组名称" />
        </el-form-item>
        <el-form-item label="选择成员">
          <el-select
            v-model="groupForm.memberIds"
            multiple
            placeholder="选择编组成员"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="emp in availableEmployees"
              :key="emp.id"
              :label="`${emp.name} - ${emp.position || emp.department}`"
              :value="emp.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateGroup = false">取消</el-button>
        <el-button type="primary" @click="saveGroup">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, onActivated, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowLeft, Check, Warning, InfoFilled, Setting } from '@element-plus/icons-vue'
import api from '@/api'

// 响应式数据
const viewMode = ref('list') // 'list' | 'config'
const editingRoleId = ref<string | null>(null)
const saving = ref(false)
const rolesList = ref<any[]>([])
const availableEmployees = ref<any[]>([])
const availableGroups = ref<any[]>([])

// 编组管理相关
const showGroupManager = ref(false)

// 确保编组管理器打开时加载最新数据
watch(showGroupManager, (val) => {
  if (val) {
    console.log('打开编组管理器，重新加载编组数据');
    loadGroups();
  }
})
const showCreateGroup = ref(false)
const editingGroup = ref<any>(null)
const groupForm = reactive({
  name: '',
  memberIds: []
})

// 表单数据
const roleForm = reactive({
  name: '',
  description: '',
  shiftCategory: 'DAY_NIGHT', // 班次类别
  rotationType: 'DAILY_ROTATION',
  startTime: '08:00',
  endTime: '18:00',
  crossDay: false, // 是否跨日
  duration: 10,
  workDays: ['1', '2', '3', '4', '5'], // 默认工作日
  personnelType: 'single',
  selectedPersonnel: [],
  selectedGroups: []
})

// 表单验证规则
const roleRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  shiftCategory: [
    { required: true, message: '请选择班次类别', trigger: 'change' }
  ],
  rotationType: [
    { required: true, message: '请选择轮换方式', trigger: 'change' }
  ]
}

const roleFormRef = ref()

// 工作日和时间段定义
const weekDays = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '0', label: '周日' }
]

// 不同班次类别的时间段定义
const shiftCategorySlots = {
  'FULL_DAY': [
    { label: '全天', time: '00:00-24:00', start: 0, end: 24 }
  ],
  'DAY_NIGHT': [
    { label: '白班', time: '08:00-20:00', start: 8, end: 20 },
    { label: '夜班', time: '20:00-08:00', start: 20, end: 32 } // 32表示次日8点
  ],
  'MORNING_EVENING': [
    { label: '早班', time: '06:00-14:00', start: 6, end: 14 },
    { label: '晚班', time: '14:00-22:00', start: 14, end: 22 }
  ],
  'CUSTOM': [
    { label: '早班', time: '06:00-14:00', start: 6, end: 14 },
    { label: '白班', time: '08:00-18:00', start: 8, end: 18 },
    { label: '晚班', time: '14:00-22:00', start: 14, end: 22 },
    { label: '夜班', time: '22:00-06:00', start: 22, end: 30 }
  ]
}

// 计算属性
const currentTimeSlots = computed(() => {
  return shiftCategorySlots[roleForm.shiftCategory] || shiftCategorySlots['CUSTOM']
})

const dayGaps = computed(() => {
  const uncoveredDays = weekDays.filter(day => !isDayCovered(day.value))
  return uncoveredDays.map(d => d.label)
})

const timeGaps = computed(() => {
  const uncoveredSlots = currentTimeSlots.value.filter(slot => !isTimeSlotCovered(slot))
  return uncoveredSlots.map(s => s.label)
})

const getRotationTypeText = (type: string) => {
  const typeMap = {
    'DAILY_ROTATION': '每日轮换',
    'WEEKLY_ROTATION': '每周轮换',
    'CONTINUOUS': '连班模式'
  }
  return typeMap[type] || type
}

const getShiftCategoryText = (category: string) => {
  const categoryMap = {
    'FULL_DAY': '全天班',
    'DAY_NIGHT': '白夜班',
    'MORNING_EVENING': '早晚班',
    'CUSTOM': '自定义'
  }
  return categoryMap[category] || '白夜班'
}

const getShiftCategoryDescription = (category: string) => {
  const descriptions = {
    'FULL_DAY': '24小时连续值班，适用于全天候监控岗位',
    'DAY_NIGHT': '白班(8:00-20:00)和夜班(20:00-8:00)两班制',
    'MORNING_EVENING': '早班(6:00-14:00)和晚班(14:00-22:00)两班制',
    'CUSTOM': '自定义时间段，可灵活配置多个班次'
  }
  return descriptions[category] || ''
}

const formatTime = (time: any) => {
  if (!time) return '--'
  if (typeof time === 'string') return time
  return time.toTimeString().slice(0, 5)
}

const formatWorkDays = (workDays: string[]) => {
  if (!workDays || workDays.length === 0) return '无'
  const dayMap = {
    '0': '日', '1': '一', '2': '二', '3': '三',
    '4': '四', '5': '五', '6': '六'
  }
  return workDays.map(day => `周${dayMap[day]}`).join('、')
}

// 方法
const createNewRole = () => {
  resetForm()
  viewMode.value = 'config'
  editingRoleId.value = null
}

const editRole = (role: any) => {
  // 填充表单数据
  Object.assign(roleForm, {
    name: role.name,
    description: role.description || '',
    shiftCategory: role.extendedConfig?.shiftCategory || 'DAY_NIGHT',
    rotationType: role.extendedConfig?.rotationType || 'DAILY_ROTATION',
    startTime: role.extendedConfig?.timeConfig?.startTime || '08:00',
    endTime: role.extendedConfig?.timeConfig?.endTime || '18:00',
    crossDay: role.extendedConfig?.timeConfig?.crossDay || false,
    workDays: role.extendedConfig?.timeConfig?.workDays || ['1', '2', '3', '4', '5'],
    personnelType: role.extendedConfig?.personnelType || 'single',
    selectedPersonnel: role.extendedConfig?.selectedPersonnel || [],
    selectedGroups: role.extendedConfig?.selectedGroups || []
  })
  
  calculateDuration()
  viewMode.value = 'config'
  editingRoleId.value = role.id
}

const deleteRole = async (role: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除角色"${role.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 通过API删除
    await api.delete(`/shift-roles/${role.id}`)
    
    // 同时从本地存储删除以保持兼容性
    const existingRoles = JSON.parse(localStorage.getItem('shiftRoles') || '[]')
    const filteredRoles = existingRoles.filter(r => r.id !== role.id)
    localStorage.setItem('shiftRoles', JSON.stringify(filteredRoles))
    
    ElMessage.success('删除成功')
    loadRolesList()
  } catch {
    // 用户取消删除
  }
}

const backToList = () => {
  viewMode.value = 'list'
  editingRoleId.value = null
  resetForm()
}

const resetForm = () => {
  Object.assign(roleForm, {
    name: '',
    description: '',
    shiftCategory: 'DAY_NIGHT',
    rotationType: 'DAILY_ROTATION',
    startTime: '08:00',
    endTime: '18:00',
    crossDay: false,
    duration: 10,
    workDays: ['1', '2', '3', '4', '5'],
    personnelType: 'single',
    selectedPersonnel: [],
    selectedGroups: []
  })
}

const onShiftCategoryChange = () => {
  // 根据班次类别自动设置时间
  switch (roleForm.shiftCategory) {
    case 'FULL_DAY':
      roleForm.startTime = '00:00'
      roleForm.endTime = '00:00'
      roleForm.crossDay = true
      break
    case 'DAY_NIGHT':
      roleForm.startTime = '08:00'
      roleForm.endTime = '20:00'
      roleForm.crossDay = false
      break
    case 'MORNING_EVENING':
      roleForm.startTime = '06:00'
      roleForm.endTime = '14:00'
      roleForm.crossDay = false
      break
    case 'CUSTOM':
      // 保持当前设置
      break
  }
  calculateDuration()
}

const onRotationTypeChange = () => {
  // 轮换方式改变时的处理逻辑
}

const calculateDuration = () => {
  if (roleForm.startTime && roleForm.endTime) {
    const start = parseTime(roleForm.startTime)
    const end = parseTime(roleForm.endTime)
    
    let duration = 0
    if (roleForm.crossDay) {
      // 跨日计算：24 - 开始时间 + 结束时间
      duration = (24 - start) + end
    } else {
      // 同日计算
      duration = end - start
      if (duration <= 0) {
        // 如果结束时间早于开始时间，提示用户勾选次日
        duration = 0
      }
    }
    
    roleForm.duration = Math.max(0, Math.round(duration * 10) / 10)
  }
}

const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours + minutes / 60
}

const setTimePreset = (preset: string) => {
  switch (preset) {
    case '24h':
      roleForm.startTime = '00:00'
      roleForm.endTime = '00:00'
      roleForm.crossDay = true
      break
    case 'day':
      roleForm.startTime = '08:00'
      roleForm.endTime = '18:00'
      roleForm.crossDay = false
      break
    case 'night':
      roleForm.startTime = '18:00'
      roleForm.endTime = '08:00'
      roleForm.crossDay = true
      break
  }
  calculateDuration()
}

const setWorkDaysPreset = (preset: string) => {
  switch (preset) {
    case 'weekdays':
      roleForm.workDays = ['1', '2', '3', '4', '5']
      break
    case 'weekends':
      roleForm.workDays = ['6', '0']
      break
    case 'all':
      roleForm.workDays = ['1', '2', '3', '4', '5', '6', '0']
      break
  }
}

const saveRole = async () => {
  try {
    await roleFormRef.value?.validate()
    saving.value = true
    
    // 构建保存数据
    const roleData = {
      id: editingRoleId.value || Date.now().toString(),
      name: roleForm.name,
      description: roleForm.description,
      isActive: true,
      assignmentType: roleForm.personnelType === 'single' ? 'SINGLE' : 'GROUP',
      selectionCriteria: {
        byPosition: [], // 可以根据需要扩展
        byTags: [],
        byDepartment: []
      },
      isRequired: true,
      sortOrder: 0,
      extendedConfig: {
        shiftCategory: roleForm.shiftCategory,
        rotationType: roleForm.rotationType,
        timeConfig: {
          startTime: roleForm.startTime,
          endTime: roleForm.endTime,
          crossDay: roleForm.crossDay,
          workDays: roleForm.workDays
        },
        personnelType: roleForm.personnelType,
        selectedPersonnel: roleForm.selectedPersonnel,
        selectedGroups: roleForm.selectedGroups,
        rotationOrder: roleForm.selectedPersonnel.map(id => ({ key: id })) // 转换为后端期望的格式
      }
    }
    

    
    // 通过API保存到数据库
    let response
    if (editingRoleId.value) {
      // 更新现有角色
      console.log('更新现有角色:', editingRoleId.value)
      response = await api.put(`/shift-roles/${editingRoleId.value}`, roleData)
    } else {
      // 创建新角色
      console.log('创建新角色')
      response = await api.post('/shift-roles', roleData)
      // 设置新创建角色的ID
      if (response.data && response.data.id) {
        roleData.id = response.data.id
      }
    }
    
    console.log('API响应:', response.data)
    
    // 同时保存到本地存储以保持兼容性
    const existingRoles = JSON.parse(localStorage.getItem('shiftRoles') || '[]')
    
    if (editingRoleId.value) {
      // 更新现有角色
      const index = existingRoles.findIndex(r => r.id === editingRoleId.value)
      if (index !== -1) {
        existingRoles[index] = roleData
      }
    } else {
      // 添加新角色
      existingRoles.push(roleData)
    }
    
    localStorage.setItem('shiftRoles', JSON.stringify(existingRoles))
    
    ElMessage.success(editingRoleId.value ? '更新成功' : '创建成功')
    loadRolesList() // 重新加载列表
    resetForm() // 重置表单，方便继续创建
    editingRoleId.value = null
  } catch (error) {
    console.error('API保存失败，尝试降级到localStorage:', error)
    
    // 显示具体的错误信息
    let errorMessage = 'API保存失败，已降级到本地存储'
    if (error.response?.data?.message) {
      errorMessage = `API保存失败: ${error.response.data.message}，已降级到本地存储`
    } else if (error.response?.data?.error) {
      errorMessage = `API保存失败: ${error.response.data.error}，已降级到本地存储`
    } else if (error.message) {
      errorMessage = `API保存失败: ${error.message}，已降级到本地存储`
    }
    
    console.log('详细错误信息:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    })
    
    // 降级到localStorage保存
    try {
      const existingRoles = JSON.parse(localStorage.getItem('shiftRoles') || '[]')
      
      if (editingRoleId.value) {
        // 更新现有角色
        const index = existingRoles.findIndex(r => r.id === editingRoleId.value)
        if (index !== -1) {
          existingRoles[index] = roleData
        }
      } else {
        // 添加新角色
        roleData.id = Date.now().toString() // 生成临时ID
        existingRoles.push(roleData)
      }
      
      localStorage.setItem('shiftRoles', JSON.stringify(existingRoles))
      
      ElMessage.warning(errorMessage)
      loadRolesList() // 重新加载列表
      resetForm() // 重置表单
      editingRoleId.value = null
    } catch (localError) {
      console.error('localStorage保存也失败:', localError)
      ElMessage.error('保存完全失败，请检查数据格式')
    }
  } finally {
    saving.value = false
  }
}

const loadRolesList = async () => {
  try {
    // 从API加载角色列表
    const response = await api.get('/shift-roles')
    rolesList.value = response.data || []
    
    // 同时更新本地存储以保持兼容性
    localStorage.setItem('shiftRoles', JSON.stringify(rolesList.value))
    
    console.log('加载角色列表:', rolesList.value)
  } catch (error) {
    console.error('从API加载角色列表失败，尝试从本地存储加载:', error)
    
    // API失败时从本地存储加载
    try {
      const savedRoles = JSON.parse(localStorage.getItem('shiftRoles') || '[]')
      rolesList.value = savedRoles
      console.log('从本地存储加载角色列表:', rolesList.value)
    } catch (localError) {
      console.error('从本地存储加载也失败:', localError)
      ElMessage.error('加载角色列表失败')
      rolesList.value = []
    }
  }
}

// 覆盖分析方法
const isDayCovered = (dayValue: string) => {
  return rolesList.value.some(role => 
    role.extendedConfig?.timeConfig?.workDays?.includes(dayValue)
  )
}

const isTimeSlotCovered = (slot: any) => {
  return rolesList.value.some(role => {
    const config = role.extendedConfig?.timeConfig
    if (!config) return false
    
    const roleStart = parseTime(config.startTime)
    const roleEnd = config.crossDay ? parseTime(config.endTime) + 24 : parseTime(config.endTime)
    const slotStart = slot.start
    const slotEnd = slot.end > 24 ? slot.end : slot.end
    
    // 检查时间段是否有重叠
    return (roleStart <= slotStart && roleEnd >= slotEnd) || 
           (roleStart <= slotStart && roleEnd > slotStart) ||
           (roleStart < slotEnd && roleEnd >= slotEnd)
  })
}

const isRoleTimeSlotCovered = (role: any, slot: any) => {
  const config = role.extendedConfig?.timeConfig
  if (!config) return false
  
  const roleStart = parseTime(config.startTime)
  const roleEnd = config.crossDay ? parseTime(config.endTime) + 24 : parseTime(config.endTime)
  const slotStart = slot.start
  const slotEnd = slot.end > 24 ? slot.end : slot.end
  
  // 检查时间段是否有重叠
  return (roleStart <= slotStart && roleEnd >= slotEnd) || 
         (roleStart <= slotStart && roleEnd > slotStart) ||
         (roleStart < slotEnd && roleEnd >= slotEnd)
}

const getCurrentTimeSlots = (category: string) => {
  return shiftCategorySlots[category] || shiftCategorySlots['CUSTOM']
}

const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    availableEmployees.value = response.data || []
    console.log('加载员工数据:', availableEmployees.value)
  } catch (error) {
    console.error('加载员工列表失败:', error)
    // 提供一些测试数据，包含岗位信息
    availableEmployees.value = [
      { id: 1, name: '张三', department: '技术部', position: '高级工程师' },
      { id: 2, name: '李四', department: '运营部', position: '运营专员' },
      { id: 3, name: '王五', department: '技术部', position: '前端工程师' },
      { id: 4, name: '赵六', department: '管理部', position: '项目经理' },
      { id: 5, name: '钱七', department: '技术部', position: '后端工程师' },
      { id: 6, name: '孙八', department: '运营部', position: '产品经理' },
      { id: 7, name: '周九', department: '技术部', position: '测试工程师' }
    ]
  }
}

const loadGroups = async () => {
  try {
    console.log('开始从API加载编组数据...');
    // 使用GroupManagement.vue中相同的API路径
    const response = await api.get('/group')
    console.log('API响应:', response.data);
    if (response.data && response.data.length > 0) {
      console.log('API返回编组数量:', response.data.length);
      // 只保留用户创建的编组（过滤掉系统预设分组）
      availableGroups.value = response.data.filter(group =>
        !['管理组', '技术组'].includes(group.name)
      )
      console.log('用户创建的编组数量:', availableGroups.value.length);
      // 同时更新本地存储以保持兼容性
      localStorage.setItem('groups', JSON.stringify(availableGroups.value))
      console.log('编组数据已保存到localStorage');
    } else {
      console.log('API返回空编组列表');
    }
  } catch (error: any) {
    console.log('Groups API不可用，使用本地数据', error);
    // API失败时，从localStorage加载编组数据
    try {
      console.log('尝试从localStorage加载编组数据...');
      // 使用GroupManagement.vue中相同的localStorage键名
      const savedGroups = JSON.parse(localStorage.getItem('groups') || '[]')
      console.log('localStorage中编组数据:', savedGroups);
      if (savedGroups.length > 0) {
        console.log('localStorage中编组数量:', savedGroups.length);
        // 只保留用户创建的编组
        availableGroups.value = savedGroups.filter(group =>
          !['管理组', '技术组'].includes(group.name)
        )
        console.log('用户创建的编组数量:', availableGroups.value.length);
      } else {
        console.log('localStorage中没有编组数据');
        availableGroups.value = [] // 没有有效数据时设为空数组
      }
    } catch (localError) {
      console.error('加载本地编组数据失败:', localError)
      availableGroups.value = []
    }
  }
  

  
  // 确保不再使用硬编码的测试数据
  if (availableGroups.value.length === 0) {
    console.log('没有找到用户创建的编组');
    // 不再提供测试数据
  }
}

// 编组管理方法 - 使用实时数据确保一致性
const getGroupName = (groupId: number) => {
  // 优先从当前编组数据中查找
  const localGroup = availableGroups.value.find(g => g.id === groupId);
  if (localGroup) return localGroup.name;
  
  // 后备：从localStorage加载最新数据
  try {
    const savedGroups = JSON.parse(localStorage.getItem('groups') || '[]');
    const group = savedGroups.find((g: any) => g.id === groupId);
    return group?.name || `编组${groupId}`;
  } catch {
    return `编组${groupId}`;
  }
}

const getGroupMemberCount = (groupId: number) => {
  // 优先从当前编组数据中查找
  const localGroup = availableGroups.value.find(g => g.id === groupId);
  if (localGroup) return localGroup.memberIds?.length || localGroup.members || 0;
  
  // 后备：从localStorage加载最新数据
  try {
    const savedGroups = JSON.parse(localStorage.getItem('groups') || '[]');
    const group = savedGroups.find((g: any) => g.id === groupId);
    return group?.memberIds?.length || group?.members || 0;
  } catch {
    return 0;
  }
}

const getGroupMembers = (groupId: number) => {
  // 优先从当前编组数据中查找
  const localGroup = availableGroups.value.find(g => g.id === groupId);
  if (localGroup && localGroup.memberList) return localGroup.memberList;
  
  // 后备：从localStorage加载最新数据
  try {
    const savedGroups = JSON.parse(localStorage.getItem('groups') || '[]');
    const group = savedGroups.find((g: any) => g.id === groupId);
    
    if (group) {
      // 重构成员列表
      return group.memberIds?.map((id: number) => {
        const emp = availableEmployees.value.find(e => e.id === id);
        return emp ? { id, name: emp.name } : { id, name: `员工${id}` };
      }) || [];
    }
    return [];
  } catch {
    return [];
  }
}

const editGroup = (group: any) => {
  editingGroup.value = group
  groupForm.name = group.name
  groupForm.memberIds = group.memberList?.map(m => m.id) || []
  showCreateGroup.value = true
}

const deleteGroup = async (group: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除编组"${group.name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 从列表中删除
    const index = availableGroups.value.findIndex(g => g.id === group.id)
    if (index !== -1) {
      availableGroups.value.splice(index, 1)
    }
    
    ElMessage.success('删除成功')
  } catch {
    // 用户取消删除
  }
}

const saveGroup = () => {
  if (!groupForm.name.trim()) {
    ElMessage.error('请输入编组名称')
    return
  }
  
  if (groupForm.memberIds.length === 0) {
    ElMessage.error('请选择编组成员')
    return
  }
  
  const memberList = availableEmployees.value.filter(emp => 
    groupForm.memberIds.includes(emp.id)
  ).map(emp => ({ id: emp.id, name: emp.name }))
  
  const groupData = {
    id: editingGroup.value?.id || Date.now(),
    name: groupForm.name,
    members: memberList.length,
    memberList: memberList
  }
  
  if (editingGroup.value) {
    // 更新现有编组
    const index = availableGroups.value.findIndex(g => g.id === editingGroup.value.id)
    if (index !== -1) {
      availableGroups.value[index] = groupData
    }
  } else {
    // 添加新编组
    availableGroups.value.push(groupData)
  }
  
  // 重置表单
  groupForm.name = ''
  groupForm.memberIds = []
  editingGroup.value = null
  showCreateGroup.value = false
  
  ElMessage.success(editingGroup.value ? '更新成功' : '创建成功')
}

// 生命周期
onMounted(() => {
  loadRolesList()
  loadEmployees()
  loadGroups()
})

// 添加 onActivated 钩子
onActivated(() => {
  console.log('组件被激活，重新加载编组数据');
  loadGroups();
});
</script>

<style lang="scss" scoped>
.improved-shift-role-management {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.roles-list-container {
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
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
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    
    .role-info {
      flex: 1;
      
      .role-name {
        font-size: 16px;
        font-weight: 500;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .role-summary {
        color: #86909c;
        font-size: 14px;
        margin-bottom: 4px;
      }
      
      .role-description {
        color: #4e5969;
        font-size: 14px;
      }
    }
    
    .role-actions {
      display: flex;
      gap: 8px;
    }
  }
}

.config-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
      
      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
      }
    }
    
    .header-right {
      display: flex;
      align-items: center;
    }
  }
  
  .config-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .role-form {
      flex: 1;
      display: flex;
      gap: 20px;
      
      .form-left,
      .form-right {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .config-section {
        .el-card__body {
          padding: 16px;
        }
      }
    }
  }
  
  .time-config {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .time-separator {
      color: #86909c;
    }
  }
  
  .time-info {
    margin: 8px 0;
  }
  
  .time-presets,
  .workdays-presets {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }
  
  .unit {
    margin-left: 8px;
    color: #86909c;
  }
  
  .continuous-description {
    background-color: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: 6px;
    padding: 12px;
    
    p {
      margin: 0;
      color: #0369a1;
      font-size: 13px;
      line-height: 1.5;
      
      &:not(:last-child) {
        margin-bottom: 6px;
      }
    }
  }
  
  .preview-info {
    margin-top: 16px;
    
    .preview-item {
      margin-bottom: 8px;
      font-size: 14px;
      
      strong {
        color: #1f2329;
      }
    }
  }
  
  .category-description {
    margin-top: 8px;
  }

  .analysis-section {
    margin-top: 20px;
    
    .analysis-card {
      height: 280px;
      
      .el-card__body {
        height: calc(100% - 57px);
        overflow-y: auto;
      }
      
      &.roles-coverage-card {
        height: 320px;
      }
    }
    
    .empty-hint {
      text-align: center;
      padding: 40px 0;
      color: #86909c;
    }
    
    .roles-coverage-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      
      .role-coverage-item {
        border: 1px solid #e4e7ed;
        border-radius: 6px;
        padding: 12px;
        background-color: #fafafa;
        
        .role-header {
          margin-bottom: 8px;
          
          .role-name {
            font-weight: 500;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .role-category {
            font-size: 12px;
            color: #86909c;
          }
        }
        
        .coverage-row {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
          
          .coverage-label {
            font-size: 12px;
            color: #4e5969;
            width: 50px;
            flex-shrink: 0;
          }
        }
        
        .day-coverage-mini {
          display: flex;
          gap: 4px;
          
          .day-item-mini {
            width: 20px;
            height: 20px;
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 500;
            
            &.covered {
              background-color: #f0f9ff;
              color: #1890ff;
              border: 1px solid #91d5ff;
            }
            
            &.uncovered {
              background-color: #fff7e6;
              color: #fa8c16;
              border: 1px solid #ffd591;
            }
          }
        }
        
        .time-coverage-mini {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          
          .time-slot-mini {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            
            &.covered {
              background-color: #f6ffed;
              color: #52c41a;
              border: 1px solid #b7eb8f;
            }
            
            &.uncovered {
              background-color: #fff2e8;
              color: #fa541c;
              border: 1px solid #ffbb96;
            }
          }
        }
        
        .role-time-info {
          font-size: 11px;
          color: #86909c;
          margin-top: 4px;
        }
      }
    }
    
    .roles-summary {
      .role-summary-item {
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;
        
        &:last-child {
          border-bottom: none;
        }
        
        .role-summary-name {
          font-weight: 500;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .role-summary-detail {
          font-size: 12px;
          color: #86909c;
        }
      }
    }
    
    .coverage-analysis {
      .coverage-section {
        margin-bottom: 16px;
        
        h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 500;
          color: #1f2329;
        }
      }
      
      .day-coverage {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        
        .day-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          
          &.covered {
            background-color: #f0f9ff;
            color: #1890ff;
            
            .check-icon {
              color: #52c41a;
            }
          }
          
          &.uncovered {
            background-color: #fff7e6;
            color: #fa8c16;
            
            .warning-icon {
              color: #fa8c16;
            }
          }
          
          .day-name {
            font-weight: 500;
          }
        }
      }
      
      .time-coverage {
        .time-slots {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          
          .time-slot {
            padding: 8px;
            border-radius: 4px;
            text-align: center;
            font-size: 12px;
            
            &.covered {
              background-color: #f6ffed;
              border: 1px solid #b7eb8f;
              color: #52c41a;
            }
            
            &.uncovered {
              background-color: #fff2e8;
              border: 1px solid #ffbb96;
              color: #fa541c;
            }
            
            small {
              display: block;
              margin-top: 2px;
              opacity: 0.8;
            }
          }
        }
      }
      
      .coverage-suggestions {
        margin-top: 12px;
        
        h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 500;
          color: #fa8c16;
        }
        
        .gap-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
      }
    }
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e4e7ed;
  }
  
  .selected-groups-detail {
    margin-top: 16px;
    
    .group-detail-item {
      margin-bottom: 12px;
      padding: 8px;
      background-color: #f8f9fa;
      border-radius: 4px;
      
      .group-info {
        margin-bottom: 6px;
        
        .member-count {
          color: #86909c;
          font-size: 12px;
        }
      }
      
      .group-members {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
    }
  }
}

// 编组管理样式
.group-manager {
  .group-manager-header {
    margin-bottom: 16px;
  }
  
  .groups-list {
    max-height: 400px;
    overflow-y: auto;
    
    .group-item {
      border: 1px solid #e4e7ed;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      
      .group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        
        .group-name {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .group-actions {
          display: flex;
          gap: 8px;
        }
      }
      
      .group-members-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .config-content .role-form {
    flex-direction: column;
    
    .form-left,
    .form-right {
      flex: none;
    }
  }
  
  .analysis-section {
    .el-col {
      margin-bottom: 16px;
    }
  }
}
</style>