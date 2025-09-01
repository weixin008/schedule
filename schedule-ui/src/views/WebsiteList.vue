<template>
  <div class="website-list">
    <!-- 操作区 -->
    <div class="operation-bar">
      <el-button type="primary" :icon="Plus">创建网站</el-button>
      <el-input
        v-model="searchKeyword"
        placeholder="搜索网站名称"
        class="search-input"
        :prefix-icon="Search"
      />
    </div>

    <!-- 网站表格 -->
    <el-table
      :data="filteredWebsites"
      style="width: 100%"
      stripe
      @row-click="handleRowClick"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="网站名称" min-width="180" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag
            :type="statusType[row.status]"
            effect="dark"
            class="status-tag"
          >
            {{ statusMap[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="domain" label="域名" min-width="200" />
      <el-table-column prop="createTime" label="创建时间" width="180" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default>
          <el-button type="primary" link :icon="Edit">编辑</el-button>
          <el-button type="success" link :icon="FolderOpened">目录</el-button>
          <el-button type="warning" link :icon="Document">日志</el-button>
          <el-button type="danger" link :icon="Delete">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import {
  Plus,
  Search,
  Edit,
  Delete,
  FolderOpened,
  Document
} from '@element-plus/icons-vue'

interface Website {
  id: string
  name: string
  domain: string
  status: 'running' | 'stopped' | 'error'
  createTime: string
}

const searchKeyword = ref('')
const websites = ref<Website[]>([
  {
    id: '1',
    name: '官网首页',
    domain: 'www.example.com',
    status: 'running',
    createTime: '2024-03-01 14:30'
  },
  {
    id: '2',
    name: '用户中心',
    domain: 'user.example.com',
    status: 'stopped',
    createTime: '2024-03-05 09:15'
  }
])

const statusMap: Record<string, string> = {
  running: '运行中',
  stopped: '已停止',
  error: '异常'
}

const statusType: Record<string, string> = {
  running: 'success',
  stopped: 'info',
  error: 'danger'
}

const filteredWebsites = computed(() => {
  return websites.value.filter(website =>
    website.name.includes(searchKeyword.value)
  )
})

const handleRowClick = (row: Website) => {
  }
</script>

<style lang="scss" scoped>
.website-list {
  padding: 16px;
  background-color: #ffffff;
  border-radius: 8px;

  .operation-bar {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;

    .search-input {
      width: 300px;
    }
  }

  .status-tag {
    cursor: pointer;
    user-select: none;
  }

  :deep(.el-table__row) {
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #f5f7fa;
    }
  }
}
</style>