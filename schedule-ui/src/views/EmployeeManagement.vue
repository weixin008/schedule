<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import apiClient from '@/api';
import { Plus, ArrowDown, WarningFilled, UserFilled, Calendar, User } from '@element-plus/icons-vue';
import {
  ElCard,
  ElTable,
  ElTableColumn,
  ElButton,
  ElIcon,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElDatePicker,
  ElSelect,
  ElOption,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElCheckbox,
  ElTag,
} from 'element-plus';
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();

const employees = ref([]);
const dialogVisible = ref(false);
const addEmployeeForm = reactive({
  username: '',
  name: '',
  joinDate: '',
  status: 'ON_DUTY', // 员工状态：在岗
  statusStartDate: '', // 状态开始日期
  statusEndDate: '', // 状态结束日期
  isLongTerm: false, // 是否长期
  phone: '',
  tags: [], // 员工标签
  department: '', // 部门名称
  position: '', // 岗位名称
  organizationPosition: '', // 组织岗位
});

// 部门和岗位数据
const departments = ref([]);
const positions = ref([]);

// 获取部门列表
const fetchDepartments = async () => {
  try {
    const response = await apiClient.get('/department');
    departments.value = response.data;
  } catch (error) {
    console.error('获取部门列表失败:', error);
  }
};

// 获取岗位列表
const fetchPositions = async () => {
  try {
    const response = await apiClient.get('/position');
    positions.value = response.data;
  } catch (error) {
    console.error('获取岗位列表失败:', error);
  }
};

// 生成员工工号
const generateEmployeeNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const time = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
  addEmployeeForm.username = `EMP${year}${month}${day}${time}`;
};


const isEditing = ref(false);
const editingEmployeeId = ref(null);

// 格式化状态时间显示
const formatStatusTime = (employee) => {
  if (employee.status === 'ON_DUTY') return '-';
  
  if (employee.status === 'RESIGNED') {
    return employee.statusStartDate ? 
      new Date(employee.statusStartDate).toLocaleDateString('zh-CN') : '';
  }
  
  const startDate = employee.statusStartDate ? 
    new Date(employee.statusStartDate).toLocaleDateString('zh-CN') : '';
  
  if (employee.isLongTerm) {
    return `${startDate} (长期)`;
  }
  
  if (employee.statusEndDate) {
    const endDate = new Date(employee.statusEndDate).toLocaleDateString('zh-CN');
    return `${startDate} 至 ${endDate}`;
  }
  
  return startDate;
};

const fetchEmployees = async () => {
  try {
    const response = await apiClient.get('/employees');
    employees.value = response.data;
  } catch (error) {
    ElMessage.error('获取员工列表失败');
  }
};

// 状态处理方法
const getStatusType = (status) => {
  switch (status) {
    case 'ON_DUTY': return 'success';
    case 'LEAVE': return 'warning';
    case 'BUSINESS_TRIP': return 'info';
    case 'TRANSFER': return 'primary';
    case 'RESIGNED': return 'danger';
    default: return 'info';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'ON_DUTY': return '在岗';
    case 'LEAVE': return '请假';
    case 'BUSINESS_TRIP': return '出差';
    case 'TRANSFER': return '调动';
    case 'RESIGNED': return '离职';
    default: return '未知';
  }
};

// 更改员工状态
const statusDialogVisible = ref(false);
const statusForm = reactive({
  employeeId: null,
  status: '',
  statusStartDate: '',
  statusEndDate: '',
  isLongTerm: false
});

const handleChangeStatus = (employee, newStatus) => {
  statusForm.employeeId = employee.id;
  statusForm.status = newStatus;
  statusForm.statusStartDate = new Date().toISOString().split('T')[0];
  statusForm.statusEndDate = '';
  statusForm.isLongTerm = false;
  statusDialogVisible.value = true;
};

const confirmStatusChange = async () => {
  try {
    const employee = employees.value.find(emp => emp.id === statusForm.employeeId);
    if (!employee) {
      ElMessage.error('未找到员工信息');
      return;
    }
    
    // 只发送需要更新的字段，避免发送只读字段
    const updateData: any = {
      status: statusForm.status,
      isLongTerm: statusForm.isLongTerm
    };
    
    // 只在有值时添加日期字段
    if (statusForm.status !== 'ON_DUTY' && statusForm.statusStartDate) {
      updateData.statusStartDate = statusForm.statusStartDate;
    }
    
    if (!statusForm.isLongTerm && statusForm.statusEndDate) {
      updateData.statusEndDate = statusForm.statusEndDate;
    }
    
    await apiClient.patch(`/employees/${statusForm.employeeId}`, updateData);
    ElMessage.success('状态更新成功');
    statusDialogVisible.value = false;
    fetchEmployees();
  } catch (error) {
    console.error('更新状态失败:', error);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
      
      let errorMessage = '更新状态失败';
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data && typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      }
      ElMessage.error(errorMessage);
    } else {
      ElMessage.error(`更新状态失败: ${error.message}`);
    }
  }
};

onMounted(() => {
  fetchEmployees();
  fetchDepartments();
  fetchPositions();
});

const handleOpenAddDialog = () => {
  // Reset form
  isEditing.value = false;
  editingEmployeeId.value = null;
  Object.assign(addEmployeeForm, {
    username: '',
    name: '',
    joinDate: '',
    status: 'ON_DUTY',
    statusStartDate: '',
    statusEndDate: '',
    isLongTerm: false,
    phone: '',
    tags: [],
    department: '',
    position: '',
    organizationPosition: '',
  });
  dialogVisible.value = true;
};

const handleAddEmployee = async () => {
  // 验证必填字段
  if (!addEmployeeForm.name) {
    ElMessage.error('请填写姓名');
    return;
  }

  try {
    // 如果工号为空，自动生成
    if (!addEmployeeForm.username || !addEmployeeForm.username.trim()) {
      generateEmployeeNumber();
    }

    // 准备提交的数据，确保日期格式正确
    const submitData = {
      ...addEmployeeForm,
      joinDate: addEmployeeForm.joinDate ? new Date(addEmployeeForm.joinDate).toISOString().split('T')[0] : null,
      statusStartDate: addEmployeeForm.status === 'ON_DUTY' ? null : 
                      (addEmployeeForm.statusStartDate ? new Date(addEmployeeForm.statusStartDate).toISOString().split('T')[0] : null),
      statusEndDate: addEmployeeForm.isLongTerm ? null : 
                    (addEmployeeForm.statusEndDate ? new Date(addEmployeeForm.statusEndDate).toISOString().split('T')[0] : null)
    };

    // 提交员工数据

    if (isEditing.value) {
      await apiClient.patch(`/employees/${editingEmployeeId.value}`, submitData);
      ElMessage.success('员工信息更新成功');
    } else {
      await apiClient.post('/employees', submitData);
      ElMessage.success('新增员工成功');
    }
    dialogVisible.value = false;
    await fetchEmployees();
  } catch (err) {
    let errorMessage = isEditing.value ? '更新员工失败' : '新增员工失败';
    const error = err as any;
    
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.response && error.response.data) {
      errorMessage = `操作失败: ${JSON.stringify(error.response.data)}`;
    } else if (error.message) {
      errorMessage = `操作失败: ${error.message}`;
    } else {
      errorMessage = '操作失败，未知错误';
    }
    
    ElMessage.error(errorMessage);
  }
};

const handleEdit = (employee: any) => {
  isEditing.value = true;
  editingEmployeeId.value = employee.id;
  Object.assign(addEmployeeForm, {
    username: employee.username,
    name: employee.name,
    joinDate: employee.joinDate,
    status: employee.status || 'ON_DUTY',
    statusStartDate: employee.statusStartDate || '',
    statusEndDate: employee.statusEndDate || '',
    isLongTerm: employee.isLongTerm || false,
    phone: employee.phone,
    tags: employee.tags || [],
    department: employee.departmentInfo?.name || employee.department || '',
    position: employee.positionInfo?.name || employee.position || '',
    organizationPosition: employee.organizationPosition || '',
  });
  dialogVisible.value = true;
};

const handleDelete = async (employee: any) => {
  try {
    // 首先检查删除冲突
    const conflictsResponse = await apiClient.get(`/employees/${employee.id}/deletion-conflicts`);
    const conflicts = conflictsResponse.data;
    
    if (conflicts.hasConflicts) {
      // 显示智能删除对话框
      showSmartDeleteDialog(employee, conflicts);
    } else {
      // 没有冲突，直接删除
      await ElMessageBox.confirm(
        `确定要删除员工 ${employee.name} 吗？`,
        '确认删除',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
      
      await apiClient.delete(`/employees/${employee.id}`);
      ElMessage.success('删除员工成功');
      await fetchEmployees();
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除员工失败:', error);
      let errorMessage = '删除员工失败';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = `删除失败: ${error.message}`;
      }
      ElMessage.error(errorMessage);
    }
  }
};

// 智能删除对话框相关
const smartDeleteDialogVisible = ref(false);
const currentEmployee = ref(null);
const currentConflicts = ref(null);
const deleteOptions = reactive({
  autoRemoveFromRoles: true,
  autoRemoveFromGroups: true,
  setResignedInsteadOfDelete: false,
  forceDelete: false
});

const showSmartDeleteDialog = (employee: any, conflicts: any) => {
  currentEmployee.value = employee;
  currentConflicts.value = conflicts;
  
  // 根据冲突情况设置默认选项
  deleteOptions.autoRemoveFromRoles = conflicts.shiftRoles && conflicts.shiftRoles.length > 0;
  deleteOptions.autoRemoveFromGroups = conflicts.groups && conflicts.groups.length > 0;
  deleteOptions.setResignedInsteadOfDelete = conflicts.futureSchedules && conflicts.futureSchedules.length > 0;
  deleteOptions.forceDelete = false;
  
  smartDeleteDialogVisible.value = true;
};

const executeSmartDelete = async () => {
  try {
    const response = await apiClient.post(`/employees/${currentEmployee.value.id}/smart-delete`, deleteOptions);
    
    ElMessage.success(response.data.message);
    smartDeleteDialogVisible.value = false;
    await fetchEmployees();
  } catch (error: any) {
    console.error('智能删除失败:', error);
    let errorMessage = '删除操作失败';
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    ElMessage.error(errorMessage);
  }
};

const getConflictSummary = (conflicts: any) => {
  const items = [];
  if (conflicts.shiftRoles && conflicts.shiftRoles.length > 0) {
    items.push(`${conflicts.shiftRoles.length}个值班角色`);
  }
  if (conflicts.futureSchedules && conflicts.futureSchedules.length > 0) {
    items.push(`${conflicts.futureSchedules.length}条未来排班`);
  }
  if (conflicts.groups && conflicts.groups.length > 0) {
    items.push(`${conflicts.groups.length}个分组`);
  }
  return items.join('、');
};
</script>

<template>
  <div class="employee-management">
    <el-card shadow="never" class="main-card">
      <template #header>
        <div class="page-header">
          <h2 class="page-title">员工管理</h2>
          <el-button type="primary" @click="handleOpenAddDialog" class="add-button">
            <el-icon><Plus /></el-icon>
            新增员工
          </el-button>
        </div>
      </template>
      
      <div class="table-container">
        <el-table :data="employees" style="width: 100%" class="employee-table" stripe>
          <el-table-column prop="username" label="工号" width="140" show-overflow-tooltip />
          <el-table-column prop="name" label="姓名" width="100" show-overflow-tooltip />
          <el-table-column label="部门" width="120" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.departmentInfo?.name || scope.row.department || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="岗位" width="120" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.positionInfo?.name || scope.row.position || scope.row.organizationPosition || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="joinDate" label="入职日期" width="110">
            <template #default="scope">
              {{ scope.row.joinDate ? new Date(scope.row.joinDate).toLocaleDateString('zh-CN') : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)" size="small">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态时间" width="160" show-overflow-tooltip>
            <template #default="scope">
              {{ formatStatusTime(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column prop="phone" label="电话" width="120" show-overflow-tooltip />
          <el-table-column label="标签" min-width="150" show-overflow-tooltip>
            <template #default="scope">
              <div class="tags-container">
                <el-tag 
                  v-for="tag in scope.row.tags" 
                  :key="tag" 
                  size="small" 
                  class="tag-item"
                >
                  {{ tag }}
                </el-tag>
                <span v-if="!scope.row.tags || scope.row.tags.length === 0" class="no-tags">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right">
        <template #default="scope">
          <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
          <el-dropdown v-if="scope.row.status !== 'RESIGNED'" trigger="click">
            <el-button size="small" type="primary">
              状态变更<el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="scope.row.status !== 'ON_DUTY'" @click="handleChangeStatus(scope.row, 'ON_DUTY')">
                  设为在岗
                </el-dropdown-item>
                <el-dropdown-item v-if="scope.row.status === 'ON_DUTY'" @click="handleChangeStatus(scope.row, 'LEAVE')">
                  请假
                </el-dropdown-item>
                <el-dropdown-item v-if="scope.row.status === 'ON_DUTY'" @click="handleChangeStatus(scope.row, 'BUSINESS_TRIP')">
                  出差
                </el-dropdown-item>
                <el-dropdown-item v-if="scope.row.status === 'ON_DUTY'" @click="handleChangeStatus(scope.row, 'TRANSFER')">
                  调动
                </el-dropdown-item>
                <el-dropdown-item @click="handleChangeStatus(scope.row, 'RESIGNED')">
                  离职
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>

  <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑员工' : '新增员工'" width="500">
    <el-form :model="addEmployeeForm" label-width="80px">
      <el-form-item label="工号">
        <el-input v-model="addEmployeeForm.username" placeholder="留空自动生成，或手动输入工号">
          <template #append>
            <el-button @click="generateEmployeeNumber">自动生成</el-button>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="姓名" required>
        <el-input v-model="addEmployeeForm.name" placeholder="请输入员工姓名" />
      </el-form-item>
      <el-form-item label="部门">
        <el-select 
          v-model="addEmployeeForm.department" 
          placeholder="请选择或输入部门" 
          style="width: 100%" 
          clearable
          filterable
          allow-create
          default-first-option
        >
          <el-option 
            v-for="dept in departments" 
            :key="dept.id" 
            :label="dept.name" 
            :value="dept.name" 
          />
        </el-select>
      </el-form-item>
      <el-form-item label="岗位">
        <el-select 
          v-model="addEmployeeForm.position" 
          placeholder="请选择或输入岗位" 
          style="width: 100%" 
          clearable
          filterable
          allow-create
          default-first-option
        >
          <el-option 
            v-for="pos in positions" 
            :key="pos.id" 
            :label="pos.name" 
            :value="pos.name" 
          />
        </el-select>
      </el-form-item>
      <el-form-item label="组织岗位">
        <el-input v-model="addEmployeeForm.organizationPosition" placeholder="可选：如科主任、护士长等" />
      </el-form-item>
      <el-form-item label="入职日期">
        <el-date-picker
          v-model="addEmployeeForm.joinDate"
          type="date"
          placeholder="选择入职日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="addEmployeeForm.status" placeholder="请选择状态" style="width: 100%">
          <el-option label="在岗" value="ON_DUTY" />
          <el-option label="请假" value="LEAVE" />
          <el-option label="出差" value="BUSINESS_TRIP" />
          <el-option label="调动" value="TRANSFER" />
          <el-option label="离职" value="RESIGNED" />
        </el-select>
      </el-form-item>
      <el-form-item label="开始日期" v-if="addEmployeeForm.status !== 'ON_DUTY'">
        <el-date-picker
          v-model="addEmployeeForm.statusStartDate"
          type="date"
          placeholder="选择开始日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      <el-form-item v-if="addEmployeeForm.status !== 'ON_DUTY' && addEmployeeForm.status !== 'RESIGNED'">
        <el-checkbox v-model="addEmployeeForm.isLongTerm">长期</el-checkbox>
      </el-form-item>
      <el-form-item label="结束日期" v-if="addEmployeeForm.status !== 'ON_DUTY' && addEmployeeForm.status !== 'RESIGNED' && !addEmployeeForm.isLongTerm">
        <el-date-picker
          v-model="addEmployeeForm.statusEndDate"
          type="date"
          placeholder="选择结束日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      <el-form-item label="电话">
        <el-input v-model="addEmployeeForm.phone" placeholder="请输入联系电话" />
      </el-form-item>
      <el-form-item label="标签">
        <el-select
          v-model="addEmployeeForm.tags"
          multiple
          filterable
          allow-create
          placeholder="选择或输入员工标签"
          style="width: 100%"
        >
          <el-option label="医生" value="医生" />
          <el-option label="护士" value="护士" />
          <el-option label="领导" value="领导" />
          <el-option label="管理员" value="管理员" />
          <el-option label="技师" value="技师" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddEmployee"> 确定 </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 状态变更对话框 -->
  <el-dialog v-model="statusDialogVisible" title="变更员工状态" width="400">
    <el-form :model="statusForm" label-width="80px">
      <el-form-item label="新状态">
        <el-tag :type="getStatusType(statusForm.status)">
          {{ getStatusText(statusForm.status) }}
        </el-tag>
      </el-form-item>
      <el-form-item label="开始日期" v-if="statusForm.status !== 'ON_DUTY'">
        <el-date-picker
          v-model="statusForm.statusStartDate"
          type="date"
          placeholder="选择开始日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      <el-form-item v-if="statusForm.status !== 'ON_DUTY' && statusForm.status !== 'RESIGNED'">
        <el-checkbox v-model="statusForm.isLongTerm">长期</el-checkbox>
      </el-form-item>
      <el-form-item label="结束日期" v-if="statusForm.status !== 'ON_DUTY' && statusForm.status !== 'RESIGNED' && !statusForm.isLongTerm">
        <el-date-picker
          v-model="statusForm.statusEndDate"
          type="date"
          placeholder="选择结束日期"
          style="width: 100%"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStatusChange">确定</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 智能删除对话框 -->
  <el-dialog v-model="smartDeleteDialogVisible" title="删除员工" width="600" class="smart-delete-dialog">
    <div v-if="currentEmployee && currentConflicts" class="delete-content">
      <div class="employee-info">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <div class="info-text">
          <h3>员工"{{ currentEmployee.name }}"存在关联数据</h3>
          <p class="conflict-summary">该员工在 {{ getConflictSummary(currentConflicts) }} 中被引用</p>
        </div>
      </div>

      <!-- 冲突详情 -->
      <div class="conflicts-detail">
        <div v-if="currentConflicts.shiftRoles && currentConflicts.shiftRoles.length > 0" class="conflict-section">
          <h4><el-icon><UserFilled /></el-icon> 值班角色 ({{ currentConflicts.shiftRoles.length }}个)</h4>
          <ul class="conflict-list">
            <li v-for="role in currentConflicts.shiftRoles" :key="role.id">
              {{ role.name }}
              <span v-if="role.description" class="role-desc">- {{ role.description }}</span>
            </li>
          </ul>
        </div>

        <div v-if="currentConflicts.futureSchedules && currentConflicts.futureSchedules.length > 0" class="conflict-section">
          <h4><el-icon><Calendar /></el-icon> 未来排班 ({{ currentConflicts.futureSchedules.length }}条)</h4>
          <ul class="conflict-list">
            <li v-for="schedule in currentConflicts.futureSchedules.slice(0, 5)" :key="schedule.id">
              {{ schedule.date }} - {{ schedule.shiftName }} ({{ schedule.roleName }})
            </li>
            <li v-if="currentConflicts.futureSchedules.length > 5" class="more-items">
              还有 {{ currentConflicts.futureSchedules.length - 5 }} 条记录...
            </li>
          </ul>
        </div>

        <div v-if="currentConflicts.groups && currentConflicts.groups.length > 0" class="conflict-section">
          <h4><el-icon><User /></el-icon> 员工分组 ({{ currentConflicts.groups.length }}个)</h4>
          <ul class="conflict-list">
            <li v-for="group in currentConflicts.groups" :key="group.id">
              {{ group.name }}
              <el-tag size="small" :type="group.type === 'FIXED_PAIR' ? 'success' : 'info'">
                {{ group.type === 'FIXED_PAIR' ? '固定搭配' : '轮换组' }}
              </el-tag>
            </li>
          </ul>
        </div>
      </div>

      <!-- 处理选项 -->
      <div class="delete-options">
        <h4>处理方式</h4>
        
        <div v-if="currentConflicts.shiftRoles && currentConflicts.shiftRoles.length > 0" class="option-item">
          <el-checkbox v-model="deleteOptions.autoRemoveFromRoles">
            自动从值班角色中移除该员工
          </el-checkbox>
          <p class="option-desc">系统将自动更新相关值班角色的人员配置</p>
        </div>

        <div v-if="currentConflicts.groups && currentConflicts.groups.length > 0" class="option-item">
          <el-checkbox v-model="deleteOptions.autoRemoveFromGroups">
            自动从员工分组中移除该员工
          </el-checkbox>
          <p class="option-desc">系统将自动更新相关分组的成员列表</p>
        </div>

        <div v-if="currentConflicts.futureSchedules && currentConflicts.futureSchedules.length > 0" class="option-item">
          <el-radio-group v-model="deleteOptions.setResignedInsteadOfDelete" class="schedule-options">
            <el-radio :value="true" class="radio-option">
              <div class="radio-content">
                <div class="radio-title">设置为离职状态（推荐）</div>
                <div class="radio-desc">保留员工信息和历史排班记录，状态改为离职</div>
              </div>
            </el-radio>
            <el-radio :value="false" class="radio-option">
              <div class="radio-content">
                <div class="radio-title">强制删除</div>
                <div class="radio-desc">删除员工信息和所有相关排班记录（不可恢复）</div>
              </div>
            </el-radio>
          </el-radio-group>
          
          <div v-if="!deleteOptions.setResignedInsteadOfDelete" class="force-delete-warning">
            <el-checkbox v-model="deleteOptions.forceDelete">
              我确认要强制删除，理解此操作不可恢复
            </el-checkbox>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="smartDeleteDialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="executeSmartDelete"
          :disabled="!deleteOptions.setResignedInsteadOfDelete && currentConflicts?.futureSchedules?.length > 0 && !deleteOptions.forceDelete"
        >
          {{ deleteOptions.setResignedInsteadOfDelete ? '设置为离职' : '确认删除' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.employee-management {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 120px);
}

.main-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.add-button {
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.add-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.table-container {
  margin-top: 20px;
}

.employee-table {
  border-radius: 8px;
  overflow: hidden;
}

.employee-table :deep(.el-table__header) {
  background-color: #f8f9fa;
}

.employee-table :deep(.el-table__header th) {
  background-color: #f8f9fa;
  color: #606266;
  font-weight: 600;
  border-bottom: 2px solid #e4e7ed;
}

.employee-table :deep(.el-table__row) {
  transition: background-color 0.3s ease;
}

.employee-table :deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

.employee-table :deep(.el-button) {
  border-radius: 6px;
  margin-right: 8px;
  transition: all 0.3s ease;
}

.employee-table :deep(.el-button:hover) {
  transform: translateY(-1px);
}

.employee-table :deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
}

/* 对话框样式优化 */
:deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

:deep(.el-dialog__header) {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e4e7ed;
}

:deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-date-editor .el-input__wrapper) {
  border-radius: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.dialog-footer .el-button {
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

/* 标签容器样式 */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.tag-item {
  margin: 0;
  border-radius: 4px;
  font-size: 12px;
}

.no-tags {
  color: #c0c4cc;
  font-style: italic;
}

/* 表格行高优化 */
.employee-table :deep(.el-table__row) {
  height: 60px;
}

.employee-table :deep(.el-table__cell) {
  padding: 8px 0;
}

/* 操作按钮组样式 */
.employee-table :deep(.el-table__fixed-right) {
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

/* 智能删除对话框样式 */
.smart-delete-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
}

.delete-content {
  max-height: 70vh;
  overflow-y: auto;
}

.employee-info {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fef7e7;
  border: 1px solid #f4d03f;
  border-radius: 8px;
  margin-bottom: 24px;
}

.warning-icon {
  font-size: 24px;
  color: #e6a23c;
  margin-top: 2px;
}

.info-text h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.conflict-summary {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.conflicts-detail {
  margin-bottom: 24px;
}

.conflict-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.conflict-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.conflict-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.conflict-list li {
  padding: 6px 0;
  color: #606266;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.role-desc {
  color: #909399;
  font-size: 12px;
}

.more-items {
  color: #909399;
  font-style: italic;
}

.delete-options {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.delete-options h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.option-item {
  margin-bottom: 20px;
}

.option-desc {
  margin: 8px 0 0 24px;
  color: #909399;
  font-size: 12px;
}

.schedule-options {
  width: 100%;
}

.radio-option {
  display: block;
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.radio-option:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.radio-option.is-checked {
  border-color: #409eff;
  background: #f0f9ff;
}

.radio-content {
  margin-left: 8px;
}

.radio-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.radio-desc {
  font-size: 12px;
  color: #909399;
}

.force-delete-warning {
  margin-top: 16px;
  padding: 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 6px;
}

.force-delete-warning :deep(.el-checkbox__label) {
  color: #f56c6c;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .employee-management {
    padding: 16px;
    max-width: 100%;
  }
  
  .page-title {
    font-size: 20px;
  }
}

@media (max-width: 768px) {
  .employee-management {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .add-button {
    width: 100%;
    justify-content: center;
  }
  
  .employee-table :deep(.el-table__body-wrapper) {
    overflow-x: auto;
  }
  
  .smart-delete-dialog {
    width: 95% !important;
  }
  
  .employee-info {
    flex-direction: column;
    text-align: center;
  }
  
  .radio-option {
    padding: 8px;
  }
}
</style> 