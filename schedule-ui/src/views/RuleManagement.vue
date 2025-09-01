<script lang="ts" setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import api from '../api';
import type { FormInstance } from 'element-plus';

interface Rule {
  id: number;
  name: string;
  type: string;
  params: Record<string, any>;
  description?: string;
}

interface Position {
  id: number;
  name: string;
}

const rules = ref<Rule[]>([]);
const positions = ref<Position[]>([]);
const dialogVisible = ref(false);
const dialogMode = ref('create');
const currentRuleId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = reactive({
  name: '',
  type: '',
  params: {} as Record<string, any>,
  description: '',
});

const ruleTypeOptions = [
  { value: 'MIN_REST_HOURS', label: '最小休息时间' },
  { value: 'MAX_CONSECUTIVE_SHIFTS', label: '最大连续班次' },
  { value: 'REQUIRE_POSITION', label: '要求特定岗位' },
  { value: 'AVOID_DOUBLE_SHIFTS_IN_DAY', label: '避免一天内双班' },
];

const getRuleTypeName = (type: string) => {
    return ruleTypeOptions.find(opt => opt.value === type)?.label || type;
}

const getPositionName = (positionId: number) => {
    if (!positionId) return '未设置';
    const position = positions.value.find(p => p.id === positionId);
    return position ? position.name : `岗位ID: ${positionId}`;
}

const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新增规则' : '编辑规则'));

const fetchRules = async () => {
  try {
    const response = await api.get('/schedule-rules');
    rules.value = response.data;
  } catch (error) {
    ElMessage.error('获取规则列表失败');
  }
};

const fetchPositions = async () => {
  try {
    const response = await api.get('/position');
    positions.value = response.data;
  } catch (error) {
    ElMessage.error('获取岗位列表失败');
  }
};

onMounted(() => {
  fetchRules();
  fetchPositions();
});

const onRuleTypeChange = () => {
    // Reset params when type changes
    form.params = {};
    if (form.type === 'AVOID_DOUBLE_SHIFTS_IN_DAY') {
        form.params = { active: true }; // Give it a default param
    }
}

const openDialog = (mode: 'create' | 'edit', rule?: Rule) => {
  dialogMode.value = mode;
  if (mode === 'edit' && rule) {
    currentRuleId.value = rule.id;
    form.name = rule.name;
    form.type = rule.type;
    form.params = JSON.parse(JSON.stringify(rule.params)); // Deep copy
    form.description = rule.description || '';
  } else {
    resetForm();
  }
  dialogVisible.value = true;
};

const resetForm = () => {
  currentRuleId.value = null;
  form.name = '';
  form.type = '';
  form.params = {};
  form.description = '';
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (valid) {
      const payload = { ...form };
      try {
        if (dialogMode.value === 'create') {
          await api.post('/schedule-rules', payload);
          ElMessage.success('新增成功');
        } else {
          await api.patch(`/schedule-rules/${currentRuleId.value}`, payload);
          ElMessage.success('更新成功');
        }
        dialogVisible.value = false;
        fetchRules();
      } catch (error) {
        ElMessage.error(dialogMode.value === 'create' ? '新增失败' : '更新失败');
      }
    }
  });
};

const handleDelete = (id: number) => {
  ElMessageBox.confirm('确定要删除这条规则吗?', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await api.delete(`/schedule-rules/${id}`);
      ElMessage.success('删除成功');
      fetchRules();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  });
};
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <div class="page-header">
        <span>规则管理</span>
        <el-button type="primary" @click="openDialog('create')">
          <el-icon><Plus /></el-icon>
          新增规则
        </el-button>
      </div>
    </template>

    <el-table :data="rules" style="width: 100%">
      <el-table-column prop="name" label="规则名称" />
      <el-table-column prop="type" label="规则类型">
        <template #default="scope">
          {{ getRuleTypeName(scope.row.type) }}
        </template>
      </el-table-column>
      <el-table-column label="规则详情" width="300">
        <template #default="scope">
          <div v-if="scope.row.type === 'MIN_REST_HOURS'">
            最少休息时间: {{ scope.row.params?.hours || 0 }} 小时
          </div>
          <div v-else-if="scope.row.type === 'MAX_CONSECUTIVE_SHIFTS'">
            最大连续班次: {{ scope.row.params?.days || 0 }} 天
          </div>
          <div v-else-if="scope.row.type === 'REQUIRE_POSITION'">
            要求岗位: {{ getPositionName(scope.row.params?.positionId) }}
          </div>
          <div v-else-if="scope.row.type === 'AVOID_DOUBLE_SHIFTS_IN_DAY'">
            避免同日多班次
          </div>
          <div v-else>
            {{ scope.row.description || '无描述' }}
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button size="small" @click="openDialog('edit', scope.row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" @close="resetForm">
    <el-form :model="form" ref="formRef" label-width="120px">
      <el-form-item label="规则名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="规则类型" prop="type">
        <el-select v-model="form.type" placeholder="请选择规则类型" @change="onRuleTypeChange">
          <el-option
            v-for="item in ruleTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      
      <!-- Dynamic Parameter Fields -->
      <div v-if="form.type">
        <el-form-item label="休息小时数" v-if="form.type === 'MIN_REST_HOURS'" prop="params.hours">
           <el-input-number v-model="form.params.hours" :min="1" />
        </el-form-item>

        <el-form-item label="最大连续班次" v-if="form.type === 'MAX_CONSECUTIVE_SHIFTS'" prop="params.days">
           <el-input-number v-model="form.params.days" :min="1" />
        </el-form-item>

        <el-form-item label="需要岗位" v-if="form.type === 'REQUIRE_POSITION'" prop="params.positionId">
          <el-select v-model="form.params.positionId" placeholder="选择岗位">
             <el-option v-for="pos in positions" :key="pos.id" :label="pos.name" :value="pos.id"></el-option>
          </el-select>
        </el-form-item>

         <el-form-item label="说明" v-if="form.type === 'AVOID_DOUBLE_SHIFTS_IN_DAY'">
            <span>此规则无需额外参数，将禁止任何人在一天内被安排两个班次。</span>
        </el-form-item>
      </div>
      
      <el-form-item label="描述" prop="description">
        <el-input v-model="form.description" type="textarea" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
pre {
    white-space: pre-wrap;
    word-break: break-all;
    background-color: #f5f5f5;
    padding: 8px;
    border-radius: 4px;
}
</style> 