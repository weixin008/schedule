<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, User, Setting, Expand, Fold, Folder, Search } from '@element-plus/icons-vue';
import apiClient from '@/api';
import OrgNode from '@/components/OrgNode.vue';
import TreeNodeComponent from '@/components/TreeNodeComponent.vue';



// 响应式数据
const organizationTree = ref([]);
const pyramidLevels = ref([]);
const employees = ref([]);
const loading = ref(false);
const viewMode = ref('tree'); // 'tree' 或 'pyramid'

// 对话框状态
const departmentDialogVisible = ref(false);
const assignEmployeeDialogVisible = ref(false);

// 表单数据
const departmentForm = reactive({
  id: null,
  name: '',
  description: '',
  parentId: null,
  type: 'mixed',
  level: 'medium',
  maxCount: 1
});

const assignForm = reactive({
  positionId: null,
  employeeIds: [],
  maxCount: 1,
  currentCount: 0
});

const isEditingDepartment = computed(() => !!departmentForm.id);

// 获取组织架构树
const fetchOrganizationTree = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/organization/tree');
    console.log('API返回的原始数据:', response.data);
    organizationTree.value = response.data;
    buildPyramidLevels();
    await fetchEmployees();
  } catch (error) {
    ElMessage.error('获取组织架构失败');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 构建金字塔层级数据
const buildPyramidLevels = () => {
  const levels = [];
  
  const traverseTree = (nodes, level = 0) => {
    if (!levels[level]) {
      levels[level] = [];
    }
    
    nodes.forEach(node => {
      levels[level].push(node);
      if (node.children && node.children.length > 0) {
        traverseTree(node.children, level + 1);
      }
    });
  };
  
  traverseTree(organizationTree.value);
  pyramidLevels.value = levels;
};

// 视图模式切换
const handleViewModeChange = () => {
  // 视图切换时重新构建数据
  if (viewMode.value === 'pyramid') {
    buildPyramidLevels();
  }
};

// 获取员工列表
const fetchEmployees = async () => {
  try {
    const response = await apiClient.get('/employees');
    employees.value = response.data;
    console.log('成功获取员工列表:', employees.value.length, '个员工');
  } catch (error) {
    console.error('获取员工列表失败:', error);
    ElMessage.error('获取员工列表失败');
  }
};

// 创建职位
const handleCreateDepartment = (parentNode = null) => {
  departmentForm.id = null;
  departmentForm.name = '';
  departmentForm.description = '';
  departmentForm.parentId = parentNode ? parentNode.id : null;
  departmentForm.type = 'position'; // 默认为职位类型
  departmentForm.level = 'medium'; // 默认为中级
  departmentForm.maxCount = 1; // 默认最大人数
  departmentDialogVisible.value = true;
};

// 编辑职位
const handleEditDepartment = (node) => {
  departmentForm.id = node.id;
  departmentForm.name = node.name;
  departmentForm.description = node.description || '';
  departmentForm.parentId = node.parentId;
  departmentForm.type = node.type || 'position';
  departmentForm.level = node.level || 'medium';
  departmentForm.maxCount = node.maxCount || 1;
  departmentDialogVisible.value = true;
};

// 保存组织节点
const saving = ref(false);
const saveDepartment = async () => {
  if (saving.value) return; // 防止重复提交
  
  saving.value = true;
  try {
    if (isEditingDepartment.value) {
      await apiClient.patch(`/organization/${departmentForm.id}`, departmentForm);
      ElMessage.success('组织节点更新成功');
    } else {
      await apiClient.post('/organization', departmentForm);
      ElMessage.success('组织节点创建成功');
    }
    departmentDialogVisible.value = false;
    fetchOrganizationTree();
  } catch (error) {
    ElMessage.error('操作失败');
    console.error(error);
  } finally {
    saving.value = false;
  }
};

// 删除组织节点
const handleDeleteDepartment = async (node) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除组织节点 "${node.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await apiClient.delete(`/organization/${node.id}`);
    ElMessage.success('删除成功');
    fetchOrganizationTree();
  } catch (error) {
    if (error !== 'cancel') {
      let errorMessage = '删除失败';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response && error.response.data) {
        errorMessage = error.response.data;
      }
      ElMessage.error(errorMessage);
      console.error(error);
    }
  }
};

// 这些方法已经不需要了，因为职位和部门已经合并为组织节点

// 分配员工
const handleAssignEmployee = async (organizationNode) => {
  assignForm.positionId = organizationNode.id;
  assignForm.employeeIds = organizationNode.employees ? organizationNode.employees.map(emp => emp.id) : [];
  assignForm.maxCount = organizationNode.maxCount || 1;
  assignForm.currentCount = organizationNode.employees ? organizationNode.employees.length : 0;
  assignEmployeeDialogVisible.value = true;
};

// 保存员工分配
const assigning = ref(false);
const saveEmployeeAssignment = async () => {
  if (assigning.value) return; // 防止重复提交
  
  // 检查最大人数限制
  if (assignForm.employeeIds.length > assignForm.maxCount) {
    ElMessage.warning(`该职位最多只能分配 ${assignForm.maxCount} 人，当前选择了 ${assignForm.employeeIds.length} 人`);
    return;
  }
  
  assigning.value = true;
  try {
    // 获取当前职位的所有员工
    const currentNode = allDepartments.value.find(dept => dept.id === assignForm.positionId);
    const currentEmployeeIds = currentNode?.employees?.map(emp => emp.id) || [];
    
    // 找出需要添加的员工（新选择的员工）
    const employeesToAdd = assignForm.employeeIds.filter(id => !currentEmployeeIds.includes(id));
    
    // 找出需要移除的员工（之前选择但现在未选择的员工）
    const employeesToRemove = currentEmployeeIds.filter(id => !assignForm.employeeIds.includes(id));
    
    console.log('当前员工:', currentEmployeeIds);
    console.log('新选择员工:', assignForm.employeeIds);
    console.log('需要添加的员工:', employeesToAdd);
    console.log('需要移除的员工:', employeesToRemove);
    
    // 批量更新员工的organizationNodeId
    const updatePromises = [];
    
    // 添加新员工到职位
    employeesToAdd.forEach(employeeId => {
      updatePromises.push(
        apiClient.patch(`/employees/${employeeId}`, { organizationNodeId: assignForm.positionId })
      );
    });
    
    // 从职位中移除员工（设置organizationNodeId为null）
    employeesToRemove.forEach(employeeId => {
      updatePromises.push(
        apiClient.patch(`/employees/${employeeId}`, { organizationNodeId: null })
      );
    });
    
    if (updatePromises.length > 0) {
      // 使用 Promise.allSettled 来处理部分失败的情况
      const results = await Promise.allSettled(updatePromises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected');
      
      if (failed.length > 0) {
        console.error('部分更新失败:', failed);
        const failedReasons = failed.map(f => f.reason?.response?.data?.message || f.reason?.message || '未知错误').join(', ');
        throw new Error(`部分更新失败: ${failedReasons}`);
      }
      
      ElMessage.success(`员工分配成功！添加 ${employeesToAdd.length} 人，移除 ${employeesToRemove.length} 人`);
    } else {
      ElMessage.info('没有变更需要保存');
    }
    
    assignEmployeeDialogVisible.value = false;
    fetchOrganizationTree();
  } catch (error) {
    console.error('员工分配失败:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '分配失败';
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    ElMessage.error(`员工分配失败: ${errorMessage}`);
  } finally {
    assigning.value = false;
  }
};

// 获取所有部门（扁平化）- 使用计算属性确保响应式更新
const allDepartments = computed(() => {
  const departments = [];
  const seenIds = new Set();
  
  const traverse = (nodes) => {
    if (!nodes || !Array.isArray(nodes)) return;
    
    nodes.forEach(node => {
      // 确保ID唯一性，避免重复添加
      if (node && node.id && !seenIds.has(node.id)) {
        seenIds.add(node.id);
        departments.push({
          ...node,
          // 使用固定的唯一标识
          _uniqueKey: `org-${node.id}`
        });
        
        // 递归处理子节点
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    });
  };
  
  traverse(organizationTree.value);
  
  // 调试信息：检查是否有重复的ID
  const ids = departments.map(d => d.id);
  const uniqueIds = [...new Set(ids)];
  if (ids.length !== uniqueIds.length) {
    console.warn('发现重复的组织节点ID:', ids.filter((id, index) => ids.indexOf(id) !== index));
  }
  
  return departments;
});

// 保持向后兼容的函数
const getAllDepartments = () => allDepartments.value;

// 获取节点类型文本
const getNodeTypeText = (type: string) => {
  const typeMap = {
    'department': '部门',
    'position': '职位',
    'mixed': '部门/职位'
  };
  return typeMap[type] || type;
};

// 获取层级文本
const getLevelText = (level: string) => {
  const levelMap = {
    'high': '高级',
    'medium': '中级',
    'low': '低级'
  };
  return levelMap[level] || level;
};

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap = {
    'ON_DUTY': '在岗',
    'LEAVE': '请假',
    'BUSINESS_TRIP': '出差',
    'TRANSFER': '调动',
    'RESIGNED': '离职'
  };
  return statusMap[status] || status;
};

// 获取节点图标
const getNodeIcon = (data: any) => {
  if (data.type === 'department') return 'Folder';
  if (data.type === 'position') return 'User';
  return 'Setting';
};

// 获取层级描述
const getLevelDescription = (levelIndex: number) => {
  const descriptions = [
    'L1 决策层',
    'L2 职能层', 
    'L3 执行层',
    'L4 操作层',
    'L5 基础层'
  ];
  return descriptions[levelIndex] || `L${levelIndex + 1} 层`;
};

// 计算节点深度（距离根节点的层级）
const calculateNodeDepth = (node: any, allNodes: any[]): number => {
  if (!node.parentId) return 0;
  const parent = allNodes.find(n => n.id === node.parentId);
  return parent ? calculateNodeDepth(parent, allNodes) + 1 : 0;
};

// 构建层级数据（用于金字塔视图）
const buildLevelData = () => {
  const allNodes = getAllDepartments();
  if (!allNodes || allNodes.length === 0) {
    return [];
  }
  
  const levelMap = new Map<number, any[]>();
  
  allNodes.forEach(node => {
    const depth = calculateNodeDepth(node, allNodes);
    if (!levelMap.has(depth)) {
      levelMap.set(depth, []);
    }
    levelMap.get(depth)!.push({
      ...node,
      depth,
      levelName: getLevelDescription(depth)
    });
  });
  
  // 转换为数组格式
  const levels = [];
  const maxDepth = levelMap.size > 0 ? Math.max(...levelMap.keys()) : 0;
  for (let i = 0; i <= maxDepth; i++) {
    levels.push(levelMap.get(i) || []);
  }
  
  return levels;
};

// 搜索功能
const searchKeyword = ref('');
const searchResults = ref([]);
const highlightedNodeId = ref(null);

const handleSearch = () => {
  if (!searchKeyword.value.trim()) {
    searchResults.value = [];
    highlightedNodeId.value = null;
    return;
  }
  
  const allNodes = getAllDepartments();
  searchResults.value = allNodes.filter(node => 
    node.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    (node.description && node.description.toLowerCase().includes(searchKeyword.value.toLowerCase()))
  );
  
  if (searchResults.value.length > 0) {
    highlightedNodeId.value = searchResults.value[0].id;
  }
};

// 聚焦到指定节点
const focusOnNode = (nodeId: number) => {
  highlightedNodeId.value = nodeId;
  // 这里可以添加滚动到节点的逻辑
};

// 获取上级名称
const getParentName = (parentId: number) => {
  const allNodes = getAllDepartments();
  const parent = allNodes.find(node => node.id === parentId);
  return parent ? parent.name : '未知';
};

// 检查是否可以保存员工分配
const canSaveAssignment = computed(() => {
  return assignForm.employeeIds.length <= assignForm.maxCount;
});





onMounted(() => {
  fetchOrganizationTree();
});
</script>

<template>
  <div class="organization-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">组织架构管理</h1>
      <p class="page-description">管理机构的部门和岗位信息，支持多级部门结构</p>
    </div>

    <!-- 操作区域 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" @click="handleCreateDepartment()">
          <el-icon><Plus /></el-icon>
          添加职位
        </el-button>
        <el-button @click="fetchOrganizationTree">
          <el-icon><Expand /></el-icon>
          刷新数据
        </el-button>

      </div>
      
      <div class="action-center">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索员工或部门..."
          style="width: 300px"
          @input="handleSearch"
          @keyup.enter="handleSearch"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <div v-if="searchResults.length > 0" class="search-results">
          <el-dropdown>
            <span class="search-count">找到 {{ searchResults.length }} 个结果</span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item 
                  v-for="result in searchResults" 
                  :key="result.id"
                  @click="focusOnNode(result.id)"
                >
                  {{ result.name }} - {{ result.description }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <div class="action-right">
        <span class="view-info">简单表格视图</span>
      </div>
    </div>

    <!-- 简单列表视图 -->
    <el-card v-if="viewMode === 'tree'" class="simple-org-card" shadow="hover" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>组织架构管理</span>
        </div>
      </template>
      
      <div class="simple-org-container">
        <el-table :data="allDepartments" style="width: 100%" :row-key="(row) => `org-${row.id}`">
          <el-table-column prop="name" label="职位名称" width="200">
            <template #default="{ row }">
              <div class="position-name">
                <el-icon><User /></el-icon>
                <span>{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="description" label="职位描述" min-width="200">
            <template #default="{ row }">
              <span class="description">{{ row.description || '暂无描述' }}</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="parentId" label="上级职位" width="150">
            <template #default="{ row }">
              <span v-if="row.parentId">
                {{ getParentName(row.parentId) }}
              </span>
              <el-tag v-else type="danger" size="small">最高级</el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="employees" label="在职人员" width="120">
            <template #default="{ row }">
              <el-tag type="success" size="small">
                {{ row.employees ? row.employees.length : 0 }}人
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="maxCount" label="最大人数" width="100">
            <template #default="{ row }">
              <span v-if="row.type !== 'department'">{{ row.maxCount }}人</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="handleCreateDepartment(row)">
                添加下级
              </el-button>
              <el-button size="small" type="success" link @click="handleAssignEmployee(row)" v-if="row.type !== 'department'">
                分配人员
              </el-button>
              <el-button size="small" type="warning" link @click="handleEditDepartment(row)">
                编辑
              </el-button>
              <el-button size="small" type="danger" link @click="handleDeleteDepartment(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>




    <!-- 创建/编辑组织节点对话框 -->
    <el-dialog
      v-model="departmentDialogVisible"
      :title="isEditingDepartment ? '编辑职位' : '创建职位'"
      width="600px"
    >
      <el-form :model="departmentForm" label-width="120px">
        <el-form-item label="职位名称" required>
          <el-input v-model="departmentForm.name" placeholder="请输入职位名称（如：总经理、部门经理、主管等）" />
        </el-form-item>

        <el-form-item label="上级职位">
          <el-select v-model="departmentForm.parentId" placeholder="请选择上级职位（留空为最高级）" clearable>
            <el-option
              v-for="dept in getAllDepartments().filter(d => d.id !== departmentForm.id)"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="最大人数">
          <el-input-number v-model="departmentForm.maxCount" :min="1" />
          <span style="margin-left: 8px; color: #666; font-size: 12px;">
            该职位最多可分配的人员数量
          </span>
        </el-form-item>
        <el-form-item label="职位描述">
          <el-input
            v-model="departmentForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入职位职责描述"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="departmentDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveDepartment" :loading="saving">
            {{ isEditingDepartment ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>



    <!-- 分配员工对话框 -->
    <el-dialog
      v-model="assignEmployeeDialogVisible"
      title="分配员工"
      width="600px"
    >
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="人数限制">
          <el-tag :type="assignForm.employeeIds.length > assignForm.maxCount ? 'danger' : 'success'">
            已选择 {{ assignForm.employeeIds.length }} / {{ assignForm.maxCount }} 人
          </el-tag>
          <span v-if="assignForm.employeeIds.length > assignForm.maxCount" style="color: #f56c6c; margin-left: 8px; font-size: 12px;">
            超出最大人数限制！
          </span>
        </el-form-item>
        
        <el-form-item label="选择员工">
          <el-select
            v-model="assignForm.employeeIds"
            multiple
            placeholder="请选择员工"
            style="width: 100%"
            :multiple-limit="assignForm.maxCount"
          >
            <el-option
              v-for="employee in employees"
              :key="`emp-${employee.id}`"
              :label="`${employee.name} (${employee.username})`"
              :value="employee.id"
            />
          </el-select>
          <div style="margin-top: 8px; font-size: 12px; color: #666;">
            提示：该职位最多可分配 {{ assignForm.maxCount }} 人
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="assignEmployeeDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="saveEmployeeAssignment" 
            :loading="assigning"
            :disabled="!canSaveAssignment"
          >
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.organization-management {
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
    gap: 12px;
    margin-bottom: 16px;
    padding: 16px;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .action-left {
      display: flex;
      gap: 8px;
    }
    
    .action-center {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .search-results {
        .search-count {
          font-size: 12px;
          color: #1890ff;
          cursor: pointer;
          
          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
    
    .action-right {
      display: flex;
      gap: 8px;
    }
  }

  .simple-org-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
    
    .simple-org-container {
      .position-name {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .el-icon {
          color: #1890ff;
        }
        
        span {
          font-weight: 500;
        }
      }
      
      .description {
        color: #666;
        font-size: 13px;
      }
      
      // 树节点样式
      .tree-node-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        
        .tree-node {
          margin-bottom: 20px;
          
          .node-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border: 2px solid transparent;
            transition: all 0.3s ease;
            min-width: 280px;
            max-width: 350px;
            
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            }
            
            .node-header {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              margin-bottom: 12px;
              
              .node-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                
                .el-icon {
                  font-size: 20px;
                  color: white;
                }
              }
              
              .node-info {
                flex: 1;
                
                .node-title {
                  font-size: 16px;
                  font-weight: 600;
                  margin: 0 0 4px 0;
                  color: #1d2129;
                }
                
                .node-subtitle {
                  font-size: 12px;
                  color: #666;
                  margin: 0 0 8px 0;
                  line-height: 1.4;
                }
                
                .node-badges {
                  display: flex;
                  gap: 6px;
                  flex-wrap: wrap;
                  
                  .type-badge, .level-badge, .count-badge {
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 10px;
                    font-weight: 500;
                  }
                  
                  .type-badge {
                    &.type-department {
                      background-color: #e6f7ff;
                      color: #1890ff;
                    }
                    &.type-position {
                      background-color: #f6ffed;
                      color: #52c41a;
                    }
                    &.type-mixed {
                      background-color: #fff2e8;
                      color: #fa8c16;
                    }
                  }
                  
                  .level-badge {
                    &.level-high {
                      background-color: #fff1f0;
                      color: #ff4d4f;
                    }
                    &.level-medium {
                      background-color: #f0f9ff;
                      color: #1890ff;
                    }
                    &.level-low {
                      background-color: #f6ffed;
                      color: #52c41a;
                    }
                  }
                  
                  .count-badge {
                    background-color: #f0f0f0;
                    color: #666;
                  }
                }
              }
              
              .node-actions {
                display: flex;
                gap: 4px;
                opacity: 0;
                transition: opacity 0.2s;
              }
            }
            
            &:hover .node-actions {
              opacity: 1;
            }
            
            .node-employees {
              .employees-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
                
                .employee-item {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  padding: 6px 8px;
                  background-color: #f8f9fa;
                  border-radius: 6px;
                  
                  .employee-avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    font-weight: 600;
                  }
                  
                  .employee-info {
                    flex: 1;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    
                    .employee-name {
                      font-size: 12px;
                      font-weight: 500;
                    }
                    
                    .employee-status {
                      padding: 1px 6px;
                      border-radius: 8px;
                      font-size: 9px;
                      font-weight: 500;
                      
                      &.status-on_duty {
                        background-color: #f6ffed;
                        color: #52c41a;
                      }
                      &.status-leave {
                        background-color: #fff7e6;
                        color: #fa8c16;
                      }
                      &.status-business_trip {
                        background-color: #e6f7ff;
                        color: #1890ff;
                      }
                    }
                  }
                }
              }
            }
          }
          
          // 根据层级设置不同颜色
          &.level-high .node-card {
            border-color: #ff4d4f;
            .node-icon {
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            }
          }
          
          &.level-medium .node-card {
            border-color: #1890ff;
            .node-icon {
              background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            }
          }
          
          &.level-low .node-card {
            border-color: #52c41a;
            .node-icon {
              background: linear-gradient(135deg, #a8e6cf 0%, #7fcdcd 100%);
            }
          }
          
          // 根据深度调整大小
          &.depth-0 .node-card {
            transform: scale(1.1);
          }
          
          &.depth-1 .node-card {
            transform: scale(1.05);
          }
        }
        
        // 连接线样式
        .children-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          
          .vertical-connector {
            width: 3px;
            height: 30px;
            background: linear-gradient(to bottom, #1890ff, #40a9ff);
            border-radius: 2px;
            margin-bottom: 10px;
          }
          
          .horizontal-connector {
            height: 3px;
            background: linear-gradient(to right, #1890ff, #40a9ff);
            border-radius: 2px;
            margin-bottom: 10px;
            position: relative;
            width: calc(100% - 80px);
            min-width: 200px;
            
            &::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 0;
              transform: translateY(-50%);
              width: 8px;
              height: 8px;
              background-color: #1890ff;
              border-radius: 50%;
              margin-left: -4px;
            }
            
            &::after {
              content: '';
              position: absolute;
              top: 50%;
              right: 0;
              transform: translateY(-50%);
              width: 8px;
              height: 8px;
              background-color: #1890ff;
              border-radius: 50%;
              margin-right: -4px;
            }
          }
          
          .children-list {
            display: flex;
            gap: 40px;
            
            .child-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;
              
              .child-vertical-line {
                width: 3px;
                height: 20px;
                background: linear-gradient(to bottom, #1890ff, #40a9ff);
                border-radius: 2px;
                margin-bottom: 10px;
                
                &::after {
                  content: '';
                  position: absolute;
                  bottom: -2px;
                  left: 50%;
                  transform: translateX(-50%);
                  width: 6px;
                  height: 6px;
                  background-color: #1890ff;
                  border-radius: 50%;
                }
              }
            }
          }
        }
      }
    }
    
    // 组织架构节点样式
    .org-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      
      .dept-box {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px;
        padding: 16px;
        min-width: 200px;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        transition: transform 0.2s, box-shadow 0.2s;
        margin-bottom: 20px;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .dept-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          
          .dept-info {
            flex: 1;
            
            .dept-name {
              margin: 0 0 4px 0;
              font-size: 16px;
              font-weight: 600;
            }
            
            .dept-desc {
              margin: 0;
              font-size: 12px;
              opacity: 0.9;
              line-height: 1.4;
            }
          }
          
          .dept-actions {
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s;
            
            .el-button {
              color: white;
              
              &:hover {
                background-color: rgba(255, 255, 255, 0.2);
              }
            }
          }
        }
        
        &:hover .dept-actions {
          opacity: 1;
        }
        
        .employees-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          
          .employee-tag {
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            padding: 4px 8px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            
            .employee-name {
              font-weight: 500;
            }
            
            .employee-status {
              padding: 1px 4px;
              border-radius: 8px;
              font-size: 9px;
              
              &.status-on_duty {
                background-color: rgba(82, 196, 26, 0.8);
                color: white;
              }
              
              &.status-leave {
                background-color: rgba(250, 173, 20, 0.8);
                color: white;
              }
              
              &.status-business_trip {
                background-color: rgba(24, 144, 255, 0.8);
                color: white;
              }
              
              &.status-transfer {
                background-color: rgba(114, 46, 209, 0.8);
                color: white;
              }
              
              &.status-resigned {
                background-color: rgba(245, 34, 45, 0.8);
                color: white;
              }
            }
          }
        }
        
        .positions-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          
          .position-tag {
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            padding: 6px 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            
            .position-info {
              display: flex;
              align-items: center;
              gap: 6px;
              
              .position-name {
                font-weight: 500;
              }
              
              .position-count {
                background-color: rgba(255, 255, 255, 0.3);
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
              }
            }
            
            .position-actions {
              display: flex;
              gap: 2px;
              opacity: 0;
              transition: opacity 0.2s;
              
              .el-button {
                color: white;
                padding: 2px;
                
                &:hover {
                  background-color: rgba(255, 255, 255, 0.2);
                }
              }
            }
            
            &:hover .position-actions {
              opacity: 1;
            }
          }
        }
      }
      
      // 根据层级设置不同颜色
      &.level-high .dept-box {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
        
        &:hover {
          box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
        }
      }
      
      &.level-medium .dept-box {
        background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
        box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
        
        &:hover {
          box-shadow: 0 6px 20px rgba(78, 205, 196, 0.4);
        }
      }
      
      &.level-low .dept-box {
        background: linear-gradient(135deg, #a8e6cf 0%, #7fcdcd 100%);
        box-shadow: 0 4px 12px rgba(168, 230, 207, 0.3);
        
        &:hover {
          box-shadow: 0 6px 20px rgba(168, 230, 207, 0.4);
        }
      }
      
      // 根节点额外的样式
      &.root-node .dept-box {
        border: 3px solid rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
      }
      
      // 连接线样式
      .children-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        
        .connection-line {
          width: 2px;
          height: 30px;
          background-color: #ddd;
        }
        
        .children-wrapper {
          position: relative;
          
          .horizontal-line {
            height: 2px;
            background-color: #ddd;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
          }
          
          .children-nodes {
            display: flex;
            gap: 40px;
            padding-top: 30px;
            
            .child-node-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              position: relative;
              
              .vertical-line {
                width: 2px;
                height: 30px;
                background-color: #ddd;
                position: absolute;
                top: -30px;
                left: 50%;
                transform: translateX(-50%);
              }
            }
          }
        }
      }
    }
  }

  .pyramid-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      
      .pyramid-stats {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #666;
        
        span {
          padding: 4px 8px;
          background-color: #f5f7fa;
          border-radius: 4px;
        }
      }
    }
    
    .pyramid-container {
      min-height: 500px;
      padding: 20px;
      background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
      
      .pyramid-level {
        margin-bottom: 50px;
        position: relative;
        
        .level-header {
          text-align: center;
          margin-bottom: 30px;
          
          .level-title {
            margin-bottom: 8px;
            
            .level-name {
              font-size: 18px;
              font-weight: 700;
              color: #1d2129;
              margin-right: 16px;
            }
            
            .level-count {
              font-size: 12px;
              color: #1890ff;
              background-color: #e6f7ff;
              padding: 4px 12px;
              border-radius: 12px;
              font-weight: 500;
            }
          }
          
          .level-description {
            font-size: 13px;
            color: #666;
            line-height: 1.5;
            max-width: 600px;
            margin: 0 auto;
          }
        }
        
        .level-connector {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
          
          .connector-line {
            width: 2px;
            height: 30px;
            background: linear-gradient(to bottom, #ddd, #1890ff);
            position: relative;
            
            &::after {
              content: '';
              position: absolute;
              bottom: -4px;
              left: 50%;
              transform: translateX(-50%);
              width: 8px;
              height: 8px;
              background-color: #1890ff;
              border-radius: 50%;
            }
          }
        }
        
        // 不同深度的层级样式
        &.depth-0 {
          .level-name {
            color: #ff4d4f;
          }
          .level-count {
            background-color: #fff1f0;
            color: #ff4d4f;
          }
        }
        
        &.depth-1 {
          .level-name {
            color: #1890ff;
          }
        }
        
        &.depth-2 {
          .level-name {
            color: #52c41a;
          }
          .level-count {
            background-color: #f6ffed;
            color: #52c41a;
          }
        }
        
        &.depth-3 {
          .level-name {
            color: #722ed1;
          }
          .level-count {
            background-color: #f9f0ff;
            color: #722ed1;
          }
        }
        
        .level-nodes {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 24px;
          position: relative;
          
          .pyramid-node {
            position: relative;
            
            &.highlighted {
              .node-card {
                border-color: #1890ff;
                box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
                transform: scale(1.02);
              }
            }
            
            &.has-employees {
              .node-card::after {
                content: '';
                position: absolute;
                top: -2px;
                right: -2px;
                width: 8px;
                height: 8px;
                background-color: #52c41a;
                border-radius: 50%;
                border: 2px solid white;
              }
            }
            
            // 根据深度设置不同的卡片样式
            &.node-depth-0 .node-card {
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
              border-color: #ff6b6b;
              box-shadow: 0 6px 20px rgba(255, 107, 107, 0.3);
              min-width: 280px;
            }
            
            &.node-depth-1 .node-card {
              background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
              color: white;
              border-color: #1890ff;
              box-shadow: 0 4px 16px rgba(24, 144, 255, 0.3);
              min-width: 260px;
            }
            
            &.node-depth-2 .node-card {
              background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
              color: white;
              border-color: #52c41a;
              box-shadow: 0 4px 16px rgba(82, 196, 26, 0.3);
              min-width: 240px;
            }
            
            &.node-depth-3 .node-card {
              background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
              color: white;
              border-color: #722ed1;
              box-shadow: 0 4px 16px rgba(114, 46, 209, 0.3);
              min-width: 220px;
            }
            
            .node-card {
              background: white;
              border: 2px solid #e1e8ed;
              border-radius: 12px;
              padding: 16px;
              min-width: 200px;
              max-width: 300px;
              transition: all 0.3s ease;
              cursor: pointer;
              
              &:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
              }
              
              .node-header {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 12px;
                
                .node-icon {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  background-color: rgba(255, 255, 255, 0.2);
                  border-radius: 8px;
                  flex-shrink: 0;
                  
                  .el-icon {
                    font-size: 16px;
                    color: rgba(255, 255, 255, 0.9);
                  }
                }
                
                .node-info {
                  flex: 1;
                  
                  .node-name {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0 0 6px 0;
                    line-height: 1.2;
                  }
                  
                  .node-meta {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    
                    .node-type, .node-level {
                      padding: 2px 6px;
                      border-radius: 8px;
                      font-size: 10px;
                      font-weight: 500;
                      background-color: rgba(255, 255, 255, 0.2);
                      color: rgba(255, 255, 255, 0.9);
                    }
                  }
                }
                
                .node-actions {
                  display: flex;
                  gap: 4px;
                  opacity: 0;
                  transition: opacity 0.2s;
                  
                  .el-button {
                    color: rgba(255, 255, 255, 0.8);
                    padding: 4px;
                    
                    &:hover {
                      background-color: rgba(255, 255, 255, 0.2);
                      color: white;
                    }
                  }
                }
              }
              
              &:hover .node-actions {
                opacity: 1;
              }
              
              .node-description {
                font-size: 12px;
                opacity: 0.9;
                line-height: 1.4;
                margin-bottom: 12px;
              }
              
              .node-stats {
                margin-bottom: 12px;
                
                .stats-item {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  font-size: 12px;
                  
                  .stats-label {
                    opacity: 0.8;
                  }
                  
                  .stats-value {
                    font-weight: 600;
                    background-color: rgba(255, 255, 255, 0.2);
                    padding: 2px 6px;
                    border-radius: 4px;
                  }
                }
              }
              
              .node-employees {
                .employees-header {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  margin-bottom: 8px;
                  font-size: 12px;
                  font-weight: 600;
                  opacity: 0.9;
                  
                  .el-icon {
                    font-size: 14px;
                  }
                }
                
                .employees-list {
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                  
                  .employee-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 8px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    transition: background-color 0.2s;
                    
                    &:hover {
                      background-color: rgba(255, 255, 255, 0.2);
                    }
                    
                    .employee-avatar {
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      background-color: rgba(255, 255, 255, 0.3);
                      color: rgba(255, 255, 255, 0.9);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 10px;
                      font-weight: 600;
                      flex-shrink: 0;
                    }
                    
                    .employee-info {
                      flex: 1;
                      min-width: 0;
                      
                      .employee-name {
                        font-size: 12px;
                        font-weight: 500;
                        margin-bottom: 2px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      }
                      
                      .employee-details {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        
                        .employee-number {
                          font-size: 10px;
                          opacity: 0.8;
                        }
                        
                        .employee-status {
                          padding: 1px 4px;
                          border-radius: 8px;
                          font-size: 9px;
                          font-weight: 500;
                          background-color: rgba(255, 255, 255, 0.3);
                          color: rgba(255, 255, 255, 0.9);
                        }
                      }
                    }
                  }
                }
              }
            }
            
            .child-connector {
              position: absolute;
              bottom: -25px;
              left: 50%;
              transform: translateX(-50%);
              
              .child-line {
                width: 2px;
                height: 25px;
                background-color: #ddd;
              }
            }
          }
        }
        
        // 不同层级的颜色主题
        &.level-1 .dept-card:not(.root-dept) {
          border-color: #52c41a;
          
          &:hover {
            border-color: #52c41a;
            box-shadow: 0 8px 25px rgba(82, 196, 26, 0.2);
          }
        }
        
        &.level-2 .dept-card:not(.root-dept) {
          border-color: #1890ff;
          
          &:hover {
            border-color: #1890ff;
            box-shadow: 0 8px 25px rgba(24, 144, 255, 0.2);
          }
        }
        
        &.level-3 .dept-card:not(.root-dept) {
          border-color: #722ed1;
          
          &:hover {
            border-color: #722ed1;
            box-shadow: 0 8px 25px rgba(114, 46, 209, 0.2);
          }
        }
      }
    }
  }

  .folder-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
    
    .folder-container {
      .folder-tree {
        .folder-node {
          width: 100%;
          
          .node-content {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            border-radius: 6px;
            transition: background-color 0.2s;
            
            &:hover {
              background-color: #f5f7fa;
            }
            
            .node-icon {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 24px;
              height: 24px;
              border-radius: 4px;
              
              .el-icon {
                font-size: 16px;
              }
            }
            
            .node-info {
              flex: 1;
              
              .node-name {
                font-weight: 600;
                font-size: 14px;
                color: #1d2129;
                display: block;
                margin-bottom: 4px;
              }
              
              .node-meta {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 2px;
                
                .node-type-badge {
                  padding: 2px 6px;
                  border-radius: 10px;
                  font-size: 10px;
                  font-weight: 500;
                  
                  &.type-department {
                    background-color: #e6f7ff;
                    color: #1890ff;
                  }
                  
                  &.type-position {
                    background-color: #f6ffed;
                    color: #52c41a;
                  }
                  
                  &.type-mixed {
                    background-color: #fff2e8;
                    color: #fa8c16;
                  }
                }
                
                .node-level-badge {
                  padding: 2px 6px;
                  border-radius: 10px;
                  font-size: 10px;
                  font-weight: 500;
                  
                  &.level-high {
                    background-color: #fff1f0;
                    color: #ff4d4f;
                  }
                  
                  &.level-medium {
                    background-color: #f0f9ff;
                    color: #1890ff;
                  }
                  
                  &.level-low {
                    background-color: #f6ffed;
                    color: #52c41a;
                  }
                }
                
                .node-count {
                  padding: 2px 6px;
                  background-color: #f0f0f0;
                  color: #666;
                  border-radius: 10px;
                  font-size: 10px;
                }
              }
              
              .node-desc {
                font-size: 12px;
                color: #909399;
                line-height: 1.4;
              }
            }
            
            .node-actions {
              display: flex;
              gap: 4px;
              opacity: 0;
              transition: opacity 0.2s;
            }
            
            &:hover .node-actions {
              opacity: 1;
            }
          }
          
          // 根据层级设置图标颜色
          &.level-high .node-icon {
            background-color: #fff1f0;
            color: #ff4d4f;
          }
          
          &.level-medium .node-icon {
            background-color: #f0f9ff;
            color: #1890ff;
          }
          
          &.level-low .node-icon {
            background-color: #f6ffed;
            color: #52c41a;
          }
          
          .employees-section {
            margin-left: 36px;
            margin-top: 8px;
            padding: 12px;
            background-color: #fafafa;
            border-radius: 6px;
            border-left: 3px solid #1890ff;
            
            .employees-title {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-bottom: 8px;
              font-size: 12px;
              font-weight: 600;
              color: #666;
              
              .el-icon {
                font-size: 14px;
              }
            }
            
            .employees-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 8px;
              
              .employee-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                background-color: white;
                border-radius: 4px;
                border: 1px solid #e8e8e8;
                transition: all 0.2s;
                
                &:hover {
                  border-color: #1890ff;
                  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
                }
                
                .employee-avatar {
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 12px;
                  font-weight: 600;
                }
                
                .employee-info {
                  flex: 1;
                  
                  .employee-name {
                    font-size: 13px;
                    font-weight: 500;
                    color: #1d2129;
                    margin-bottom: 2px;
                  }
                  
                  .employee-details {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    
                    .employee-number {
                      font-size: 11px;
                      color: #909399;
                    }
                    
                    .employee-status {
                      padding: 1px 4px;
                      border-radius: 8px;
                      font-size: 9px;
                      font-weight: 500;
                      
                      &.status-on_duty {
                        background-color: #f6ffed;
                        color: #52c41a;
                      }
                      
                      &.status-leave {
                        background-color: #fff7e6;
                        color: #fa8c16;
                      }
                      
                      &.status-business_trip {
                        background-color: #e6f7ff;
                        color: #1890ff;
                      }
                      
                      &.status-transfer {
                        background-color: #f9f0ff;
                        color: #722ed1;
                      }
                      
                      &.status-resigned {
                        background-color: #fff1f0;
                        color: #ff4d4f;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  .pyramid-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      
      .pyramid-stats {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #666;
        
        span {
          padding: 4px 8px;
          background-color: #f5f7fa;
          border-radius: 4px;
        }
      }
    }
    
    .pyramid-container {
      min-height: 600px;
      padding: 30px;
      background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
      
      .pyramid-level {
        margin-bottom: 50px;
        position: relative;
        
        .level-header {
          text-align: center;
          margin-bottom: 30px;
          
          .level-title {
            margin-bottom: 8px;
            
            .level-name {
              font-size: 18px;
              font-weight: 700;
              color: #1d2129;
              margin-right: 16px;
            }
            
            .level-count {
              font-size: 12px;
              color: #1890ff;
              background-color: #e6f7ff;
              padding: 4px 12px;
              border-radius: 12px;
              font-weight: 500;
            }
          }
          
          .level-description {
            font-size: 13px;
            color: #666;
            line-height: 1.5;
            max-width: 600px;
            margin: 0 auto;
          }
        }
        
        .level-connector {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
          
          .connector-line {
            width: 2px;
            height: 30px;
            background: linear-gradient(to bottom, #ddd, #1890ff);
            position: relative;
            
            &::after {
              content: '';
              position: absolute;
              bottom: -4px;
              left: 50%;
              transform: translateX(-50%);
              width: 8px;
              height: 8px;
              background-color: #1890ff;
              border-radius: 50%;
            }
          }
        }
        
        // 不同深度的层级样式
        &.depth-0 {
          .level-name {
            color: #ff4d4f;
          }
          .level-count {
            background-color: #fff1f0;
            color: #ff4d4f;
          }
        }
        
        &.depth-1 {
          .level-name {
            color: #1890ff;
          }
        }
        
        &.depth-2 {
          .level-name {
            color: #52c41a;
          }
          .level-count {
            background-color: #f6ffed;
            color: #52c41a;
          }
        }
        
        &.depth-3 {
          .level-name {
            color: #722ed1;
          }
          .level-count {
            background-color: #f9f0ff;
            color: #722ed1;
          }
        }
        
        .level-nodes {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 24px;
          position: relative;
          
          .pyramid-node {
            position: relative;
            
            &.highlighted {
              .node-card {
                border-color: #1890ff;
                box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
                transform: scale(1.02);
              }
            }
            
            &.has-employees {
              .node-card::after {
                content: '';
                position: absolute;
                top: -2px;
                right: -2px;
                width: 8px;
                height: 8px;
                background-color: #52c41a;
                border-radius: 50%;
                border: 2px solid white;
              }
            }
            
            // 根据深度设置不同的卡片样式
            &.node-depth-0 .node-card {
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
              border-color: #ff6b6b;
              box-shadow: 0 6px 20px rgba(255, 107, 107, 0.3);
              min-width: 280px;
            }
            
            &.node-depth-1 .node-card {
              background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
              color: white;
              border-color: #1890ff;
              box-shadow: 0 4px 16px rgba(24, 144, 255, 0.3);
              min-width: 260px;
            }
            
            &.node-depth-2 .node-card {
              background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
              color: white;
              border-color: #52c41a;
              box-shadow: 0 4px 16px rgba(82, 196, 26, 0.3);
              min-width: 240px;
            }
            
            &.node-depth-3 .node-card {
              background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
              color: white;
              border-color: #722ed1;
              box-shadow: 0 4px 16px rgba(114, 46, 209, 0.3);
              min-width: 220px;
            }
            
            .node-card {
              background: white;
              border: 2px solid #e1e8ed;
              border-radius: 12px;
              padding: 16px;
              min-width: 200px;
              max-width: 300px;
              transition: all 0.3s ease;
              cursor: pointer;
              
              &:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
              }
              
              .node-header {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 12px;
                
                .node-icon {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  background-color: rgba(255, 255, 255, 0.2);
                  border-radius: 8px;
                  flex-shrink: 0;
                  
                  .el-icon {
                    font-size: 16px;
                    color: rgba(255, 255, 255, 0.9);
                  }
                }
                
                .node-info {
                  flex: 1;
                  
                  .node-name {
                    font-size: 16px;
                    font-weight: 600;
                    margin: 0 0 6px 0;
                    line-height: 1.2;
                  }
                  
                  .node-meta {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    
                    .node-type, .node-level {
                      padding: 2px 6px;
                      border-radius: 8px;
                      font-size: 10px;
                      font-weight: 500;
                      background-color: rgba(255, 255, 255, 0.2);
                      color: rgba(255, 255, 255, 0.9);
                    }
                  }
                }
                
                .node-actions {
                  display: flex;
                  gap: 4px;
                  opacity: 0;
                  transition: opacity 0.2s;
                  
                  .el-button {
                    color: rgba(255, 255, 255, 0.8);
                    padding: 4px;
                    
                    &:hover {
                      background-color: rgba(255, 255, 255, 0.2);
                      color: white;
                    }
                  }
                }
              }
              
              &:hover .node-actions {
                opacity: 1;
              }
              
              .node-description {
                font-size: 12px;
                opacity: 0.9;
                line-height: 1.4;
                margin-bottom: 12px;
              }
              
              .node-stats {
                margin-bottom: 12px;
                
                .stats-item {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  font-size: 12px;
                  
                  .stats-label {
                    opacity: 0.8;
                  }
                  
                  .stats-value {
                    font-weight: 600;
                    background-color: rgba(255, 255, 255, 0.2);
                    padding: 2px 6px;
                    border-radius: 4px;
                  }
                }
              }
              
              .node-employees {
                .employees-header {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  margin-bottom: 8px;
                  font-size: 12px;
                  font-weight: 600;
                  opacity: 0.9;
                  
                  .el-icon {
                    font-size: 14px;
                  }
                }
                
                .employees-list {
                  display: flex;
                  flex-direction: column;
                  gap: 6px;
                  
                  .employee-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 8px;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    transition: background-color 0.2s;
                    
                    &:hover {
                      background-color: rgba(255, 255, 255, 0.2);
                    }
                    
                    .employee-avatar {
                      width: 24px;
                      height: 24px;
                      border-radius: 50%;
                      background-color: rgba(255, 255, 255, 0.3);
                      color: rgba(255, 255, 255, 0.9);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 10px;
                      font-weight: 600;
                      flex-shrink: 0;
                    }
                    
                    .employee-info {
                      flex: 1;
                      min-width: 0;
                      
                      .employee-name {
                        font-size: 12px;
                        font-weight: 500;
                        margin-bottom: 2px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      }
                      
                      .employee-details {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        
                        .employee-number {
                          font-size: 10px;
                          opacity: 0.8;
                        }
                        
                        .employee-status {
                          padding: 1px 4px;
                          border-radius: 8px;
                          font-size: 9px;
                          font-weight: 500;
                          background-color: rgba(255, 255, 255, 0.3);
                          color: rgba(255, 255, 255, 0.9);
                        }
                      }
                    }
                  }
                }
              }
            }
            
            .child-connector {
              position: absolute;
              bottom: -25px;
              left: 50%;
              transform: translateX(-50%);
              
              .child-line {
                width: 2px;
                height: 25px;
                background-color: #ddd;
              }
            }
          }
        }
      }
    }
  }

  .dialog-footer {
    text-align: right;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .organization-management {
    .action-bar {
      flex-direction: column;
      gap: 8px;
    }
    
    .tree-card {
      .organization-tree {
        .tree-node {
          .node-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
            
            .node-actions {
              opacity: 1;
              flex-wrap: wrap;
            }
          }
          
          .positions {
            margin-left: 12px;
            
            .position-item {
              flex-direction: column;
              align-items: flex-start;
              gap: 8px;
              
              .position-actions {
                opacity: 1;
              }
            }
          }
        }
      }
    }
  }
}
</style> 
     
      .pyramid-level {
        margin-bottom: 60px;
        position: relative;
        
        .level-header {
          text-align: center;
          margin-bottom: 30px;
          
          .level-title {
            font-size: 20px;
            font-weight: 700;
            color: #1d2129;
            margin: 0 0 8px 0;
          }
          
          .level-subtitle {
            font-size: 14px;
            color: #666;
            margin: 0;
          }
        }
        
        .level-connector {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
          
          .connector-line {
            width: 3px;
            height: 40px;
            background: linear-gradient(to bottom, #1890ff, #40a9ff);
            border-radius: 2px;
            position: relative;
            
            &::after {
              content: '';
              position: absolute;
              bottom: -6px;
              left: 50%;
              transform: translateX(-50%);
              width: 12px;
              height: 12px;
              background-color: #1890ff;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
            }
          }
        }
        
        .level-nodes {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 30px;
          
          .pyramid-node {
            position: relative;
            
            .node-card {
              background: white;
              border-radius: 16px;
              padding: 20px;
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
              border: 3px solid transparent;
              transition: all 0.3s ease;
              min-width: 280px;
              max-width: 320px;
              
              &:hover {
                transform: translateY(-6px);
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
              }
              
              .node-content {
                display: flex;
                gap: 16px;
                
                .node-icon {
                  width: 50px;
                  height: 50px;
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                  
                  .el-icon {
                    font-size: 24px;
                    color: white;
                  }
                }
                
                .node-details {
                  flex: 1;
                  
                  .node-name {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 6px 0;
                    color: #1d2129;
                  }
                  
                  .node-desc {
                    font-size: 13px;
                    color: #666;
                    margin: 0 0 12px 0;
                    line-height: 1.4;
                  }
                  
                  .node-badges {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-bottom: 16px;
                    
                    .type-badge, .level-badge, .count-badge {
                      padding: 4px 10px;
                      border-radius: 12px;
                      font-size: 11px;
                      font-weight: 600;
                    }
                    
                    .type-badge {
                      &.type-department {
                        background-color: #e6f7ff;
                        color: #1890ff;
                      }
                      &.type-position {
                        background-color: #f6ffed;
                        color: #52c41a;
                      }
                      &.type-mixed {
                        background-color: #fff2e8;
                        color: #fa8c16;
                      }
                    }
                    
                    .level-badge {
                      &.level-high {
                        background-color: #fff1f0;
                        color: #ff4d4f;
                      }
                      &.level-medium {
                        background-color: #f0f9ff;
                        color: #1890ff;
                      }
                      &.level-low {
                        background-color: #f6ffed;
                        color: #52c41a;
                      }
                    }
                    
                    .count-badge {
                      background-color: #f0f0f0;
                      color: #666;
                    }
                  }
                }
                
                .node-actions {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
                  opacity: 0;
                  transition: opacity 0.2s;
                }
              }
              
              &:hover .node-actions {
                opacity: 1;
              }
            }
            
            // 根据深度设置不同颜色
            &.node-depth-0 .node-card {
              border-color: #ff4d4f;
              .node-icon {
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              }
            }
            
            &.node-depth-1 .node-card {
              border-color: #1890ff;
              .node-icon {
                background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
              }
            }
            
            &.node-depth-2 .node-card {
              border-color: #52c41a;
              .node-icon {
                background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
              }
            }
            
            &.node-depth-3 .node-card {
              border-color: #722ed1;
              .node-icon {
                background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
              }
            }
          }
        }
      }
    }
  }