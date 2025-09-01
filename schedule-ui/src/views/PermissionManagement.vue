<template>
  <div class="permission-management">
    <div class="page-header">
      <h1 class="page-title">权限管理</h1>
      <p class="page-description">管理系统用户权限和角色分配</p>
    </div>

    <el-card class="permission-card" shadow="hover">
      <div class="coming-soon">
        <el-icon class="coming-soon-icon"><Lock /></el-icon>
        <h3>权限管理功能开发中</h3>
        <p>该功能正在开发中，敬请期待...</p>
        <el-button type="primary" @click="$router.push('/system/settings')">
          返回系统设置
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { Lock } from '@element-plus/icons-vue';
</script>

<style lang="scss" scoped>
.permission-management {
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

  .permission-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .coming-soon {
      text-align: center;
      padding: 80px 20px;
      
      .coming-soon-icon {
        font-size: 64px;
        color: #909399;
        margin-bottom: 24px;
      }
      
      h3 {
        font-size: 20px;
        color: #1d2129;
        margin-bottom: 16px;
      }
      
      p {
        color: #606266;
        margin-bottom: 32px;
      }
    }
  }
}
</style>