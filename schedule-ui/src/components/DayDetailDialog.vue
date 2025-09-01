<template>
  <el-dialog v-model="visible" :title="`${selectedDate} 值班详情`" width="800px" @close="handleClose">
    <div class="day-detail-container">
      <!-- 当日值班概览 -->
      <div class="shift-overview">
        <h3>当日值班安排</h3>
        <div v-if="daySchedules.length === 0" class="no-schedule">
          <el-empty description="当日无值班安排" />
        </div>
        <div v-else class="schedule-list">
          <el-card v-for="schedule in daySchedules" :key="schedule.id" class="schedule-card">
            <div class="schedule-header">
              <div class="position-info">
                <el-tag :color="schedule.position?.color || '#409eff'" effect="light">
                  {{ schedule.position?.name || '未知岗位' }}
                </el-tag>
                <span class="shift-time">{{ schedule.shift || '全天' }}</span>
              </div>
              <div class="schedule-actions">
                <el-button 
                  type="warning" 
                  size="small" 
                  :icon="Refresh" 
                  @click="openReplacementDialog(schedule)"
                >
                  临时替班
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  :icon="Delete" 
                  @click="removeSchedule(schedule.id)"
                >
                  移除
                </el-button>
              </div>
            </div>
            <div class="employee-info">
              <div class="employee-item">
                <el-avatar :size="32" :src="getEmployeeAvatar(schedule.employee)" />
                <div class="employee-details">
                  <div class="employee-name">{{ schedule.employee?.name || '未知员工' }}</div>
                  <div class="employee-meta">
                    {{ schedule.employee?.department }} - {{ schedule.employee?.position }}
                    <el-tag v-if="schedule.employee?.level" size="small" type="info">
                      {{ getLevelDisplayName(schedule.employee.level) }}级
                    </el-tag>
                  </div>
                </div>
                <div class="employee-status">
                  <el-tag 
                    :type="getEmployeeStatusType(schedule.employee?.status)" 
                    size="small"
                  >
                    {{ schedule.employee?.status || '在岗' }}
                  </el-tag>
                </div>
              </div>
            </div>
            <!-- 显示替班记录 -->
            <div v-if="schedule.replacements && schedule.replacements.length > 0" class="replacement-history">
              <el-divider content-position="left">替班记录</el-divider>
              <div v-for="replacement in schedule.replacements" :key="replacement.id" class="replacement-item">
                <el-icon class="replacement-icon"><Refresh /></el-icon>
                <span>{{ replacement.originalEmployee?.name }} → {{ replacement.replacementEmployee?.name }}</span>
                <el-tag size="small" type="warning">{{ replacement.reason }}</el-tag>
                <span class="replacement-time">{{ formatDateTime(replacement.createdAt) }}</span>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <!-- 冲突检测 -->
      <div v-if="conflicts.length > 0" class="conflicts-section">
        <h3>⚠️ 发现冲突</h3>
        <el-alert
          v-for="conflict in conflicts"
          :key="conflict.id"
          :title="conflict.title"
          :description="conflict.description"
          type="warning"
          show-icon
          class="conflict-alert"
        >
          <template #default>
            <div class="conflict-actions">
              <el-button size="small" type="primary" @click="resolveConflict(conflict)">
                解决冲突
              </el-button>
              <el-button size="small" @click="ignoreConflict(conflict.id)">
                忽略
              </el-button>
            </div>
          </template>
        </el-alert>
      </div>

      <!-- 快速添加值班 -->
      <div class="quick-add-section">
        <h3>快速添加值班</h3>
        <el-form :model="quickAddForm" inline>
          <el-form-item label="岗位">
            <el-select v-model="quickAddForm.positionId" placeholder="选择岗位">
              <el-option 
                v-for="position in positions" 
                :key="position.id" 
                :label="position.name" 
                :value="position.id" 
              />
            </el-select>
          </el-form-item>
          <el-form-item label="员工">
            <el-select v-model="quickAddForm.employeeId" placeholder="选择员工" filterable>
              <el-option 
                v-for="employee in availableEmployees" 
                :key="employee.id" 
                :label="`${employee.name} (${employee.department})`" 
                :value="employee.id" 
              />
            </el-select>
          </el-form-item>
          <el-form-item label="班次">
            <el-select v-model="quickAddForm.shift" placeholder="选择班次">
              <el-option label="全天" value="all-day" />
              <el-option label="白班" value="day" />
              <el-option label="夜班" value="night" />
              <el-option label="上午" value="morning" />
              <el-option label="下午" value="afternoon" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="addQuickSchedule">添加</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button type="primary" @click="refreshData">刷新数据</el-button>
    </template>
  </el-dialog>

  <!-- 替班对话框 -->
  <ReplacementDialog 
    v-model:visible="replacementDialogVisible"
    :original-schedule="selectedSchedule"
    @replacement-created="handleReplacementCreated"
  />
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Delete } from '@element-plus/icons-vue';
import apiClient from '@/api';
import ReplacementDialog from './ReplacementDialog.vue';
import { useEmployeeStore } from '@/stores/employee';

interface Employee {
  id: number;
  name: string;
  department?: string;
  departmentInfo?: {
    name: string;
  };
  position: string;
  positionInfo?: {
    name: string;
  };
  level?: number;
  status?: string;
  organizationNode?: {
    name: string;
  };
}

interface Position {
  id: number;
  name: string;
  color: string;
}

interface Schedule {
  id: number;
  employeeId: number;
  employee: Employee;
  positionId: number;
  position: Position;
  shift: string;
  date: string;
  replacements?: Replacement[];
}

interface Replacement {
  id: number;
  originalEmployeeId: number;
  originalEmployee: Employee;
  replacementEmployeeId: number;
  replacementEmployee: Employee;
  reason: string;
  createdAt: string;
}

interface Conflict {
  id: string;
  title: string;
  description: string;
  type: string;
  scheduleId?: number;
  employeeId?: number;
}

const props = defineProps<{
  visible: boolean;
  selectedDate: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'schedule-updated': [];
}>();

const daySchedules = ref<Schedule[]>([]);
const conflicts = ref<Conflict[]>([]);
const positions = ref<Position[]>([]);
const availableEmployees = ref<Employee[]>([]);
const replacementDialogVisible = ref(false);
const selectedSchedule = ref<Schedule | undefined>(undefined);

const quickAddForm = ref({
  positionId: null,
  employeeId: null,
  shift: 'all-day',
});

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

// 监听日期变化，重新加载数据
watch(() => props.selectedDate, (newDate) => {
  if (newDate && props.visible) {
    loadDayData();
  }
});

watch(() => props.visible, (newVisible) => {
  if (newVisible && props.selectedDate) {
    loadDayData();
  }
});

const loadDayData = async () => {
  await Promise.all([
    fetchDaySchedules(),
    fetchConflicts(),
    fetchPositions(),
    fetchAvailableEmployees(),
  ]);
};

const fetchDaySchedules = async () => {
  try {
    // 首先尝试从 localStorage 获取数据
    const localData = localStorage.getItem('generatedSchedules');
    if (localData) {
      const schedules = JSON.parse(localData);
      const daySchedulesData = schedules.filter(schedule => schedule.date === props.selectedDate);
      
      // 转换数据格式以匹配组件期望的格式
      daySchedules.value = daySchedulesData.map(schedule => {
        // 从员工store获取完整的员工信息
        const employeeStore = useEmployeeStore();
        const employee = employeeStore.employees.find((emp: any) => emp.id === schedule.assignedPersonId);
        
        return {
          id: schedule.id || `local_${Date.now()}_${Math.random()}`,
          employeeId: schedule.assignedPersonId,
          employee: {
            id: schedule.assignedPersonId,
            name: employee?.name || schedule.employeeName || '未知员工',
            department: employee?.departmentInfo?.name || employee?.department || '未知部门',
            position: employee?.position || employee?.positionInfo?.name || employee?.organizationNode?.name || schedule.roleName || '未知岗位',
            level: employee?.level || 1,
            status: employee?.status || '在岗'
          },
          positionId: schedule.roleId,
          position: {
            id: schedule.roleId,
            name: schedule.roleName || '未知岗位',
            color: '#409eff'
          },
          shift: schedule.roleName || '值班',
          date: schedule.date,
          replacements: []
        };
      });
      
      console.log(`📋 从localStorage获取到 ${daySchedules.value.length} 条当日排班记录`);
      return;
    }
    
    // 如果 localStorage 没有数据，尝试从 API 获取
    const response = await apiClient.get(`/schedules/date/${props.selectedDate}`);
    daySchedules.value = response.data;
  } catch (error) {
    console.error('获取当日排班失败:', error);
    // 不显示错误消息，因为可能只是 API 不可用
    daySchedules.value = [];
  }
};

const fetchConflicts = async () => {
  try {
    const response = await apiClient.get(`/schedules/conflicts/${props.selectedDate}`);
    conflicts.value = response.data;
  } catch (error) {
    console.error('获取冲突信息失败:', error);
  }
};

const fetchPositions = async () => {
  try {
    const response = await apiClient.get('/position');
    positions.value = response.data;
  } catch (error) {
    console.error('获取岗位列表失败:', error);
  }
};

const fetchAvailableEmployees = async () => {
  try {
    // 直接获取所有在职员工（简化逻辑，避免404错误）
    const response = await apiClient.get('/employees');
    availableEmployees.value = response.data.filter((emp: any) => emp.status === 'ON_DUTY');
    console.log(`📋 获取到 ${availableEmployees.value.length} 名可用员工`);
  } catch (error) {
    console.error('获取员工列表失败:', error);
    ElMessage.error('获取员工列表失败');
    availableEmployees.value = [];
  }
};

const getLevelDisplayName = (level: number) => {
  const levelMap: Record<number, string> = {
    1: '一',
    2: '二', 
    3: '三',
    4: '四',
    5: '五',
  };
  return levelMap[level] || level.toString();
};

const getEmployeeStatusType = (status?: string) => {
  const statusMap: Record<string, string> = {
    '在岗': 'success',
    '请假': 'warning',
    '出差': 'info',
    '病假': 'danger',
  };
  return statusMap[status || '在岗'] || 'info'; // 确保总是返回有效的类型
};

const getEmployeeAvatar = (employee: Employee) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee?.name || 'default'}`;
};

const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('zh-CN');
};

const openReplacementDialog = (schedule: Schedule) => {
  selectedSchedule.value = schedule;
  replacementDialogVisible.value = true;
};

const handleReplacementCreated = () => {
  loadDayData();
  emit('schedule-updated');
};

const removeSchedule = async (scheduleId: number) => {
  try {
    await ElMessageBox.confirm('确定要移除这个值班安排吗？', '确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });

    await apiClient.delete(`/schedules/${scheduleId}`);
    ElMessage.success('移除成功');
    loadDayData();
    emit('schedule-updated');
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('移除失败');
    }
  }
};

const addQuickSchedule = async () => {
  if (!quickAddForm.value.positionId || !quickAddForm.value.employeeId) {
    ElMessage.warning('请选择岗位和员工');
    return;
  }

  try {
    await apiClient.post('/schedules', {
      positionId: quickAddForm.value.positionId,
      employeeId: quickAddForm.value.employeeId,
      shift: quickAddForm.value.shift,
      date: props.selectedDate,
    });

    ElMessage.success('添加成功');
    quickAddForm.value = {
      positionId: null,
      employeeId: null,
      shift: 'all-day',
    };
    loadDayData();
    emit('schedule-updated');
  } catch (error) {
    ElMessage.error('添加失败');
  }
};

const resolveConflict = async (conflict: Conflict) => {
  // 根据冲突类型提供解决方案
  if (conflict.type === 'employee_unavailable') {
    // 员工不可用，建议替班
    if (conflict.scheduleId) {
      const schedule = daySchedules.value.find(s => s.id === conflict.scheduleId);
      if (schedule) {
        openReplacementDialog(schedule);
      }
    }
  } else if (conflict.type === 'insufficient_level') {
    // 级别不足，建议添加高级别员工
    ElMessage.info('请添加更高级别的员工到当日值班');
  }
};

const ignoreConflict = async (conflictId: string) => {
  try {
    await apiClient.patch(`/schedules/conflicts/${conflictId}/ignore`);
    conflicts.value = conflicts.value.filter(c => c.id !== conflictId);
    ElMessage.success('已忽略冲突');
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const refreshData = () => {
  loadDayData();
  emit('schedule-updated');
};

const handleClose = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.day-detail-container {
  max-height: 70vh;
  overflow-y: auto;
}

.shift-overview h3,
.conflicts-section h3,
.quick-add-section h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.schedule-card {
  border-radius: 8px;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.position-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shift-time {
  font-size: 14px;
  color: #666;
}

.schedule-actions {
  display: flex;
  gap: 8px;
}

.employee-info {
  margin-bottom: 8px;
}

.employee-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.employee-details {
  flex: 1;
}

.employee-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.employee-meta {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
}

.employee-status {
  margin-left: auto;
}

.replacement-history {
  margin-top: 12px;
}

.replacement-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 14px;
}

.replacement-icon {
  color: #e6a23c;
}

.replacement-time {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.conflicts-section {
  margin: 24px 0;
}

.conflict-alert {
  margin-bottom: 12px;
}

.conflict-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.quick-add-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #ebeef5;
}

.no-schedule {
  text-align: center;
  padding: 40px 0;
}
</style>