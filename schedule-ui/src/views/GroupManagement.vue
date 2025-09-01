<template>
  <div class="group-management">
    <!-- 功能暂不可用提示 -->
    <el-card class="notice-card">
      <div class="notice-content">
        <el-icon class="notice-icon"><Warning /></el-icon>
        <div class="notice-text">
          <h2>编组管理功能暂时不可用</h2>
          <p>该功能正在优化升级中，请使用"值班角色配置"功能进行人员分组管理。</p>
          <div class="notice-actions">
            <el-button type="primary" @click="goToRoles">
              <el-icon><UserFilled /></el-icon>
              前往值班角色配置
            </el-button>
            <el-button @click="goToEmployees">
              <el-icon><User /></el-icon>
              员工管理
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 原有内容隐藏 -->
    <div v-if="false" class="original-content">
    <div class="page-header">
      <h1>编组管理</h1>
      <p class="subtitle">管理考勤监督员编组和其他值班编组</p>
    </div>

    <div class="toolbar">
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        新建编组
      </el-button>
      <el-button @click="loadGroups">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 编组列表 -->
    <el-table :data="groups" v-loading="loading" stripe>
      <el-table-column prop="name" label="编组名称" width="200" />
      <el-table-column prop="description" label="描述" />
      <el-table-column prop="type" label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="row.type === 'FIXED_PAIR' ? 'success' : 'info'">
            {{ row.type === 'FIXED_PAIR' ? '固定搭配' : '轮换组' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="成员数量" width="100">
        <template #default="{ row }">
          {{ getValidMemberCount(row) }}人
        </template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'">
            {{ row.isActive ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" @click="editGroup(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="deleteGroup(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingGroup ? '编辑编组' : '新建编组'"
      width="600px"
    >
      <el-form :model="groupForm" :rules="groupRules" ref="groupFormRef" label-width="100px">
        <el-form-item label="编组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="如：考勤监督员A组" />
        </el-form-item>
        
        <el-form-item label="编组描述" prop="description">
          <el-input
            v-model="groupForm.description"
            type="textarea"
            :rows="3"
            placeholder="描述编组的职责和要求"
          />
        </el-form-item>
        
        <el-form-item label="编组类型" prop="type">
          <el-radio-group v-model="groupForm.type">
            <el-radio value="FIXED_PAIR">固定搭配</el-radio>
            <el-radio value="ROTATION_GROUP">轮换组</el-radio>
          </el-radio-group>
          <div class="form-tip">
            <p>固定搭配：成员固定一起值班</p>
            <p>轮换组：成员按顺序轮换值班</p>
          </div>
        </el-form-item>
        
        <el-form-item label="编组成员" prop="memberIds">
          <el-select
            v-model="groupForm.memberIds"
            multiple
            placeholder="选择编组成员"
            style="width: 100%"
          >
            <el-option
              v-for="emp in employees"
              :key="emp.id"
              :label="emp.name"
              :value="emp.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="适用角色">
          <el-input
            v-model="groupForm.applicableRoles"
            placeholder="如：考勤监督员,安保人员（用逗号分隔）"
          />
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch v-model="groupForm.isActive" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveGroup" :loading="saving">
          {{ editingGroup ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
    </div> <!-- 结束原有内容 -->
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Warning, UserFilled, User } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useGroupStore } from '@/stores/group'
import { useEmployeeStore } from '@/stores/employee'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingGroup = ref(null)

const router = useRouter()
const groupStore = useGroupStore()
const employeeStore = useEmployeeStore()
const groups = ref([]) // 将使用groupStore.groups
const employees = ref([]) // 将使用employeeStore.employees

// 导航方法
const goToRoles = () => {
  router.push('/schedule/roles')
}

const goToEmployees = () => {
  router.push('/personnel/employees')
}

// 表单数据
const groupForm = reactive({
  name: '',
  description: '',
  type: 'ROTATION_GROUP',
  memberIds: [],
  applicableRoles: '',
  isActive: true
})

// 表单验证规则
const groupRules = {
  name: [
    { required: true, message: '请输入编组名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择编组类型', trigger: 'change' }
  ],
  memberIds: [
    { required: true, message: '请选择编组成员', trigger: 'change' }
  ]
}

const groupFormRef = ref()

// 初始化
onMounted(() => {
  loadGroups()
  loadEmployees()
})

// 加载编组列表
const loadGroups = async () => {
  try {
    loading.value = true
    
    // 优先尝试从API加载最新数据
    try {
      const response = await api.get('/group')
      if (response.data && response.data.length > 0) {
        // 过滤掉无效的预设分组
        groups.value = response.data.filter(group =>
          !['管理组', '技术组'].includes(group.name)
        )
        // 同步到localStorage
        localStorage.setItem('groups', JSON.stringify(groups.value));
        console.log('从API加载编组列表:', groups.value.length, '个编组')
        return;
      }
    } catch (apiError) {
      console.warn('API加载失败，尝试localStorage:', apiError);
    }
    
    // API失败或无数据时，从localStorage加载
    const localGroups = localStorage.getItem('groups');
    if (localGroups) {
      const parsedGroups = JSON.parse(localGroups);
      if (parsedGroups.length > 0) {
        // 过滤掉无效的预设分组
        groups.value = parsedGroups.filter(group =>
          !['管理组', '技术组'].includes(group.name)
        );
        console.log('从localStorage加载编组数据:', groups.value.length, '个编组');
        return;
      }
    }
    
    // 都没有数据时，初始化空数组（不再提供默认测试数据）
    groups.value = [];
    console.log('📝 初始化空编组列表，请创建新编组');
    
  } catch (error) {
    console.error('加载编组列表失败:', error)
    groups.value = [];
  } finally {
    loading.value = false
  }
}

// 计算有效的成员数量
const getValidMemberCount = (group) => {
  if (!group.memberIds || group.memberIds.length === 0) return 0;
  
  // 验证每个成员ID是否在员工列表中存在
  return group.memberIds.filter(id =>
    employeeStore.employees.some(emp => emp.id === id)
  ).length;
};

// 加载员工列表
const loadEmployees = async () => {
  try {
    const response = await api.get('/employees')
    employees.value = response.data || []
    console.log('加载员工列表:', employees.value.length, '个员工')
  } catch (error) {
    console.error('加载员工列表失败:', error)
    ElMessage.error('加载员工列表失败')
  }
}

// 显示创建对话框
const showCreateDialog = () => {
  editingGroup.value = null
  resetForm()
  dialogVisible.value = true
}

// 编辑编组
const editGroup = (group) => {
  editingGroup.value = group
  Object.assign(groupForm, {
    name: group.name,
    description: group.description || '',
    type: group.type,
    memberIds: group.memberIds || [],
    applicableRoles: group.applicableRoles?.join(',') || '',
    isActive: group.isActive
  })
  dialogVisible.value = true
}

// 保存编组
const saveGroup = async () => {
  try {
    await groupFormRef.value.validate()
    
    saving.value = true
    
    const groupData = {
      ...groupForm,
      applicableRoles: groupForm.applicableRoles
        ? groupForm.applicableRoles.split(',').map(role => role.trim()).filter(role => role)
        : []
    }
    
    if (editingGroup.value) {
      // 更新编组
      await groupStore.updateGroup({
        ...editingGroup.value,
        ...groupData
      });
      ElMessage.success('编组更新成功');
    } else {
      // 创建新编组
      await groupStore.addGroup(groupData);
      ElMessage.success('编组创建成功');
    }
    
    // 更新本地数据引用
    groups.value = groupStore.groups;
    
    dialogVisible.value = false;
  } catch (error) {
    console.error('保存编组失败:', error);
    
    // 根据错误类型显示不同消息
    if (error.response?.status === 400) {
      ElMessage.warning(error.response.data.message || '保存编组失败');
    } else {
      ElMessage.error('保存编组失败，请检查网络连接');
    }
  } finally {
    saving.value = false;
  }
}

// 删除编组（带依赖检查）
const deleteGroup = async (group) => {
  try {
    // 先检查排班规则依赖
    try {
      const response = await api.get('/schedule-rules');
      const dependentRules = response.data.filter(rule =>
        rule.assignedGroupId === group.id
      );
      
      if (dependentRules.length > 0) {
        const ruleNames = dependentRules.map(rule => rule.name).join(', ');
        ElMessage.warning(`无法删除：编组"${group.name}"被${dependentRules.length}个排班规则引用（${ruleNames}）`);
        return;
      }
    } catch (error) {
      console.error('检查排班规则依赖失败:', error);
      // 检查失败时提示用户
      await ElMessageBox.confirm(
        `无法验证排班规则依赖，确定要强制删除编组"${group.name}"吗？这可能导致排班规则失效。`,
        '依赖检查失败',
        {
          confirmButtonText: '强制删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
      );
    }
    
    // 用户确认删除
    await ElMessageBox.confirm(
      `确定要删除编组"${group.name}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 执行删除
    await groupStore.deleteGroup(group.id);
    groups.value = groupStore.groups;
    ElMessage.success('编组删除成功');
    
  } catch (error) {
    if (error === 'cancel') {
      console.log('删除操作已取消');
    } else {
      console.error('删除编组失败:', error);
      
      if (error.response?.status === 400) {
        ElMessage.warning(error.response.data.message || '无法删除编组');
      } else {
        ElMessage.error('删除编组失败');
      }
    }
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(groupForm, {
    name: '',
    description: '',
    type: 'ROTATION_GROUP',
    memberIds: [],
    applicableRoles: '',
    isActive: true
  })
  groupFormRef.value?.clearValidate()
}
</script>

<style scoped>
.group-management {
  padding: 20px;
}

/* 功能暂不可用提示样式 */
.notice-card {
  max-width: 600px;
  margin: 50px auto;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.notice-content {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 30px;
}

.notice-icon {
  font-size: 48px;
  color: #e6a23c;
  flex-shrink: 0;
}

.notice-text h2 {
  margin: 0 0 12px 0;
  font-size: 24px;
  color: #303133;
}

.notice-text p {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #606266;
  line-height: 1.6;
}

.notice-actions {
  display: flex;
  gap: 12px;
}

.notice-actions .el-button {
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
}

/* 隐藏原有内容 */
.original-content {
  display: none;
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

.toolbar {
  margin-bottom: 16px;
}

.toolbar .el-button {
  margin-right: 12px;
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.form-tip p {
  margin: 4px 0;
}
</style>