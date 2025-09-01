<template>
  <div class="shift-role-management">
    <div class="page-header">
      <h1>值班角色配置</h1>
      <p class="subtitle">配置值班角色、时间安排和人员排序</p>
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
              {{ getTypeLabel(role.extendedConfig?.type) }} | 
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
            <el-input v-model="roleForm.name" placeholder="如：值班医生、安保人员" />
          </el-form-item>
          <el-form-item label="角色描述" prop="description">
            <el-input 
              v-model="roleForm.description" 
              type="textarea" 
              :rows="3"
              placeholder="请输入角色职责和要求"
            />
          </el-form-item>
          <el-form-item label="值班类型" prop="type">
            <el-select v-model="roleForm.type" placeholder="请选择值班类型" @change="onTypeChange">
              <el-option label="全天值班" value="fullday" />
              <el-option label="白班" value="day" />
              <el-option label="夜班" value="night" />
              <el-option label="早班" value="morning" />
              <el-option label="晚班" value="evening" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <!-- 步骤2: 时间设置 -->
      <div v-if="currentStep === 1" class="step-panel">
        <h2>时间设置</h2>
        <div class="time-config">
          <el-form :model="roleForm.timeConfig" label-width="120px">
            <!-- 值班日期选择 -->
            <el-form-item label="值班日期">
              <el-checkbox-group v-model="roleForm.timeConfig.workDays" @change="onWorkDaysChange">
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
            
            <!-- 值班频率 -->
            <el-form-item label="值班频率">
              <el-radio-group v-model="roleForm.timeConfig.frequency">
                <el-radio label="daily">每天值班</el-radio>
                <el-radio label="alternate">隔天值班</el-radio>
                <el-radio label="weekly">每周值班</el-radio>
                <el-radio label="custom">自定义间隔</el-radio>
              </el-radio-group>
            </el-form-item>
            
            <el-form-item v-if="roleForm.timeConfig.frequency === 'custom'" label="间隔天数">
              <el-input-number 
                v-model="roleForm.timeConfig.customInterval" 
                :min="1" 
                :max="30"
              />
              <span class="unit">天</span>
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
            <el-radio-group v-model="roleForm.personnelType" @change="onPersonnelTypeChange">
              <el-radio label="single">单人值班</el-radio>
              <el-radio label="group">编组值班</el-radio>
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
            
            <div class="group-config-section">
              <el-form label-width="120px">
                <el-form-item label="每组人数">
                  <el-input-number 
                    v-model="roleForm.groupSize" 
                    :min="2" 
                    :max="10"
                    @change="onGroupSizeChange"
                  />
                  <span class="unit">人/组</span>
                </el-form-item>
              </el-form>
              
              <div class="groups-management">
                <div 
                  v-for="(group, groupIndex) in roleForm.groups" 
                  :key="groupIndex"
                  class="group-card"
                >
                  <el-card>
                    <template #header>
                      <div class="group-header">
                        <span>第{{ groupIndex + 1 }}组</span>
                        <el-button 
                          type="danger" 
                          size="small" 
                          @click="removeGroup(groupIndex)"
                          :disabled="roleForm.groups.length <= 1"
                        >
                          删除组
                        </el-button>
                      </div>
                    </template>
                    
                    <div class="group-members">
                      <div 
                        v-for="(member, memberIndex) in group.members" 
                        :key="memberIndex"
                        class="member-slot"
                      >
                        <div v-if="member" class="selected-member">
                          <el-avatar :size="32" :src="member.avatar">{{ member.label.charAt(0) }}</el-avatar>
                          <span>{{ member.label }}</span>
                          <el-button type="text" size="small" @click="removeMemberFromGroup(groupIndex, memberIndex)">×</el-button>
                        </div>
                        <div v-else class="empty-slot" @click="showMemberSelector(groupIndex, memberIndex)">
                          <el-icon><Plus /></el-icon>
                          <span>选择人员</span>
                        </div>
                      </div>
                    </div>
                  </el-card>
                </div>
                
                <el-button type="dashed" @click="addNewGroup" class="add-group-btn">
                  <el-icon><Plus /></el-icon>
                  添加新组
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤4: 排班规则 -->
      <div v-if="currentStep === 3" class="step-panel">
        <h2>排班规则</h2>
        <div class="rules-config">
          <el-form :model="roleForm.rules" label-width="120px">
            <!-- 基础规则 -->
            <el-form-item label="排班周期">
              <el-select v-model="roleForm.rules.cycle">
                <el-option label="按周排班" value="weekly" />
                <el-option label="按月排班" value="monthly" />
              </el-select>
              <el-text type="info" style="margin-left: 10px;">
                {{ roleForm.rules.cycle === 'weekly' ? '每周生成一次排班表' : '每月生成一次排班表' }}
              </el-text>
            </el-form-item>
            
            <el-form-item label="轮换方式">
              <el-select v-model="roleForm.rules.rotationType">
                <el-option label="顺序轮换" value="sequential" />
                <el-option label="随机轮换" value="random" />
                <el-option label="负载均衡" value="balanced" />
              </el-select>
              <el-text type="info" style="margin-left: 10px;">
                按照设定顺序依次轮换
              </el-text>
            </el-form-item>
            
            <el-form-item label="连班设置">
              <div class="consecutive-setting">
                <el-checkbox v-model="roleForm.rules.enableConsecutive">启用连班模式</el-checkbox>
                <el-button 
                  type="info" 
                  link 
                  size="small" 
                  @click="showConsecutiveHelp"
                  style="margin-left: 10px;"
                >
                  <el-icon><QuestionFilled /></el-icon>
                  连班设置说明
                </el-button>
              </div>
              <el-text type="info" style="display: block; margin-top: 8px;">
                适用于周末值班、节假日值班等需要同一人连续多天值班的场景
              </el-text>
            </el-form-item>
            
            <div v-if="roleForm.rules.enableConsecutive" class="consecutive-config">
              <el-alert 
                title="连班模式说明" 
                type="info" 
                :closable="false"
                style="margin-bottom: 16px;"
              >
                启用连班模式后，系统将按照时间设置中的工作日安排同一人连续值班，然后轮换到下一个人员。
              </el-alert>
              
              <el-form-item label="连续值班天数">
                <el-input-number 
                  v-model="roleForm.rules.consecutiveDays" 
                  :min="1" 
                  :max="7"
                />
                <span class="unit">天</span>
                <el-text type="info" style="margin-left: 10px;">同一人连续值班的天数，建议不超过3天</el-text>
              </el-form-item>
            </div>
            
            <!-- 高级轮换规则 - 暂时注释以排查问题 -->
            <!--
            <el-form-item label="高级轮换">
              <el-checkbox v-model="roleForm.rules.advancedRotation.enabled">启用高级轮换规则</el-checkbox>
            </el-form-item>
            -->

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
              <el-descriptions-item label="值班类型">{{ getTypeDisplayName(roleForm.type) }}</el-descriptions-item>
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
              <el-descriptions-item label="值班频率">{{ getFrequencyText(roleForm.timeConfig.frequency) }}</el-descriptions-item>
              <el-descriptions-item v-if="roleForm.timeConfig.frequency === 'custom'" label="间隔天数">{{ roleForm.timeConfig.customInterval }}天</el-descriptions-item>
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
                    <div 
                      v-for="(group, index) in roleForm.groups" 
                      :key="index"
                      class="group-preview"
                    >
                      <strong>第{{ index + 1 }}组：</strong>
                      <el-tag 
                        v-for="member in group.members.filter(m => m)" 
                        :key="member.key"
                        size="small"
                        style="margin-left: 4px;"
                      >
                        {{ member.label }}
                      </el-tag>
                    </div>
                  </div>
                </el-descriptions-item>
              </template>
            </el-descriptions>
            
            <el-descriptions title="排班规则" :column="2" border style="margin-top: 20px;">
              <el-descriptions-item label="排班周期">{{ getCycleText(roleForm.rules.cycle) }}</el-descriptions-item>
              <el-descriptions-item label="轮换方式">{{ getRotationText(roleForm.rules.rotationType) }}</el-descriptions-item>
              <el-descriptions-item v-if="roleForm.rules.enableConsecutive" label="连续值班天数">{{ roleForm.rules.consecutiveDays }}天</el-descriptions-item>
              <el-descriptions-item label="节假日处理">{{ getHolidayText(roleForm.rules.holidayHandling) }}</el-descriptions-item>
              <el-descriptions-item v-if="roleForm.rules.specialRequirements" label="特殊要求" :span="2">
                {{ roleForm.rules.specialRequirements }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </div>
    </div> <!-- 闭合 step-content -->
  </div> <!-- 闭合 main-container -->

    <!-- 成员选择对话框 -->
    <el-dialog 
      v-model="memberSelectorVisible" 
      title="选择组员" 
      width="600px"
    >
      <div class="member-selector">
        <div v-if="getAvailableEmployeesForGroup().length === 0" class="no-available">
          <el-empty description="没有可用的员工">
            <el-button @click="memberSelectorVisible = false">关闭</el-button>
          </el-empty>
        </div>
        <div v-else class="available-members">
          <div 
            v-for="employee in getAvailableEmployeesForGroup()" 
            :key="employee.key"
            class="member-option"
            @click="selectMember(employee)"
          >
            <el-avatar :size="40" :src="employee.avatar">
              {{ employee.label.charAt(0) }}
            </el-avatar>
            <div class="member-info">
              <div class="member-name">{{ employee.label }}</div>
              <div class="member-details">{{ employee.position || employee.department || '未知岗位' }}</div>
            </div>
            <el-button type="primary" size="small">选择</el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="memberSelectorVisible = false">取消</el-button>
      </template>
    </el-dialog>

  </div> <!-- 闭合 shift-role-management -->
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { Plus, Delete, Edit, ArrowLeft, QuestionFilled } from '@element-plus/icons-vue'
import api from '@/api'

const router = useRouter()

// 步骤配置
const steps = [
  { title: '基础信息', key: 'basic' },
  { title: '时间设置', key: 'time' },
  { title: '人员配置', key: 'personnel' },
  { title: '排班规则', key: 'rules' },
  { title: '预览确认', key: 'preview' }
]

// 视图模式：'list' 显示角色列表，'config' 显示配置界面
const viewMode = ref('list')
const currentStep = ref(0)
const activeRuleTab = ref('basic')
const activePreviewTab = ref('overview')
const saving = ref(false)
const loading = ref(false)

// 角色列表数据
const rolesList = ref([])
const editingRoleId = ref(null)

// 表单数据
const roleForm = reactive({
  name: '',
  description: '',
  type: 'fullday',
  timeConfig: {
    startTime: new Date(2024, 0, 1, 0, 0),
    endTime: new Date(2024, 0, 1, 23, 59),
    duration: 24,
    workDays: ['1', '2', '3', '4', '5'], // 默认工作日
    frequency: 'daily', // 值班频率：daily, alternate, weekly, custom
    customInterval: 2 // 自定义间隔天数
  },
  personnelType: 'single', // 'single' 或 'group'
  rotationOrder: [], // 单人值班顺序
  groupSize: 3, // 每组人数
  groups: [], // 编组信息
  rules: {
    cycle: 'weekly', // 排班周期：weekly, monthly
    rotationType: 'sequential', // 轮换方式：sequential, random, balanced
    maxConsecutiveDays: 3, // 最大连续工作天数
    holidayHandling: 'normal', // 节假日处理：normal, skip, double
    specialRequirements: '', // 特殊要求
    // 连班相关配置
    enableConsecutive: false, // 是否启用连班模式
    consecutiveDays: 3, // 连续值班天数
    // 高级轮换规则
    advancedRotation: {
      enabled: false, // 是否启用高级轮换
      type: 'mixed', // mixed: 混合模式, weekly_group: 按周编组
      weekdayRule: 'daily', // 工作日规则：daily(每日换), consecutive(连续)
      weekendRule: 'consecutive', // 周末规则：daily(每日换), consecutive(连续), same_person(同一人)
      groupRotationWeeks: 1 // 编组轮换周期（周）
    }
  }
})

// 拖拽相关
const draggedIndex = ref(-1)

// 表单验证规则
const roleRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择值班类型', trigger: 'change' }
  ]
}

// 可用员工列表
const availableEmployees = ref([])
const schedulePreview = ref([])
const previewDate = ref(new Date())

const roleFormRef = ref()

// 加载员工数据
const loadEmployees = async () => {
  try {
    // 使用配置好的API实例，包含baseURL和认证头
    const response = await api.get('/employees')
    const employees = response.data
    
    availableEmployees.value = employees.map(emp => {
      // 优先使用关联的岗位信息，然后是字符串字段
      const position = emp.positionInfo?.name || 
                      emp.organizationNode?.name || 
                      emp.organizationPosition || 
                      emp.position || 
                      emp.department || 
                      '未分配岗位';
      
      const department = emp.departmentInfo?.name || emp.department || '未知部门';
      
            return {
        key: emp.id,
        label: `${emp.name} (${position})`,
        disabled: false,
        avatar: emp.avatar || null,
        department: department,
        position: position
      };
    })
    
      } catch (error) {
    console.error('加载员工数据失败:', error)
    ElMessage.error(`加载员工数据失败: ${error.response?.data?.message || error.message}`)
  }
}

// 加载角色列表
const loadRolesList = async () => {
  try {
    loading.value = true
    const response = await api.get('/shift-roles')
    rolesList.value = response.data || []
      } catch (error) {
    console.error('加载角色列表失败:', error)
    ElMessage.error(`加载角色列表失败: ${error.response?.data?.message || error.message}`)
  } finally {
    loading.value = false
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
      ElMessage.error(`删除角色失败: ${error.response?.data?.message || error.message}`)
    }
  }
}

// 返回列表
const backToList = () => {
  viewMode.value = 'list'
  resetForm()
}

// 将角色数据加载到表单
const loadRoleToForm = (role) => {
  const config = role.extendedConfig || {}
  
  Object.assign(roleForm, {
    name: role.name || '',
    description: role.description || '',
    type: config.type || 'fullday',
    timeConfig: {
      startTime: config.timeConfig?.startTime ? new Date(config.timeConfig.startTime) : new Date(2024, 0, 1, 0, 0),
      endTime: config.timeConfig?.endTime ? new Date(config.timeConfig.endTime) : new Date(2024, 0, 1, 23, 59),
      duration: config.timeConfig?.duration || 24,
      workDays: config.timeConfig?.workDays || ['1', '2', '3', '4', '5'],
      frequency: config.timeConfig?.frequency || 'daily',
      customInterval: config.timeConfig?.customInterval || 2
    },
    personnelType: config.personnelType || 'single',
    rotationOrder: config.rotationOrder || [],
    groupSize: config.groupSize || 3,
    groups: config.groups || [],
    rules: {
      cycle: config.rules?.cycle || 'weekly',
      rotationType: config.rules?.rotationType || 'sequential',
      maxConsecutiveDays: config.rules?.maxConsecutiveDays || 3,
      holidayHandling: config.rules?.holidayHandling || 'normal',
      specialRequirements: config.rules?.specialRequirements || ''
    }
  })
}

// 重置表单
const resetForm = () => {
  Object.assign(roleForm, {
    name: '',
    description: '',
    type: 'fullday',
    timeConfig: {
      startTime: new Date(2024, 0, 1, 0, 0),
      endTime: new Date(2024, 0, 1, 23, 59),
      duration: 24,
      workDays: ['1', '2', '3', '4', '5'],
      frequency: 'daily',
      customInterval: 2
    },
    personnelType: 'single',
    rotationOrder: [],
    groupSize: 3,
    groups: [],
    rules: {
      cycle: 'weekly',
      rotationType: 'sequential',
      maxConsecutiveDays: 3,
      holidayHandling: 'normal',
      specialRequirements: ''
    }
  })
}

// 步骤导航
const goToStep = (step) => {
  if (step <= currentStep.value || canProceedToNext()) {
    currentStep.value = step
  }
}

const nextStep = () => {
  if (canProceedToNext()) {
    currentStep.value++
    if (currentStep.value === 4) {
      generatePreview()
    }
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 值班类型变化处理
const onTypeChange = (type) => {
  const timePresets = {
    fullday: { start: [0, 0], end: [23, 59], duration: 24, workDays: ['1', '2', '3', '4', '5', '6', '0'] },
    day: { start: [8, 0], end: [18, 0], duration: 10, workDays: ['1', '2', '3', '4', '5'] },
    night: { start: [22, 0], end: [6, 0], duration: 8, workDays: ['1', '2', '3', '4', '5'] },
    morning: { start: [6, 0], end: [14, 0], duration: 8, workDays: ['1', '2', '3', '4', '5'] },
    evening: { start: [14, 0], end: [22, 0], duration: 8, workDays: ['1', '2', '3', '4', '5'] }
  }
  
  const preset = timePresets[type]
  if (preset) {
    roleForm.timeConfig.startTime = new Date(2024, 0, 1, preset.start[0], preset.start[1])
    roleForm.timeConfig.endTime = new Date(2024, 0, 1, preset.end[0], preset.end[1])
    roleForm.timeConfig.duration = preset.duration
    roleForm.timeConfig.workDays = [...preset.workDays]
  }
}

// 计算工作时长
const calculateDuration = () => {
  if (!roleForm.timeConfig.startTime || !roleForm.timeConfig.endTime) return
  
  const start = roleForm.timeConfig.startTime
  const end = roleForm.timeConfig.endTime
  
  let duration = (end.getHours() - start.getHours()) + (end.getMinutes() - start.getMinutes()) / 60
  
  // 处理跨天的情况（如夜班）
  if (duration <= 0) {
    duration += 24
  }
  
  roleForm.timeConfig.duration = Math.round(duration * 10) / 10 // 保留一位小数
}

// 工作日变化处理
const onWorkDaysChange = (value) => {
  }

// 设置工作日预设
const setWorkDaysPreset = (preset) => {
  switch (preset) {
    case 'weekdays':
      roleForm.timeConfig.workDays = ['1', '2', '3', '4', '5']
      ElMessage.success('已设置为工作日(周一至周五)')
      break
    case 'weekends':
      roleForm.timeConfig.workDays = ['6', '0']
      ElMessage.success('已设置为周末(周六周日)')
      break
    case 'all':
      roleForm.timeConfig.workDays = ['1', '2', '3', '4', '5', '6', '0']
      ElMessage.success('已设置为全周(周一至周日)')
      break
    case 'custom':
      // 保持当前选择不变，只是提示用户可以自定义
      ElMessage.info('请手动选择需要值班的日期')
      break
  }
}

// 获取值班类型显示名称
const getTypeDisplayName = (type) => {
  const typeNames = {
    fullday: '全天值班',
    day: '白班',
    night: '夜班',
    morning: '早班',
    evening: '晚班'
  }
  return typeNames[type] || type
}

// 人员类型变化处理
const onPersonnelTypeChange = (type) => {
  if (type === 'single') {
    roleForm.rotationOrder = []
    roleForm.groups = []
  } else {
    roleForm.rotationOrder = []
    roleForm.groups = [{ members: new Array(roleForm.groupSize).fill(null) }]
  }
}

// 添加到轮换顺序
const addToRotation = (employee) => {
  if (!roleForm.rotationOrder.find(p => p.key === employee.key)) {
    roleForm.rotationOrder.push({ ...employee })
  }
}

// 从轮换顺序移除
const removeFromRotation = (index) => {
  roleForm.rotationOrder.splice(index, 1)
}

// 拖拽开始
const onDragStart = (index) => {
  draggedIndex.value = index
}

// 拖拽放置
const onDrop = (targetIndex) => {
  if (draggedIndex.value !== -1 && draggedIndex.value !== targetIndex) {
    const draggedItem = roleForm.rotationOrder[draggedIndex.value]
    roleForm.rotationOrder.splice(draggedIndex.value, 1)
    roleForm.rotationOrder.splice(targetIndex, 0, draggedItem)
  }
  draggedIndex.value = -1
}

// 组大小变化处理已在后面定义

// 添加组功能已在addNewGroup中实现

// 删除组功能已在后面定义

// 成员选择对话框相关
const memberSelectorVisible = ref(false);
const selectedGroupIndex = ref(-1);
const selectedMemberIndex = ref(-1);

// 显示成员选择对话框
const showMemberSelector = (groupIndex, memberIndex) => {
  selectedGroupIndex.value = groupIndex;
  selectedMemberIndex.value = memberIndex;
  memberSelectorVisible.value = true;
};

// 选择成员
const selectMember = (employee) => {
  const groupIndex = selectedGroupIndex.value;
  const memberIndex = selectedMemberIndex.value;
  
  // 检查该员工是否已经在其他组中
  const isAlreadyAssigned = roleForm.groups.some((group, gIndex) => 
    group.members.some((member, mIndex) => 
      member && member.key === employee.key && !(gIndex === groupIndex && mIndex === memberIndex)
    )
  );
  
  if (isAlreadyAssigned) {
    ElMessage.warning('该员工已经在其他组中，不能重复分配');
    return;
  }
  
  roleForm.groups[groupIndex].members[memberIndex] = { ...employee };
  memberSelectorVisible.value = false;
  ElMessage.success(`已将 ${employee.label} 分配到第${groupIndex + 1}组`);
};

// 从组中移除成员
const removeMemberFromGroup = (groupIndex, memberIndex) => {
  const member = roleForm.groups[groupIndex].members[memberIndex];
  if (member) {
    roleForm.groups[groupIndex].members[memberIndex] = null;
    ElMessage.success(`已将 ${member.label} 从第${groupIndex + 1}组中移除`);
  }
};

// 组大小变化处理
const onGroupSizeChange = (newSize) => {
  roleForm.groups.forEach(group => {
    if (group.members.length < newSize) {
      // 增加空槽位
      while (group.members.length < newSize) {
        group.members.push(null);
      }
    } else if (group.members.length > newSize) {
      // 减少槽位，移除多余的成员
      group.members = group.members.slice(0, newSize);
    }
  });
};

// 删除组
const removeGroup = (groupIndex) => {
  if (roleForm.groups.length > 1) {
    roleForm.groups.splice(groupIndex, 1);
    ElMessage.success(`已删除第${groupIndex + 1}组`);
  }
};

// 添加新组
const addNewGroup = () => {
  roleForm.groups.push({
    members: new Array(roleForm.groupSize).fill(null)
  });
  ElMessage.success(`已添加第${roleForm.groups.length}组`);
};

// 获取可选择的员工（排除已分配的）
const getAvailableEmployeesForGroup = () => {
  return availableEmployees.value.filter(emp => 
    !roleForm.groups.some(group => 
      group.members.some(member => member && member.key === emp.key)
    )
  );
};

// 验证是否可以进入下一步
const canProceedToNext = () => {
  switch (currentStep.value) {
    case 0:
      return roleForm.name && roleForm.type
    case 1:
      return roleForm.timeConfig.startTime && roleForm.timeConfig.endTime && roleForm.timeConfig.workDays.length > 0
    case 2:
      if (roleForm.personnelType === 'single') {
        return roleForm.rotationOrder.length > 0
      } else {
        return roleForm.groups.length > 0 && roleForm.groups.every(group => 
          group.members.some(member => member !== null)
        )
      }
    case 3:
      return roleForm.rules.cycle && roleForm.rules.rotationType
    case 4:
      return true
    default:
      return true
  }
}

// 生成排班预览
const generatePreview = async () => {
  try {
    const response = await api.post('/simplified-schedule-engine/preview', {
      roleConfig: roleForm,
      startDate: previewDate.value,
      days: 7
    })
    
    schedulePreview.value = response.data
      } catch (error) {
    console.error('生成预览失败:', error)
    ElMessage.error(`生成预览失败: ${error.response?.data?.message || error.message}`)
  }
}

// 保存角色配置
const saveRole = async () => {
    try {
    saving.value = true
        // 转换数据格式以匹配后端期望
    const saveData = {
      name: roleForm.name,
      description: roleForm.description,
      selectionCriteria: {
        byPosition: [], // 暂时为空，后续可以根据需要扩展
        byTags: [], // 可以根据人员选择添加标签筛选
        byDepartment: [] // 可以根据部门筛选
      },
      assignmentType: roleForm.personnelType === 'single' ? 'SINGLE' : 'GROUP',
      isRequired: true,
      isActive: true,
      // 扩展数据，保存完整的配置信息
      extendedConfig: {
        type: roleForm.type,
        timeConfig: roleForm.timeConfig,
        personnelType: roleForm.personnelType,
        rotationOrder: roleForm.rotationOrder,
        groupSize: roleForm.groupSize,
        groups: roleForm.groups,
        rules: roleForm.rules
      }
    }
    
        let response
    if (editingRoleId.value) {
      // 编辑模式：更新现有角色
            response = await api.put(`/shift-roles/${editingRoleId.value}`, saveData)
      ElMessage.success('角色配置更新成功！')
    } else {
      // 新建模式：创建新角色
            response = await api.post('/shift-roles', saveData)
      ElMessage.success('角色配置保存成功！')
    }
    
        // 立即切换到列表视图
        viewMode.value = 'list'
    
    // 重置表单和编辑状态
        resetForm()
    editingRoleId.value = null
    
    // 异步加载角色列表（不阻塞UI）
        loadRolesList().catch(listError => {
          })
    
  } catch (error) {
    console.error('❌ 保存失败:', error)
    ElMessage.error(`保存失败: ${error.response?.data?.message || error.message}`)
  } finally {
        saving.value = false
  }
}

// 重置表单（带确认）
const resetFormWithConfirm = () => {
  ElMessageBox.confirm('确定要重置所有配置吗？', '确认重置', {
    type: 'warning'
  }).then(() => {
    resetForm()
    currentStep.value = 0
    ElMessage.success('配置已重置')
  })
}

// 辅助函数
const formatTime = (time) => {
  if (!time) return ''
  
  // 如果已经是字符串格式的时间（如 "08:00"），直接返回
  if (typeof time === 'string') {
    // 检查是否是 HH:MM 格式
    if (/^\d{2}:\d{2}$/.test(time)) {
      return time
    }
    // 如果是其他字符串格式，尝试转换为Date
    try {
      const date = new Date(time)
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      }
    } catch (e) {
            return time.toString()
    }
  }
  
  // 如果是Date对象
  if (time instanceof Date) {
    return time.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }
  
  // 如果是对象格式（可能来自数据库）
  if (typeof time === 'object' && time !== null) {
    try {
      const date = new Date(time)
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('zh-CN', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      }
    } catch (e) {
          }
  }
  
  // 默认返回字符串形式
  return time.toString()
}

const getWeekDayName = (day) => {
  const dayNames = {
    '0': '周日',
    '1': '周一', 
    '2': '周二',
    '3': '周三',
    '4': '周四',
    '5': '周五',
    '6': '周六'
  }
  return dayNames[day] || day
}

const getFrequencyText = (frequency) => {
  const frequencyMap = {
    daily: '每天值班',
    alternate: '隔天值班',
    weekly: '每周值班',
    custom: '自定义间隔'
  }
  return frequencyMap[frequency] || frequency
}

// 新增的格式化方法
const getTypeLabel = (type) => {
  const typeMap = {
    fullday: '全天值班',
    day: '白班',
    night: '夜班',
    morning: '早班',
    evening: '晚班'
  }
  return typeMap[type] || type
}

const formatWorkDays = (workDays) => {
  if (!workDays || workDays.length === 0) return '无'
  
  const dayNames = {
    '0': '周日',
    '1': '周一', 
    '2': '周二',
    '3': '周三',
    '4': '周四',
    '5': '周五',
    '6': '周六'
  }
  
  // 检查是否是工作日
  if (workDays.length === 5 && 
      workDays.includes('1') && workDays.includes('2') && 
      workDays.includes('3') && workDays.includes('4') && 
      workDays.includes('5')) {
    return '工作日'
  }
  
  // 检查是否是全周
  if (workDays.length === 7) {
    return '全周'
  }
  
  // 检查是否是周末
  if (workDays.length === 2 && workDays.includes('0') && workDays.includes('6')) {
    return '周末'
  }
  
  // 其他情况显示具体天数
  return workDays.map(day => dayNames[day]).join('、')
}

// 排班规则相关辅助函数
const getCycleDescription = (cycle) => {
  const descriptions = {
    weekly: '每周生成一次排班表',
    monthly: '每月生成一次排班表',
    custom: '根据自定义周期生成'
  }
  return descriptions[cycle] || ''
}

const getRotationDescription = (type) => {
  const descriptions = {
    sequential: '按照设定顺序依次轮换',
    random: '随机选择值班人员',
    balanced: '根据工作量平衡分配'
  }
  return descriptions[type] || ''
}

const getCycleText = (cycle) => {
  const cycleMap = {
    weekly: '按周排班',
    monthly: '按月排班',
    custom: '自定义周期'
  }
  return cycleMap[cycle] || cycle
}

const getRotationText = (type) => {
  const rotationMap = {
    sequential: '顺序轮换',
    random: '随机轮换',
    balanced: '负载均衡'
  }
  return rotationMap[type] || type
}

const getPriorityText = (priority) => {
  const priorityMap = {
    normal: '正常处理',
    strict: '严格按优先级',
    flexible: '灵活调整'
  }
  return priorityMap[priority] || priority
}

const getHolidayText = (holiday) => {
  const holidayMap = {
    normal: '正常排班',
    skip: '跳过节假日',
    double: '节假日加强'
  }
  return holidayMap[holiday] || holiday
}

// 显示高级轮换帮助
const showAdvancedRotationHelp = () => {
  ElMessageBox.alert(`
    <div style="text-align: left;">
      <h4>高级轮换规则说明</h4>
      <p><strong>适用场景：</strong></p>
      <ul>
        <li><strong>混合模式：</strong>工作日每日轮换，周末连续值班</li>
        <li><strong>按周编组：</strong>整周按组轮换，适用于考勤监督等</li>
      </ul>
      
      <p><strong>你的需求配置示例：</strong></p>
      <ul>
        <li><strong>带班领导：</strong>不启用高级轮换，使用基础每日轮换</li>
        <li><strong>值班员：</strong>启用混合模式，工作日每日轮换，周末同一人值班</li>
        <li><strong>考勤监督员：</strong>启用按周编组，每周轮换组</li>
      </ul>
      
      <p><strong>配置步骤：</strong></p>
      <p>1. 选择轮换类型</p>
      <p>2. 设置工作日和周末的不同规则</p>
      <p>3. 配置轮换周期</p>
    </div>
  `, '高级轮换规则帮助', {
    confirmButtonText: '我知道了',
    dangerouslyUseHTMLString: true,
    customStyle: {
      width: '600px'
    }
  });
};

// 显示连班设置帮助
const showConsecutiveHelp = () => {
  ElMessageBox.alert(`
    <div style="text-align: left;">
      <h4>连班排班设置说明</h4>
      <p><strong>什么是连班？</strong></p>
      <p>连班是指同一个人连续多天值班，常用于：</p>
      <ul>
        <li>周末值班：周五到周日同一人值班</li>
        <li>节假日值班：节假日期间连续值班</li>
        <li>夜班连班：连续几个夜班由同一人值班</li>
      </ul>
      
      <p><strong>工作原理：</strong></p>
      <ul>
        <li>系统按照"时间设置"中的工作日安排值班</li>
        <li>同一人连续值班指定天数后，自动轮换到下一个人</li>
        <li>人员按照"人员配置"中的顺序进行轮换</li>
      </ul>
      
      <p><strong>示例：</strong></p>
      <p>设置连续值班3天，工作日选择周五、周六、周日：</p>
      <p>第1-3天：张三值班，第4-6天：李四值班，第7-9天：王五值班...</p>
    </div>
  `, '连班排班设置帮助', {
    confirmButtonText: '我知道了',
    dangerouslyUseHTMLString: true,
    customStyle: {
      width: '600px'
    }
  });
};

// 组件挂载
onMounted(() => {
  loadEmployees()
  loadRolesList()
  // 初始化编组
  if (roleForm.personnelType === 'group' && roleForm.groups.length === 0) {
    addNewGroup()
  }
})
</script>

<style scoped>
.shift-role-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h1 {
  color: #303133;
  margin-bottom: 10px;
}

.subtitle {
  color: #606266;
  font-size: 14px;
}

/* 主容器布局 */
.main-container {
  display: flex;
  gap: 30px;
  min-height: 600px;
}

/* 左侧步骤导航样式 */
.steps-sidebar {
  width: 240px;
  flex-shrink: 0;
}

.steps-nav {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 20px;
  position: sticky;
  top: 20px;
}

.step-item {
  display: flex;
  align-items: center;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 8px;
  margin-bottom: 8px;
  position: relative;
}

.step-item:hover {
  background: rgba(64, 158, 255, 0.1);
}

.step-item.active {
  background: #409eff;
  color: white;
}

.step-item.completed {
  background: #67c23a;
  color: white;
}

.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 22px;
  bottom: -8px;
  width: 2px;
  height: 8px;
  background: #dcdfe6;
}

.step-item.completed:not(:last-child)::after {
  background: #67c23a;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #dcdfe6;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 12px;
  transition: all 0.3s;
  flex-shrink: 0;
}

.step-item.active .step-number {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.step-item.completed .step-number {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.step-title {
  font-size: 14px;
  color: #606266;
  transition: all 0.3s;
  font-weight: 500;
}

.step-item.active .step-title {
  color: white;
  font-weight: 600;
}

.step-item.completed .step-title {
  color: white;
}

/* 步骤内容样式 */
.step-content {
  flex: 1;
  min-height: 600px;
}

.step-panel {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  height: 100%;
}

.step-panel h2 {
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409eff;
}

/* 时间配置样式 */
.time-config {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
}

.time-section,
.workdays-section {
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.time-section h3,
.workdays-section h3 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #409eff;
  padding-bottom: 8px;
}

.workdays-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.workdays-presets .el-button {
  font-size: 12px;
}

/* 排班规则样式 */
.rules-config {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
}

.rules-section {
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.rules-section h3 {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 2px solid #409eff;
  padding-bottom: 8px;
}

.rules-section .el-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rules-section .el-radio {
  margin-right: 0;
  margin-bottom: 8px;
}

.unit {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

/* 人员配置样式 */
.personnel-config .config-header {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

/* 单人值班样式 */
.single-personnel .personnel-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-top: 20px;
}

.available-personnel h4,
.rotation-order h4 {
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
}

.personnel-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px;
}

.personnel-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.personnel-item:hover {
  background: #f5f7fa;
}

.rotation-list {
  min-height: 200px;
  border: 2px dashed #e4e7ed;
  border-radius: 8px;
  padding: 10px;
}

.rotation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: move;
  transition: all 0.3s;
}

.rotation-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.order-number {
  width: 24px;
  height: 24px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.person-name {
  flex: 1;
  font-weight: 500;
}

/* 编组值班样式 */
.group-personnel .group-config-section {
  margin-top: 20px;
}

.groups-management {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.group-card {
  border-radius: 8px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.group-members {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.member-slot {
  height: 80px;
  border: 2px dashed #e4e7ed;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.member-slot:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.selected-member {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border: 1px solid #409eff;
  border-radius: 8px;
  height: 100%;
  justify-content: center;
}

.empty-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 12px;
}

.add-group-btn {
  height: 120px;
  border: 2px dashed #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
}

/* 规则配置样式 */
.rules-config {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
}

.constraints-config {
  padding: 20px;
}

/* 预览样式 */
.preview-content {
  background: #fafafa;
  padding: 20px;
  border-radius: 8px;
}

.config-overview {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.rotation-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.groups-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-preview {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

/* 操作按钮样式 */
.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding: 0 0 20px 0;
  margin-bottom: 20px;
  position: absolute;
  top: 30px;
  right: 30px;
  z-index: 10;
}

.step-panel {
  position: relative;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .main-container {
    flex-direction: column;
    gap: 20px;
  }
  
  .steps-sidebar {
    width: 100%;
  }
  
  .steps-nav {
    display: flex;
    overflow-x: auto;
    padding: 15px;
  }
  
  .step-item {
    flex-direction: column;
    align-items: center;
    min-width: 120px;
    margin-right: 15px;
    margin-bottom: 0;
  }
  
  .step-item:not(:last-child)::after {
    display: none;
  }
  
  .step-number {
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .step-title {
    text-align: center;
    font-size: 12px;
  }
  
  .step-actions {
    position: static;
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .shift-role-management {
    padding: 10px;
  }
  
  .step-panel {
    padding: 20px;
  }
  
  .shifts-list,
  .groups-list {
    grid-template-columns: 1fr;
  }
}

/* 成员选择对话框样式 */
.member-selector .available-members {
  max-height: 400px;
  overflow-y: auto;
}

.member-selector .member-option {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.member-selector .member-option:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.member-selector .member-info {
  flex: 1;
  margin-left: 12px;
}

.member-selector .member-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.member-selector .member-details {
  font-size: 12px;
  color: #909399;
}

.member-selector .no-available {
  text-align: center;
  padding: 40px 0;
}

/* 连班配置样式 */
.consecutive-config {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
}

.consecutive-config .el-form-item {
  margin-bottom: 16px;
}

.consecutive-config .unit {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

/* 高级轮换配置样式 */
.advanced-rotation-config {
  background-color: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 20px;
  margin: 16px 0;
}

.advanced-rotation-config .el-form-item {
  margin-bottom: 16px;
}

.advanced-rotation-config .unit {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.step-actions {
  flex-wrap: wrap;
  gap: 10px;
}

/* 动画效果 */
.step-panel {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 表单样式优化 */
.el-form-item {
  margin-bottom: 20px;
}

.el-card {
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.el-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s;
}

/* 颜色选择器样式 */
.el-color-picker {
  vertical-align: middle;
}

/* Transfer 组件样式 */
.el-transfer {
  display: flex;
  justify-content: center;
}

/* 表格样式 */
.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-table th {
  background: #f5f7fa;
  color: #303133;
  font-weight: bold;
}

/* 标签样式 */
.el-tag {
  margin: 2px;
  border-radius: 4px;
}

/* 描述列表样式 */
.el-descriptions {
  margin-bottom: 20px;
}

.el-descriptions__title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

/* 选项卡样式 */
.el-tabs__header {
  margin-bottom: 20px;
}

.el-tabs__item {
  font-size: 14px;
  font-weight: 500;
}

/* 按钮样式 */
.el-button {
  border-radius: 6px;
  font-weight: 500;
}

.el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  border: none;
}

.el-button--success {
  background: linear-gradient(135deg, #67c23a 0%, #5daf34 100%);
  border: none;
}

.el-button--danger {
  background: linear-gradient(135deg, #f56c6c 0%, #f25c5c 100%);
  border: none;
}

/* 输入框样式 */
.el-input__inner,
.el-textarea__inner {
  border-radius: 6px;
}

.el-input__inner:focus,
.el-textarea__inner:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 选择器样式 */
.el-select {
  width: 100%;
}

/* 数字输入框样式 */
.el-input-number {
  width: 120px;
}

/* 时间选择器样式 */
.el-time-picker {
  width: 100%;
}

/* 复选框组样式 */
.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-container {
    flex-direction: column;
  }
  
  .steps-sidebar {
    width: 100%;
  }
  
  .steps-nav {
    display: flex;
    overflow-x: auto;
    padding: 15px;
  }
  
  .step-item {
    flex-direction: column;
    align-items: center;
    min-width: 120px;
    margin-right: 15px;
    margin-bottom: 0;
  }
  
  .step-item:not(:last-child)::after {
    display: none;
  }
  
  .step-number {
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .step-title {
    text-align: center;
    font-size: 12px;
  }
  
  .step-actions {
    position: static;
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .shift-role-management {
    padding: 10px;
  }
  
  .step-panel {
    padding: 20px;
  }
  
  .shifts-list,
  .groups-list {
    grid-template-columns: 1fr;
  }
}

.back-button {
  margin-bottom: 20px;
}

.back-button .el-button {
  width: 100%;
}
.el-button {
  border-radius: 6px;
  font-weight: 500;
}

.el-button--primary {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  border: none;
}

.el-button--success {
  background: linear-gradient(135deg, #67c23a 0%, #5daf34 100%);
  border: none;
}

.el-button--danger {
  background: linear-gradient(135deg, #f56c6c 0%, #f25c5c 100%);
  border: none;
}

/* 输入框样式 */
.el-input__inner,
.el-textarea__inner {
  border-radius: 6px;
}

.el-input__inner:focus,
.el-textarea__inner:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 选择器样式 */
.el-select {
  width: 100%;
}

/* 数字输入框样式 */
.el-input-number {
  width: 120px;
}

/* 时间选择器样式 */
.el-time-picker {
  width: 100%;
}

/* 复选框组样式 */
.el-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.el-checkbox {
  margin-right: 0;
}

/* 单选框组样式 */
.el-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.el-radio {
  margin-right: 0;
}

/* 加载状态样式 */
.el-loading-mask {
  border-radius: 8px;
}

/* 消息提示样式 */
.el-message {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 确认框样式 */
.el-message-box {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 角色列表样式 */
.roles-list-container {
  padding: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.list-header h2 {
  color: #303133;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.roles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.role-item {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.role-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-color: #409eff;
}

.role-info {
  flex: 1;
}

.role-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-summary {
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
  line-height: 1.4;
}

.role-description {
  font-size: 13px;
  color: #909399;
  line-height: 1.4;
}

.role-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.back-button {
  margin-bottom: 20px;
}

.back-button .el-button {
  width: 100%;
}
</style>