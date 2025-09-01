<template>
  <div class="tree-node-wrapper">
    <!-- 当前节点 -->
    <div class="tree-node" :class="[`level-${node.level}`, `depth-${level}`]">
      <div class="node-card">
        <div class="node-header">
          <div class="node-icon">
            <el-icon v-if="node.type === 'department'">
              <Folder />
            </el-icon>
            <el-icon v-else>
              <User />
            </el-icon>
          </div>
          <div class="node-info">
            <h4 class="node-title">{{ node.name }}</h4>
            <p class="node-subtitle" v-if="node.description">{{ node.description }}</p>
            <div class="node-badges">
              <span class="type-badge" :class="`type-${node.type}`">{{ getNodeTypeText(node.type) }}</span>
              <span class="level-badge" :class="`level-${node.level}`">{{ getLevelText(node.level) }}</span>
              <span class="count-badge" v-if="node.type !== 'department'">
                {{ node.currentCount || 0 }}/{{ node.maxCount }}人
              </span>
            </div>
          </div>
          <div class="node-actions">
            <el-button size="small" type="primary" link @click="$emit('create-department', node)">
              <el-icon><Plus /></el-icon>
            </el-button>
            <el-button size="small" type="success" link @click="$emit('assign-employee', node)" v-if="node.type !== 'department'">
              <el-icon><User /></el-icon>
            </el-button>
            <el-button size="small" type="warning" link @click="$emit('edit-department', node)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" type="danger" link @click="$emit('delete-department', node)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
        
        <!-- 员工信息 -->
        <div class="node-employees" v-if="node.employees && node.employees.length > 0">
          <div class="employees-list">
            <div v-for="employee in node.employees" :key="employee.id" class="employee-item">
              <div class="employee-avatar">{{ employee.name.charAt(0) }}</div>
              <div class="employee-info">
                <span class="employee-name">{{ employee.name }}</span>
                <span class="employee-status" :class="`status-${employee.status.toLowerCase()}`">
                  {{ getStatusText(employee.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 子节点 -->
    <div class="children-container" v-if="node.children && node.children.length > 0">
      <!-- 垂直连接线 -->
      <div class="vertical-connector"></div>
      
      <!-- 水平连接线 -->
      <div class="horizontal-connector"></div>
      
      <!-- 子节点列表 -->
      <div class="children-list">
        <div 
          v-for="child in node.children" 
          :key="child.id"
          class="child-wrapper"
        >
          <!-- 子节点垂直线 -->
          <div class="child-vertical-line"></div>
          
          <!-- 递归渲染子节点 -->
          <TreeNodeComponent 
            :node="child" 
            :level="level + 1"
            @create-department="$emit('create-department', $event)"
            @edit-department="$emit('edit-department', $event)"
            @delete-department="$emit('delete-department', $event)"
            @assign-employee="$emit('assign-employee', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Edit, Delete, User, Folder } from '@element-plus/icons-vue';

defineProps<{
  node: any;
  level: number;
}>();

defineEmits<{
  'create-department': [node: any];
  'edit-department': [node: any];
  'delete-department': [node: any];
  'assign-employee': [node: any];
}>();

// 获取节点类型文本
const getNodeTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'department': '部门',
    'position': '职位',
    'mixed': '部门/职位'
  };
  return typeMap[type] || type;
};

// 获取层级文本
const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    'high': '高级',
    'medium': '中级',
    'low': '低级'
  };
  return levelMap[level] || level;
};

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
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
// 样式会从父组件继承，这里只是占位
</style>