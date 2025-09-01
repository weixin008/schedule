<template>
  <div class="page-container">
    <!-- Page Header -->
    <div class="page-header">
      <h2 class="page-title">岗位管理</h2>
      <el-button type="primary" :icon="Plus" @click="openFormDialog()">新增岗位</el-button>
    </div>

    <!-- Main Content Card -->
    <el-card class="content-card">
      <template #header>
        <div class="card-header">
          <span>岗位列表</span>
          <div class="card-toolbar">
            <el-button :icon="Refresh" circle @click="fetchPositions" />
          </div>
        </div>
      </template>

      <!-- Table -->
      <el-table :data="positions" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="岗位名称" />
        <el-table-column prop="level" label="岗位级别" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status ? 'success' : 'danger'">
              {{ row.status ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
           <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openFormDialog(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-sizes="[10, 20, 50]"
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.limit"
          @size-change="fetchPositions"
          @current-change="fetchPositions"
          :page-count-text="'共 {total} 条'"
          :total-text="'共 {total} 条'"
        />
      </div>
    </el-card>

    <!-- Form Dialog for Add/Edit -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="岗位名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="岗位级别">
          <el-input-number v-model="form.level" :min="1" />
          <div class="form-item-tip">
            <el-text size="small" type="info">
              级别数字越小权限越高，用于确定值班人员层级关系。例如：1-领导层，2-主管层，3-普通员工，4-实习生
            </el-text>
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleSubmit">确 定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, QuestionFilled } from '@element-plus/icons-vue';
import apiClient from '@/api';

const API_URL = '/position';

// Reactive State
const positions = ref([]);
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
  level: 1,
  description: '',
  status: true,
});

const isEdit = computed(() => !!form.id);
const dialogTitle = computed(() => (isEdit.value ? '编辑岗位' : '新增岗位'));

// Functions
const fetchPositions = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get(API_URL);
    const allPositions = response.data.map(d => ({ ...d, status: d.status !== false }));
    total.value = allPositions.length;
    const start = (queryParams.page - 1) * queryParams.limit;
    const end = start + queryParams.limit;
    positions.value = allPositions.slice(start, end);

  } catch (error) {
    ElMessage.error('获取岗位列表失败');
  } finally {
    loading.value = false;
  }
};

const openFormDialog = (rowData = null) => {
  if (rowData) {
    Object.assign(form, rowData);
  } else {
    form.id = null;
    form.name = '';
    form.level = 1;
    form.description = '';
    form.status = true;
  }
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  try {
    if (isEdit.value) {
      await apiClient.patch(`${API_URL}/${form.id}`, form);
      ElMessage.success('更新成功');
    } else {
      await apiClient.post(API_URL, form);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    fetchPositions();
  } catch (error) {
    ElMessage.error('操作失败');
  }
};

const handleDelete = (id: number) => {
  ElMessageBox.confirm('确定要删除该岗位吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await apiClient.delete(`${API_URL}/${id}`);
      ElMessage.success('删除成功');
      fetchPositions();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};

onMounted(() => {
  fetchPositions();
});
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}
.content-card {
  border-radius: 8px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
.form-item-tip {
  margin-top: 4px;
}
</style> 