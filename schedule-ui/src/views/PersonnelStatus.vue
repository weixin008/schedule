<template>
  <el-card shadow="never">
    <template #header>
      <div class="page-header">
        <span>人员状态管理</span>
        <el-button type="primary" @click="openStatusDialog">添加状态记录</el-button>
      </div>
    </template>
    
    <el-table :data="statusRecords" style="width: 100%">
      <el-table-column prop="employee.name" label="员工姓名" width="120" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)">
            {{ getStatusName(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="startDate" label="开始日期" width="120" />
      <el-table-column prop="endDate" label="结束日期" width="120" />
      <el-table-column prop="reason" label="原因" />
      <el-table-column prop="approvalStatus" label="审批状态" width="100">
        <template #default="scope">
          <el-tag :type="getApprovalType(scope.row.approvalStatus)">
            {{ getApprovalName(scope.row.approvalStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button v-if="scope.row.approvalStatus === 'PENDING'" size="small" type="success" @click="approveStatus(scope.row.id)">批准</el-button>
          <el-button v-if="scope.row.approvalStatus === 'PENDING'" size="small" type="danger" @click="rejectStatus(scope.row.id)">拒绝</el-button>
          <el-button size="small" @click="editStatus(scope.row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 状态记录对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEditing ? '编辑状态' : '添加状态记录'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="员工" required>
          <el-select v-model="form.employeeId" placeholder="请选择员工" style="width: 100%">
            <el-option 
              v-for="employee in employees" 
              :key="employee.id" 
              :label="employee.name" 
              :value="employee.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态类型" required>
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
            <el-option label="请假" value="ON_LEAVE" />
            <el-option label="出差" value="BUSINESS_TRIP" />
            <el-option label="病假" value="SICK_LEAVE" />
            <el-option label="休假" value="VACATION" />
            <el-option label="培训" value="TRAINING" />
            <el-option label="临时不可用" value="TEMPORARY_UNAVAILABLE" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" required>
          <el-date-picker v-model="form.startDate" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期" required>
          <el-date-picker v-model="form.endDate" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="form.reason" type="textarea" placeholder="请输入原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import apiClient from '@/api';

const statusRecords = ref([]);
const employees = ref([]);
const dialogVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);

const form = reactive({
  employeeId: null,
  status: '',
  startDate: '',
  endDate: '',
  reason: ''
});

const getStatusType = (status?: string) => {
  const types = {
    'AVAILABLE': 'success',
    'ON_LEAVE': 'warning',
    'BUSINESS_TRIP': 'info',
    'SICK_LEAVE': 'danger',
    'VACATION': 'success',
    'TRAINING': 'info',
    'TEMPORARY_UNAVAILABLE': 'warning'
  };
  return types[status || 'AVAILABLE'] || 'info'; // 确保总是返回有效的类型
};

const getStatusName = (status: string) => {
  const names = {
    'AVAILABLE': '可用',
    'ON_LEAVE': '请假',
    'BUSINESS_TRIP': '出差',
    'SICK_LEAVE': '病假',
    'VACATION': '休假',
    'TRAINING': '培训',
    'TEMPORARY_UNAVAILABLE': '临时不可用'
  };
  return names[status] || status;
};

const getApprovalType = (status?: string) => {
  const types = {
    'PENDING': 'warning',
    'APPROVED': 'success',
    'REJECTED': 'danger'
  };
  return types[status || 'PENDING'] || 'warning'; // 确保总是返回有效的类型
};

const getApprovalName = (status: string) => {
  const names = {
    'PENDING': '待审批',
    'APPROVED': '已批准',
    'REJECTED': '已拒绝'
  };
  return names[status] || status;
};

const fetchStatusRecords = async () => {
  try {
    const response = await apiClient.get('/employee-status');
    statusRecords.value = response.data;
  } catch (error) {
    ElMessage.error('获取状态记录失败');
  }
};

const fetchEmployees = async () => {
  try {
    const response = await apiClient.get('/employee');
    employees.value = response.data;
  } catch (error) {
    ElMessage.error('获取员工列表失败');
  }
};

const openStatusDialog = () => {
  isEditing.value = false;
  editingId.value = null;
  Object.assign(form, {
    employeeId: null,
    status: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  dialogVisible.value = true;
};

const editStatus = (record: any) => {
  isEditing.value = true;
  editingId.value = record.id;
  Object.assign(form, {
    employeeId: record.employeeId,
    status: record.status,
    startDate: record.startDate,
    endDate: record.endDate,
    reason: record.reason
  });
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  try {
    if (isEditing.value) {
      await apiClient.patch(`/employee-status/${editingId.value}`, form);
      ElMessage.success('状态更新成功');
    } else {
      await apiClient.post('/employee-status', form);
      ElMessage.success('状态记录创建成功');
    }
    dialogVisible.value = false;
    await fetchStatusRecords();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const approveStatus = async (id: number) => {
  try {
    await apiClient.post(`/employee-status/${id}/approve`);
    ElMessage.success('状态已批准');
    await fetchStatusRecords();
  } catch (error) {
    ElMessage.error('批准失败');
  }
};

const rejectStatus = async (id: number) => {
  try {
    await apiClient.post(`/employee-status/${id}/reject`);
    ElMessage.success('状态已拒绝');
    await fetchStatusRecords();
  } catch (error) {
    ElMessage.error('拒绝失败');
  }
};

onMounted(() => {
  fetchStatusRecords();
  fetchEmployees();
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>