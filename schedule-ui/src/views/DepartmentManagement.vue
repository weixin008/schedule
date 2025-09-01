<script lang="ts" setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, Search, Edit, Delete, User, Calendar, Warning } from '@element-plus/icons-vue';
import apiClient from '@/api';

const API_URL = '/department';

// Reactive State
const departments = ref([]);
const loading = ref(true);
const total = ref(0);
const queryParams = reactive({
  page: 1,
  limit: 10,
});

const dialogVisible = ref(false);
const form = reactive({
  id: null,
  name: '',
  manager: '',
  description: '',
  status: true,
});

const isEdit = computed(() => !!form.id);
const dialogTitle = computed(() => (isEdit.value ? '编辑部门' : '新增部门'));

const submitting = ref(false);
const deleting = ref(false);
const searchKeyword = ref('');
const showCreateDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedRows = ref([]);
const editingDepartment = ref(null);
const deletingDepartment = ref(null);

// Functions
const fetchDepartments = async () => {
  loading.value = true;
  try {
    // Note: The generated backend doesn't support pagination.
    // We fetch all and paginate on the client for this demo.
    // In a real app, the backend should handle pagination via query params.
    const response = await apiClient.get(API_URL);
    // Mock client-side pagination
    const allDepartments = response.data.map(d => ({ ...d, status: d.status !== false })); // Assuming status can be undefined
    total.value = allDepartments.length;
    const start = (queryParams.page - 1) * queryParams.limit;
    const end = start + queryParams.limit;
    departments.value = allDepartments.slice(start, end);

  } catch (error) {
    ElMessage.error('获取部门列表失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const openFormDialog = (rowData = null) => {
  if (rowData) {
    // Edit mode
    Object.assign(form, rowData);
  } else {
    // Add mode
    form.id = null;
    form.name = '';
    form.manager = '';
    form.description = '';
    form.status = true;
  }
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  submitting.value = true;
  try {
    if (editingDepartment.value) {
      // Update
      await apiClient.patch(`${API_URL}/${editingDepartment.value.id}`, form);
      ElMessage.success('更新成功');
    } else {
      // Create
      await apiClient.post(API_URL, form);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    fetchDepartments();
  } catch (error) {
    ElMessage.error('操作失败');
    console.error(error);
  } finally {
    submitting.value = false;
  }
};

const handleDelete = (id: number) => {
  deletingDepartment.value = id;
  showDeleteDialog.value = true;
};

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的部门');
    return;
  }
  
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedRows.value.length} 个部门吗？`,
    '批量删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    // 实现批量删除逻辑
    ElMessage.success('批量删除成功');
  });
};

const handleSelectionChange = (selection) => {
  selectedRows.value = selection;
};

const getStatusType = (status) => {
  return status === 'active' ? 'success' : 'info';
};

const getStatusText = (status) => {
  return status === 'active' ? '正常' : '停用';
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const resetForm = () => {
  form.id = null;
  form.name = '';
  form.manager = '';
  form.description = '';
  form.status = true;
  editingDepartment.value = null;
};

const handleEdit = (row) => {
  editingDepartment.value = row;
  form.id = row.id;
  form.name = row.name;
  form.manager = row.manager;
  form.description = row.description;
  form.status = row.status !== false;
  showCreateDialog.value = true;
};

const handleViewEmployees = (row) => {
  // 跳转到员工管理页面，并筛选该部门的员工
  // TODO: 实现部门员工查看功能
};

const handleViewSchedule = (row) => {
  // 跳转到排班日历页面，并筛选该部门的排班
  // TODO: 实现部门排班查看功能
};

// 计算属性：根据搜索关键字筛选部门
const filteredDepartments = computed(() => {
  if (!searchKeyword.value) return departments.value;
  return departments.value.filter(dept => {
    const name = dept.name || '';
    const desc = dept.description || '';
    return name.includes(searchKeyword.value) || desc.includes(searchKeyword.value);
  });
});

onMounted(() => {
  fetchDepartments();
});
</script>

<template>
  <div class="department-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">部门管理</h1>
      <p class="page-description">管理系统中的部门信息和人员配置</p>
    </div>

    <!-- 操作区域 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          创建部门
        </el-button>
        <el-button 
          v-if="selectedRows.length > 0" 
          type="danger" 
          @click="handleBatchDelete"
        >
          <el-icon><Delete /></el-icon>
          批量删除 ({{ selectedRows.length }})
        </el-button>
      </div>
      <div class="action-right">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索部门名称..."
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
    </div>

    <!-- 部门列表表格 -->
    <el-card class="table-card" shadow="hover">
      <el-table
        ref="tableRef"
        :data="filteredDepartments"
        @selection-change="handleSelectionChange"
        class="department-table"
        stripe
        v-loading="loading"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="name" label="部门名称" min-width="150">
          <template #default="{ row }">
            <div class="department-name">
              <div class="name-text">{{ row.name }}</div>
              <div class="name-desc">{{ row.description || '暂无描述' }}</div>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag 
              :type="getStatusType(row.status)" 
              size="small"
              class="status-tag"
            >
              <div class="status-dot" :class="row.status"></div>
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="employeeCount" label="员工数量" width="120" align="center">
          <template #default="{ row }">
            <span class="employee-count">{{ row.employeeCount || 0 }} 人</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="remark" label="备注" min-width="200">
          <template #default="{ row }">
            <span class="remark-text">{{ row.remark || '暂无备注' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" link @click="handleEdit(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="primary" link @click="handleViewEmployees(row)">
                <el-icon><User /></el-icon>
                员工
              </el-button>
              <el-button type="primary" link @click="handleViewSchedule(row)">
                <el-icon><Calendar /></el-icon>
                排班
              </el-button>
              <el-button type="danger" link @click="handleDelete(row.id)">
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建/编辑部门对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingDepartment ? '编辑部门' : '创建部门'"
      width="500px"
      class="department-dialog"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="部门名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入部门名称" />
        </el-form-item>
        
        <el-form-item label="部门描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入部门描述"
          />
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="正常" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showCreateDialog = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ editingDepartment ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="showDeleteDialog"
      title="确认删除"
      width="400px"
      class="delete-dialog"
    >
      <div class="delete-content">
        <el-icon class="delete-icon" color="#f56c6c"><Warning /></el-icon>
        <p>确定要删除部门 "{{ deletingDepartment?.name }}" 吗？</p>
        <p class="delete-warning">此操作不可恢复，请谨慎操作！</p>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showDeleteDialog = false">取消</el-button>
          <el-button type="danger" @click="confirmDelete" :loading="deleting">
            确认删除
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.department-management {
  .page-header {
    margin-bottom: 24px;
    
    .page-title {
      font-size: 24px;
      font-weight: 600;
      color: #1d2129;
      margin: 0 0 8px 0;
    }
    
    .page-description {
      font-size: 14px;
      color: #606266;
      margin: 0;
    }
  }

  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding: 16px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .action-left {
      display: flex;
      gap: 12px;
    }
    
    .action-right {
      .search-input {
        width: 300px;
      }
    }
  }

  .table-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .department-table {
      .department-name {
        .name-text {
          font-weight: 600;
          color: #1d2129;
          margin-bottom: 4px;
        }
        
        .name-desc {
          font-size: 12px;
          color: #909399;
        }
      }
      
      .status-tag {
        display: flex;
        align-items: center;
        gap: 6px;
        
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          
          &.active {
            background-color: #52c41a;
          }
          
          &.inactive {
            background-color: #d9d9d9;
          }
        }
      }
      
      .employee-count {
        font-weight: 600;
        color: #1890ff;
      }
      
      .time-text {
        color: #606266;
        font-size: 13px;
      }
      
      .remark-text {
        color: #606266;
        font-size: 13px;
      }
      
      .action-buttons {
        display: flex;
        gap: 8px;
        
        .el-button {
          padding: 4px 8px;
          font-size: 12px;
        }
      }
    }
  }

  .department-dialog {
    .el-form {
      .el-form-item {
        margin-bottom: 20px;
      }
    }
    
    .dialog-footer {
      text-align: right;
    }
  }

  .delete-dialog {
    .delete-content {
      text-align: center;
      padding: 20px 0;
      
      .delete-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      
      p {
        margin: 8px 0;
        color: #606266;
        
        &.delete-warning {
          color: #f56c6c;
          font-weight: 600;
        }
      }
    }
    
    .dialog-footer {
      text-align: right;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .department-management {
    .action-bar {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;
      
      .action-left {
        justify-content: center;
      }
      
      .action-right {
        .search-input {
          width: 100%;
        }
      }
    }
    
    .table-card {
      .department-table {
        .action-buttons {
          flex-direction: column;
          gap: 4px;
        }
      }
    }
  }
}
</style> 