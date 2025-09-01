<template>
  <div class="org-node" :class="{ 'root-node': isRoot, [`node-${node.type}`]: true, [`level-${node.level}`]: true }">
    <!-- 组织节点 -->
    <div class="dept-box">
      <div class="dept-header">
        <div class="dept-info">
          <h4 class="dept-name">{{ node.name }}</h4>
          <div class="node-meta">
            <span class="node-type">{{ getNodeTypeText(node.type) }}</span>
            <span class="node-level">{{ getLevelText(node.level) }}</span>
            <span class="node-count" v-if="node.type !== 'department'">
              {{ node.currentCount || 0 }}/{{ node.maxCount }}人
            </span>
          </div>
          <p class="dept-desc" v-if="node.description">{{ node.description }}</p>
        </div>
        <div class="dept-actions">
          <el-button size="small" type="primary" link @click="$emit('create-department', node)" title="添加子节点">
            <el-icon><Plus /></el-icon>
          </el-button>
          <el-button size="small" type="success" link @click="$emit('assign-employee', node)" title="分配人员" v-if="node.type !== 'department'">
            <el-icon><User /></el-icon>
          </el-button>
          <el-button size="small" type="warning" link @click="$emit('edit-department', node)" title="编辑">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button size="small" type="danger" link @click="$emit('delete-department', node)" title="删除">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
      
      <!-- 员工列表 -->
      <div class="employees-list" v-if="node.employees && node.employees.length > 0">
        <div 
          v-for="employee in node.employees" 
          :key="employee.id"
          class="employee-tag"
        >
          <span class="employee-name">{{ employee.name }}</span>
          <span class="employee-status" :class="`status-${employee.status.toLowerCase()}`">
            {{ getStatusText(employee.status) }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- 连接线和子节点 -->
    <div class="children-container" v-if="node.children && node.children.length > 0">
      <div class="connection-line"></div>
      <div class="children-wrapper">
        <div class="horizontal-line"></div>
        <div class="children-nodes">
          <div 
            v-for="child in node.children" 
            :key="child.id"
            class="child-node-wrapper"
          >
            <div class="vertical-line"></div>
            <OrgNode 
              :node="child" 
              :is-root="false"
              @create-department="$emit('create-department', $event)"
              @edit-department="$emit('edit-department', $event)"
              @delete-department="$emit('delete-department', $event)"
              @assign-employee="$emit('assign-employee', $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit, Delete, User, Setting } from '@element-plus/icons-vue';

defineProps<{
  node: any;
  isRoot?: boolean;
}>();

defineEmits<{
  'create-department': [node: any];
  'edit-department': [node: any];
  'delete-department': [node: any];
  'assign-employee': [node: any];
}>();

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
</script>

<style lang="scss" scoped>
// 这些样式会在主组件中定义，这里只是占位
</style>