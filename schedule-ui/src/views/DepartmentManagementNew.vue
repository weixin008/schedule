<template>
  <div class="department-management">
    <div class="page-header">
      <h1 class="page-title">组织架构管理</h1>
      <p class="page-description">管理部门结构和职位层级，为排班提供组织基础</p>
    </div>

    <!-- 操作工具栏 -->
    <el-card class="toolbar-card" shadow="hover">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" :icon="Plus" @click="showAddDepartmentDialog">
            添加部门
          </el-button>
          <el-button type="success" :icon="UserFilled" @click="showAddPositionDialog">
            添加职位
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索部门或职位"
            style="width: 200px"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>
    </el-card>

    <!-- 组织架构树 -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card class="tree-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>组织架构</span>
              <el-button type="primary" link @click="expandAll">
                {{ allExpanded ? '收起全部' : '展开全部' }}
              </el-button>
            </div>
          </template>
          
          <el-tree
            ref="deptTreeRef"
            :data="departmentTree"
            :props="treeProps"
            node-key="id"
            :default-expand-all="false"
            :expand-on-click-node="false"
            class="department-tree"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <div class="node-content">
                  <el-icon class="node-icon">
                    <OfficeBuilding v-if="data.type === 'department'" />
                    <User v-else />
                  </el-icon>
                  <span class="node-label">{{ data.name }}</span>
                  <el-tag v-if="data.level" size="small" class="level-tag">
                    {{ data.level }}
                  </el-tag>
                </div>
                <div class="node-actions">
                  <el-button
                    v-if="data.type === 'department'"
                    type="primary"
                    link
                    size="small"
                    @click="addPosition(data)"
                  >
                    添加职位
                  </el-button>
                  <el-button
                    type="warning"
                    link
                    size="small"
                    @click="editItem(data)"
                  >
                    编辑
                  </el-button>
                  <el-button
                    type="danger"
                    link
                    size="small"
                    @click="deleteItem(data)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </template>
          </el-tree>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <el-card class="detail-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>{{ selectedItem ? '详细信息' : '人员分配' }}</span>
              <el-button
                v-if="selectedItem && selectedItem.type === 'position'"
                type="primary"
                @click="showAssignDialog = true"
              >
                分配人员
              </el-button>
            </div>
          </template>
          
          <div v-if="selectedItem" class="item-detail">
            <div class="detail-info">
              <div class="info-item">
                <span class="info-label">名称:</span>
                <span class="info-value">{{ selectedItem.name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">类型:</span>
                <span class="info-value">{{ selectedItem.type === 'department' ? '部门' : '职位' }}</span>
              </div>
              <div v-if="selectedItem.level" class="info-item">
                <span class="info-label">级别:</span>
                <span class="info-value">{{ selectedItem.level }}</span>
              </div>
              <div v-if="selectedItem.description" class="info-item">
                <span class="info-label">描述:</span>
                <span class="info-value">{{ selectedItem.description }}</span>
              </div>
            </div>
            
            <!-- 人员列表 -->
            <div v-if="selectedItem.type === 'position'" class="personnel-list">
              <h4>分配人员 ({{ assignedPersonnel.length }}人)</h4>
              <div v-if="assignedPersonnel.length === 0" class="empty-personnel">
                暂无分配人员
              </div>
              <div v-else class="personnel-grid">
                <div
                  v-for="person in assignedPersonnel"
                  :key="person.id"
                  class="personnel-item"
                >
                  <div class="person-info">
                    <div class="person-name">{{ person.name }}</div>
                    <div class="person-details">{{ person.username }} | {{ person.phone }}</div>
                  </div>
                  <el-button
                    type="danger"
                    link
                    size="small"
                    @click="removePersonFromPosition(person)"
                  >
                    移除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="no-selection">
            <el-empty description="请选择部门或职位查看详情" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加部门对话框 -->
    <el-dialog v-model="showDeptDialog" :title="deptDialogTitle" width="500px">
      <el-form :model="deptForm" label-width="80px">
        <el-form-item label="部门名称" required>
          <el-input v-model="deptForm.name" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="上级部门">
          <el-select v-model="deptForm.parentId" placeholder="请选择上级部门" style="width: 100%">
            <el-option label="无上级部门" :value="null" />
            <el-option
              v-for="dept in flatDepartments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部门描述">
          <el-input
            v-model="deptForm.description"
            type="textarea"
            placeholder="请输入部门描述"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showDeptDialog = false">取消</el-button>
        <el-button type="primary" @click="saveDepartment" :loading="saving">
          {{ deptForm.id ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 添加职位对话框 -->
    <el-dialog v-model="showPosDialog" :title="posDialogTitle" width="500px">
      <el-form :model="posForm" label-width="80px">
        <el-form-item label="职位名称" required>
          <el-input v-model="posForm.name" placeholder="请输入职位名称" />
        </el-form-item>
        <el-form-item label="所属部门" required>
          <el-select v-model="posForm.departmentId" placeholder="请选择所属部门" style="width: 100%">
            <el-option
              v-for="dept in flatDepartments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="职位级别">
          <el-select v-model="posForm.level" placeholder="请选择职位级别" style="width: 100%">
            <el-option label="领导" value="领导" />
            <el-option label="副职" value="副职" />
            <el-option label="主管" value="主管" />
            <el-option label="科长" value="科长" />
            <el-option label="副科长" value="副科长" />
            <el-option label="股长" value="股长" />
            <el-option label="主任" value="主任" />
            <el-option label="副主任" value="副主任" />
            <el-option label="科员" value="科员" />
            <el-option label="医师" value="医师" />
            <el-option label="护士" value="护士" />
            <el-option label="一般员工" value="一般员工" />
          </el-select>
        </el-form-item>
        <el-form-item label="职位描述">
          <el-input
            v-model="posForm.description"
            type="textarea"
            placeholder="请输入职位描述"
            :rows="3"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showPosDialog = false">取消</el-button>
        <el-button type="primary" @click="savePosition" :loading="saving">
          {{ posForm.id ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 人员分配对话框 -->
    <el-dialog v-model="showAssignDialog" title="分配人员" width="600px">
      <div class="assign-content">
        <div class="available-personnel">
          <h4>可分配人员</h4>
          <el-input
            v-model="personnelSearchKeyword"
            placeholder="搜索人员"
            style="margin-bottom: 16px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <div class="personnel-list">
            <div
              v-for="person in filteredAvailablePersonnel"
              :key="person.id"
              class="personnel-item selectable"
              :class="{ selected: selectedPersonnel.includes(person.id) }"
              @click="togglePersonSelection(person.id)"
            >
              <div class="person-info">
                <div class="person-name">{{ person.name }}</div>
                <div class="person-details">{{ person.username }} | {{ person.phone }}</div>
              </div>
              <el-checkbox :model-value="selectedPersonnel.includes(person.id)" />
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="assignPersonnel" :loading="assigning">
          分配选中人员 ({{ selectedPersonnel.length }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Plus,
  Search,
  OfficeBuilding,
  User,
  UserFilled
} from '@element-plus/icons-vue';
import apiClient from '@/api';

// 响应式数据
const departments = ref([]);
const positions = ref([]);
const employees = ref([]);
const searchKeyword = ref('');
const selectedItem = ref(null);
const allExpanded = ref(false);
const deptTreeRef = ref();

// 对话框状态
const showDeptDialog = ref(false);
const showPosDialog = ref(false);
const showAssignDialog = ref(false);
const saving = ref(false);
const assigning = ref(false);

// 表单数据
const deptForm = ref({
  id: null,
  name: '',
  parentId: null,
  description: ''
});

const posForm = ref({
  id: null,
  name: '',
  departmentId: null,
  level: '',
  description: ''
});

// 人员分配
const selectedPersonnel = ref([]);
const personnelSearchKeyword = ref('');

// 计算属性
const deptDialogTitle = computed(() => deptForm.value.id ? '编辑部门' : '添加部门');
const posDialogTitle = computed(() => posForm.value.id ? '编辑职位' : '添加职位');

const flatDepartments = computed(() => {
  const flatten = (depts, result = []) => {
    depts.forEach(dept => {
      if (dept.type === 'department') {
        result.push(dept);
        if (dept.children) {
          flatten(dept.children, result);
        }
      }
    });
    return result;
  };
  return flatten(departmentTree.value);
});

const departmentTree = computed(() => {
  // 构建部门树结构
  const buildTree = () => {
    const deptMap = new Map();
    const tree = [];

    // 创建部门节点
    departments.value.forEach(dept => {
      const node = {
        id: `dept-${dept.id}`,
        name: dept.name,
        type: 'department',
        description: dept.description,
        children: [],
        originalId: dept.id
      };
      deptMap.set(dept.id, node);
    });

    // 构建部门层级关系
    departments.value.forEach(dept => {
      const node = deptMap.get(dept.id);
      if (dept.parentId && deptMap.has(dept.parentId)) {
        deptMap.get(dept.parentId).children.push(node);
      } else {
        tree.push(node);
      }
    });

    // 添加职位到对应部门
    positions.value.forEach(pos => {
      if (deptMap.has(pos.departmentId)) {
        deptMap.get(pos.departmentId).children.push({
          id: `pos-${pos.id}`,
          name: pos.name,
          type: 'position',
          level: pos.level,
          description: pos.description,
          departmentId: pos.departmentId,
          originalId: pos.id
        });
      }
    });

    return tree;
  };

  return buildTree();
});

const assignedPersonnel = computed(() => {
  if (!selectedItem.value || selectedItem.value.type !== 'position') {
    return [];
  }
  
  return employees.value.filter(emp => 
    emp.departmentId === selectedItem.value.departmentId &&
    emp.position === selectedItem.value.name
  );
});

const filteredAvailablePersonnel = computed(() => {
  let available = employees.value.filter(emp => 
    !assignedPersonnel.value.some(assigned => assigned.id === emp.id)
  );
  
  if (personnelSearchKeyword.value) {
    const keyword = personnelSearchKeyword.value.toLowerCase();
    available = available.filter(emp => 
      emp.name.toLowerCase().includes(keyword) ||
      emp.username.toLowerCase().includes(keyword)
    );
  }
  
  return available;
});

// 树配置
const treeProps = {
  children: 'children',
  label: 'name'
};

// 方法
const loadData = async () => {
  try {
    const [deptRes, empRes] = await Promise.all([
      apiClient.get('/department'),
      apiClient.get('/employee')
    ]);
    
    departments.value = deptRes.data || [];
    employees.value = empRes.data || [];
    
    // 模拟职位数据（实际应该从后端获取）
    positions.value = [
      { id: 1, name: '主任', departmentId: 1, level: '领导', description: '部门负责人' },
      { id: 2, name: '副主任', departmentId: 1, level: '副职', description: '部门副职' },
      { id: 3, name: '科员', departmentId: 1, level: '科员', description: '一般工作人员' }
    ];
    
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
  }
};

const showAddDepartmentDialog = () => {
  deptForm.value = {
    id: null,
    name: '',
    parentId: null,
    description: ''
  };
  showDeptDialog.value = true;
};

const showAddPositionDialog = () => {
  posForm.value = {
    id: null,
    name: '',
    departmentId: null,
    level: '',
    description: ''
  };
  showPosDialog.value = true;
};

const addPosition = (department) => {
  posForm.value = {
    id: null,
    name: '',
    departmentId: department.originalId,
    level: '',
    description: ''
  };
  showPosDialog.value = true;
};

const editItem = (item) => {
  if (item.type === 'department') {
    const dept = departments.value.find(d => d.id === item.originalId);
    deptForm.value = {
      id: dept.id,
      name: dept.name,
      parentId: dept.parentId,
      description: dept.description
    };
    showDeptDialog.value = true;
  } else {
    const pos = positions.value.find(p => p.id === item.originalId);
    posForm.value = {
      id: pos.id,
      name: pos.name,
      departmentId: pos.departmentId,
      level: pos.level,
      description: pos.description
    };
    showPosDialog.value = true;
  }
};

const deleteItem = async (item) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除${item.type === 'department' ? '部门' : '职位'} "${item.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    if (item.type === 'department') {
      await apiClient.delete(`/department/${item.originalId}`);
      ElMessage.success('部门删除成功');
    } else {
      // 删除职位（模拟）
      positions.value = positions.value.filter(p => p.id !== item.originalId);
      ElMessage.success('职位删除成功');
    }
    
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error);
      ElMessage.error('删除失败');
    }
  }
};

const saveDepartment = async () => {
  if (!deptForm.value.name) {
    ElMessage.warning('请输入部门名称');
    return;
  }
  
  saving.value = true;
  try {
    if (deptForm.value.id) {
      await apiClient.put(`/department/${deptForm.value.id}`, deptForm.value);
      ElMessage.success('部门更新成功');
    } else {
      await apiClient.post('/department', deptForm.value);
      ElMessage.success('部门创建成功');
    }
    
    showDeptDialog.value = false;
    loadData();
  } catch (error) {
    console.error('保存部门失败:', error);
    ElMessage.error('保存部门失败');
  } finally {
    saving.value = false;
  }
};

const savePosition = async () => {
  if (!posForm.value.name || !posForm.value.departmentId) {
    ElMessage.warning('请填写完整的职位信息');
    return;
  }
  
  saving.value = true;
  try {
    // 模拟保存职位
    if (posForm.value.id) {
      const index = positions.value.findIndex(p => p.id === posForm.value.id);
      if (index !== -1) {
        positions.value[index] = { ...posForm.value };
      }
      ElMessage.success('职位更新成功');
    } else {
      const newId = Math.max(...positions.value.map(p => p.id), 0) + 1;
      positions.value.push({ ...posForm.value, id: newId });
      ElMessage.success('职位创建成功');
    }
    
    showPosDialog.value = false;
  } catch (error) {
    console.error('保存职位失败:', error);
    ElMessage.error('保存职位失败');
  } finally {
    saving.value = false;
  }
};

const togglePersonSelection = (personId) => {
  const index = selectedPersonnel.value.indexOf(personId);
  if (index > -1) {
    selectedPersonnel.value.splice(index, 1);
  } else {
    selectedPersonnel.value.push(personId);
  }
};

const assignPersonnel = async () => {
  if (selectedPersonnel.value.length === 0) {
    ElMessage.warning('请选择要分配的人员');
    return;
  }
  
  assigning.value = true;
  try {
    // 更新员工的部门和职位信息
    for (const personId of selectedPersonnel.value) {
      const employee = employees.value.find(emp => emp.id === personId);
      if (employee) {
        await apiClient.put(`/employee/${personId}`, {
          ...employee,
          departmentId: selectedItem.value.departmentId,
          position: selectedItem.value.name
        });
      }
    }
    
    ElMessage.success(`成功分配 ${selectedPersonnel.value.length} 名人员`);
    showAssignDialog.value = false;
    selectedPersonnel.value = [];
    loadData();
  } catch (error) {
    console.error('分配人员失败:', error);
    ElMessage.error('分配人员失败');
  } finally {
    assigning.value = false;
  }
};

const removePersonFromPosition = async (person) => {
  try {
    await ElMessageBox.confirm(
      `确定要将 "${person.name}" 从当前职位移除吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await apiClient.put(`/employee/${person.id}`, {
      ...person,
      departmentId: null,
      position: null
    });
    
    ElMessage.success('人员移除成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除人员失败:', error);
      ElMessage.error('移除人员失败');
    }
  }
};

const expandAll = () => {
  allExpanded.value = !allExpanded.value;
  if (allExpanded.value) {
    deptTreeRef.value?.expandAll();
  } else {
    deptTreeRef.value?.collapseAll();
  }
};

const handleSearch = () => {
  // 搜索功能实现
  console.log('搜索:', searchKeyword.value);
};

// 生命周期
onMounted(() => {
  loadData();
});
</script>

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

  .toolbar-card {
    margin-bottom: 16px;
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .toolbar-left {
        display: flex;
        gap: 12px;
      }
    }
  }

  .tree-card, .detail-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    min-height: 600px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      color: #1d2129;
    }
  }

  .department-tree {
    .tree-node {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 4px 0;
      
      .node-content {
        display: flex;
        align-items: center;
        flex: 1;
        
        .node-icon {
          margin-right: 8px;
          color: #409eff;
        }
        
        .node-label {
          margin-right: 8px;
          font-weight: 500;
        }
        
        .level-tag {
          font-size: 10px;
        }
      }
      
      .node-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      &:hover .node-actions {
        opacity: 1;
      }
    }
  }

  .item-detail {
    .detail-info {
      margin-bottom: 24px;
      
      .info-item {
        display: flex;
        margin-bottom: 12px;
        
        .info-label {
          width: 80px;
          color: #606266;
          font-weight: 500;
        }
        
        .info-value {
          flex: 1;
          color: #1d2129;
        }
      }
    }
    
    .personnel-list {
      h4 {
        margin: 0 0 16px 0;
        color: #1d2129;
      }
      
      .empty-personnel {
        text-align: center;
        color: #909399;
        padding: 40px 0;
      }
      
      .personnel-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .personnel-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        border: 1px solid #e4e7ed;
        border-radius: 6px;
        transition: all 0.3s;
        
        &.selectable {
          cursor: pointer;
          
          &:hover {
            border-color: #409eff;
            background-color: #f0f9ff;
          }
          
          &.selected {
            border-color: #409eff;
            background-color: #e6f7ff;
          }
        }
        
        .person-info {
          .person-name {
            font-weight: 500;
            color: #1d2129;
            margin-bottom: 4px;
          }
          
          .person-details {
            font-size: 12px;
            color: #606266;
          }
        }
      }
    }
  }

  .no-selection {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 300px;
  }

  .assign-content {
    .available-personnel {
      h4 {
        margin: 0 0 16px 0;
        color: #1d2129;
      }
      
      .personnel-list {
        max-height: 400px;
        overflow-y: auto;
      }
    }
  }

  .dept-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .dept-level {
      font-size: 12px;
      color: #909399;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .department-management {
    .toolbar {
      flex-direction: column;
      gap: 16px;
      align-items: stretch !important;
      
      .toolbar-left {
        justify-content: center;
      }
    }
    
    .el-col {
      margin-bottom: 16px;
    }
  }
}
</style>