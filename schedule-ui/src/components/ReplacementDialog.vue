<template>
  <el-dialog v-model="dialogVisible" title="临时替班" width="600px">
    <div v-if="originalSchedule" class="replacement-form">
      <!-- 原值班信息 -->
      <div class="original-info">
        <h4>原值班信息</h4>
        <el-card class="info-card">
          <div class="schedule-info">
            <div class="info-row">
              <span class="label">岗位：</span>
              <el-tag :color="originalSchedule.position?.color">{{ originalSchedule.position?.name }}</el-tag>
            </div>
            <div class="info-row">
              <span class="label">班次：</span>
              <span>{{ getShiftDisplayName(originalSchedule.shift) }}</span>
            </div>
            <div class="info-row">
              <span class="label">日期：</span>
              <span>{{ originalSchedule.date }}</span>
            </div>
            <div class="info-row">
              <span class="label">原值班人员：</span>
              <div class="employee-info">
                <el-avatar :size="24" :src="getEmployeeAvatar(originalSchedule.employee)" />
                <span>{{ originalSchedule.employee?.name }}</span>
                <el-tag size="small" type="info">{{ originalSchedule.employee?.department }}</el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 替班表单 -->
      <el-form :model="form" label-width="100px" :rules="formRules" ref="formRef">
        <el-form-item label="替班类型" prop="replacementType">
          <el-radio-group v-model="form.replacementType">
            <el-radio value="temporary">临时替班</el-radio>
            <el-radio value="permanent">永久替换</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="替班人员" prop="replacementEmployeeId">
          <el-select 
            v-model="form.replacementEmployeeId" 
            placeholder="请选择替班人员" 
            filterable
            @change="onReplacementEmployeeChange"
          >
            <el-option
              v-for="employee in availableEmployees"
              :key="employee.id"
              :label="`${employee.name} (${employee.department})`"
              :value="employee.id"
            >
              <div class="employee-option">
                <div class="employee-basic">
                  <span class="employee-name">{{ employee.name }}</span>
                  <el-tag size="small" type="info">{{ employee.department }}</el-tag>
                  <el-tag size="small" :type="getLevelTagType(employee.level)">
                    {{ employee.level }}级
                  </el-tag>
                </div>
                <div class="employee-status">
                  <el-tag size="small" :type="getStatusTagType(employee.status)">
                    {{ employee.status }}
                  </el-tag>
                </div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 显示替班人员详情 -->
        <div v-if="selectedReplacementEmployee" class="replacement-employee-detail">
          <el-alert
            :title="`替班人员：${selectedReplacementEmployee.name}`"
            type="info"
            :closable="false"
          >
            <div class="employee-detail-content">
              <p><strong>部门：</strong>{{ selectedReplacementEmployee.department }}</p>
              <p><strong>岗位：</strong>{{ selectedReplacementEmployee.position }}</p>
              <p><strong>级别：</strong>{{ selectedReplacementEmployee.level }}级</p>
              <p><strong>状态：</strong>{{ selectedReplacementEmployee.status }}</p>
              <div v-if="replacementConflicts.length > 0" class="conflicts">
                <p><strong>⚠️ 注意事项：</strong></p>
                <ul>
                  <li v-for="conflict in replacementConflicts" :key="conflict">{{ conflict }}</li>
                </ul>
              </div>
            </div>
          </el-alert>
        </div>

        <el-form-item label="替班原因" prop="reason">
          <el-input 
            v-model="form.reason" 
            type="textarea" 
            :rows="3"
            placeholder="请详细说明替班原因，如：原值班人员临时有事、生病等"
          />
        </el-form-item>

        <el-form-item v-if="form.replacementType === 'temporary'" label="替班时间">
          <el-radio-group v-model="form.timeScope">
            <el-radio value="current_shift">仅当前班次</el-radio>
            <el-radio value="full_day">整天</el-radio>
            <el-radio value="custom">自定义时间段</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.timeScope === 'custom'" label="时间段">
          <el-time-picker
            v-model="form.customTimeRange"
            is-range
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="HH:mm"
            value-format="HH:mm"
          />
        </el-form-item>

        <el-form-item label="备注">
          <el-input 
            v-model="form.remarks" 
            type="textarea" 
            placeholder="其他需要说明的信息"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="submitting">
        {{ form.replacementType === 'permanent' ? '确认替换' : '确认替班' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import apiClient from '@/api';
import type { FormInstance } from 'element-plus';

interface Employee {
  id: number;
  name: string;
  department: string;
  position: string;
  level: number;
  status: string;
}

interface Schedule {
  id: number;
  employeeId: number;
  employee: Employee;
  positionId: number;
  position: {
    id: number;
    name: string;
    color: string;
  };
  shift: string;
  date: string;
}

const props = defineProps<{
  visible: boolean;
  originalSchedule?: Schedule;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'replacement-created': [];
}>();

const availableEmployees = ref<Employee[]>([]);
const selectedReplacementEmployee = ref<Employee | null>(null);
const replacementConflicts = ref<string[]>([]);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const form = ref({
  replacementEmployeeId: null,
  replacementType: 'temporary',
  reason: '',
  timeScope: 'current_shift',
  customTimeRange: null,
  remarks: '',
});

const formRules = {
  replacementEmployeeId: [
    { required: true, message: '请选择替班人员', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请填写替班原因', trigger: 'blur' },
    { min: 5, message: '替班原因至少5个字符', trigger: 'blur' }
  ],
  replacementType: [
    { required: true, message: '请选择替班类型', trigger: 'change' }
  ]
};

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

watch(dialogVisible, async (visible) => {
  if (visible && props.originalSchedule) {
    await fetchAvailableEmployees();
    resetForm();
  }
});

const resetForm = () => {
  form.value = {
    replacementEmployeeId: null,
    replacementType: 'temporary',
    reason: '',
    timeScope: 'current_shift',
    customTimeRange: null,
    remarks: '',
  };
  selectedReplacementEmployee.value = null;
  replacementConflicts.value = [];
  formRef.value?.resetFields();
};

const fetchAvailableEmployees = async () => {
  try {
    const date = props.originalSchedule?.date;
    const positionId = props.originalSchedule?.positionId;
    
    const response = await apiClient.get('/employee/available-for-replacement', {
      params: { date, positionId, excludeEmployeeId: props.originalSchedule?.employeeId }
    });
    
    availableEmployees.value = response.data;
  } catch (error) {
    console.error('获取可用员工失败:', error);
    // 降级到获取所有员工
    try {
      const response = await apiClient.get('/employee');
      availableEmployees.value = response.data.filter(
        (emp: Employee) => emp.id !== props.originalSchedule?.employeeId
      );
    } catch (fallbackError) {
      ElMessage.error('获取可用员工失败');
    }
  }
};

const onReplacementEmployeeChange = async (employeeId: number) => {
  const employee = availableEmployees.value.find(emp => emp.id === employeeId);
  selectedReplacementEmployee.value = employee || null;
  
  if (employee && props.originalSchedule) {
    await checkReplacementConflicts(employee);
  }
};

const checkReplacementConflicts = async (employee: Employee) => {
  const conflicts: string[] = [];
  
  // 检查级别匹配
  if (employee.level > props.originalSchedule!.employee.level) {
    conflicts.push(`替班人员级别(${employee.level}级)低于原值班人员(${props.originalSchedule!.employee.level}级)`);
  }
  
  // 检查状态
  if (employee.status !== '在岗') {
    conflicts.push(`替班人员当前状态为"${employee.status}"，可能影响值班`);
  }
  
  // 检查是否有其他值班冲突
  try {
    const response = await apiClient.get(`/schedules/conflicts/employee/${employee.id}`, {
      params: { date: props.originalSchedule!.date }
    });
    
    if (response.data.length > 0) {
      conflicts.push('替班人员在同一天已有其他值班安排');
    }
  } catch (error) {
    console.error('检查冲突失败:', error);
  }
  
  replacementConflicts.value = conflicts;
};

const getShiftDisplayName = (shift: string) => {
  const shiftMap: Record<string, string> = {
    'all-day': '全天',
    'day': '白班',
    'night': '夜班',
    'morning': '上午',
    'afternoon': '下午',
  };
  return shiftMap[shift] || shift;
};

const getEmployeeAvatar = (employee: Employee) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee?.name || 'default'}`;
};

const getLevelTagType = (level: number) => {
  if (level <= 2) return 'danger'; // 高级别
  if (level <= 3) return 'warning'; // 中级别
  return 'info'; // 低级别
};

const getStatusTagType = (status?: string) => {
  const statusMap: Record<string, string> = {
    '在岗': 'success',
    '请假': 'warning',
    '出差': 'info',
    '病假': 'danger',
  };
  return statusMap[status || '在岗'] || 'info'; // 确保总是返回有效的类型
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    if (form.value.timeScope === 'custom' && !form.value.customTimeRange) {
      ElMessage.warning('请选择自定义时间段');
      return;
    }
    
    submitting.value = true;
    
    try {
      const submitData = {
        scheduleId: props.originalSchedule!.id,
        originalEmployeeId: props.originalSchedule!.employeeId,
        replacementEmployeeId: form.value.replacementEmployeeId,
        replacementType: form.value.replacementType,
        reason: form.value.reason,
        timeScope: form.value.timeScope,
        customTimeRange: form.value.customTimeRange,
        remarks: form.value.remarks,
      };

      await apiClient.post('/schedule-replacements', submitData);

      ElMessage.success(
        form.value.replacementType === 'permanent' ? '替换成功' : '替班安排成功'
      );
      
      emit('replacement-created');
      dialogVisible.value = false;
    } catch (error) {
      console.error('替班操作失败:', error);
      ElMessage.error('操作失败，请重试');
    } finally {
      submitting.value = false;
    }
  });
};
</script>

<style scoped>
.replacement-form {
  max-height: 70vh;
  overflow-y: auto;
}

.original-info h4 {
  margin-bottom: 12px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.info-card {
  margin-bottom: 24px;
  border-radius: 8px;
}

.schedule-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.employee-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.employee-basic {
  display: flex;
  align-items: center;
  gap: 8px;
}

.employee-name {
  font-weight: 500;
}

.replacement-employee-detail {
  margin: 16px 0;
}

.employee-detail-content p {
  margin: 8px 0;
  font-size: 14px;
}

.conflicts {
  margin-top: 12px;
  padding: 8px;
  background-color: #fef0f0;
  border-radius: 4px;
}

.conflicts ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.conflicts li {
  color: #f56c6c;
  font-size: 13px;
  margin-bottom: 4px;
}
</style>