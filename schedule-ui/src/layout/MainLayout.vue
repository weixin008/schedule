<template>
  <el-container class="layout-container">
    <!-- 系统简介对话框 -->
    <SystemIntroDialog 
      v-if="showIntroDialog" 
      @close="handleIntroClose" 
      @start="handleIntroStart" 
    />
    
    <!-- 左侧菜单 -->
    <el-aside class="sidebar" width="240px">
      <div class="sidebar-logo">
        <img src="@/assets/logo.svg" alt="Logo" class="logo-img" />
        <span class="logo-text">排班系统</span>
      </div>
      
      <el-menu 
        router 
        :default-active="activeMenuPath" 
        class="sidebar-menu"
        background-color="#1d2129"
        text-color="#a3a6ad"
        active-text-color="#ffffff"
        :default-openeds="defaultOpeneds"
      >
        <!-- 📊 仪表盘 -->
        <el-menu-item index="/dashboard" class="menu-item">
          <el-icon><House /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        
        <!-- 👥 人员管理 -->
        <el-sub-menu index="personnel" class="sub-menu">
          <template #title>
            <el-icon><User /></el-icon>
            <span>人员管理</span>
          </template>
          <el-menu-item index="/personnel/employees" class="menu-item">
            <el-icon><User /></el-icon>
            <span>员工信息</span>
          </el-menu-item>
          <el-menu-item v-if="authStore.user?.role === 'admin'" index="/personnel/departments" class="menu-item">
            <el-icon><OfficeBuilding /></el-icon>
            <span>组织架构</span>
          </el-menu-item>
          <el-menu-item index="/personnel/import" class="menu-item">
            <el-icon><Upload /></el-icon>
            <span>批量导入</span>
          </el-menu-item>
        </el-sub-menu>
        
        <!-- 📅 排班管理（核心功能） -->
        <el-sub-menu index="schedule" class="sub-menu">
          <template #title>
            <el-icon><Calendar /></el-icon>
            <span>排班管理</span>
          </template>
          <el-menu-item index="/schedule/calendar" class="menu-item">
            <el-icon><Calendar /></el-icon>
            <span>排班日历</span>
          </el-menu-item>
          <el-menu-item index="/schedule/roles" class="menu-item">
            <el-icon><UserFilled /></el-icon>
            <span>值班角色配置</span>
          </el-menu-item>

          <el-menu-item index="/schedule/engine" class="menu-item">
            <el-icon><MagicStick /></el-icon>
            <span>智能排班</span>
          </el-menu-item>
        </el-sub-menu>
        
        <!-- ⚙️ 系统设置 -->
        <el-sub-menu index="system" class="sub-menu">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </template>
          <el-menu-item index="/system/settings" class="menu-item">
            <el-icon><Setting /></el-icon>
            <span>基础配置</span>
          </el-menu-item>
          <el-menu-item index="/system/positions" class="menu-item">
            <el-icon><Postcard /></el-icon>
            <span>岗位管理</span>
          </el-menu-item>
          <el-menu-item v-if="authStore.user?.role === 'admin'" index="/system/permissions" class="menu-item">
            <el-icon><Lock /></el-icon>
            <span>权限管理</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 右侧内容区 -->
    <el-container class="content-wrapper">
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
              {{ item.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <el-avatar
              :size="32"
              src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
              class="user-avatar"
            />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  当前用户: {{ authStore.user?.name }} ({{ settingsStore.getRoleDisplayName(authStore.user?.role || '') }})
                </el-dropdown-item>
                <el-dropdown-item divided @click="goToSettings">
                  <el-icon><Setting /></el-icon>
                  系统设置
                </el-dropdown-item>
                <el-dropdown-item @click="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import SystemIntroDialog from '@/components/SystemIntroDialog.vue';
import { 
  House, 
  OfficeBuilding, 
  Postcard, 
  User, 
  UserFilled,
  Setting, 
  Calendar, 
  Clock,
  Upload,
  MagicStick,
  Lock,
  Tools, 
  SwitchButton 
} from '@element-plus/icons-vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const router = useRouter();
const route = useRoute();

// 系统简介对话框控制
const showIntroDialog = ref(false);

// 检查是否需要显示系统简介
onMounted(() => {
  const hasSeenIntro = localStorage.getItem('hasSeenSystemIntro');
  if (!hasSeenIntro) {
    // 延迟显示，确保页面完全加载
    setTimeout(() => {
      showIntroDialog.value = true;
    }, 1000);
  }
});

// 处理简介对话框关闭
const handleIntroClose = (dontShowAgain: boolean) => {
  showIntroDialog.value = false;
  if (dontShowAgain) {
    localStorage.setItem('hasSeenSystemIntro', 'true');
  }
};

// 处理开始使用
const handleIntroStart = (dontShowAgain: boolean) => {
  showIntroDialog.value = false;
  if (dontShowAgain) {
    localStorage.setItem('hasSeenSystemIntro', 'true');
  }
  // 可以导航到员工管理页面
  router.push('/personnel/employees');
};

// 当前激活的菜单路径
const activeMenuPath = computed(() => {
  return route.path;
});

// 默认展开的子菜单
const defaultOpeneds = computed(() => {
  const path = route.path;
  const openeds = [];
  
  if (path.startsWith('/personnel/')) {
    openeds.push('personnel');
  }
  if (path.startsWith('/schedule/')) {
    openeds.push('schedule');
  }
  if (path.startsWith('/system/')) {
    openeds.push('system');
  }
  
  return openeds;
});

// 面包屑导航
const breadcrumbs = computed(() => {
  const pathMap: Record<string, string> = {
    '/dashboard': '仪表盘',
    '/personnel/employees': '员工信息',
    '/personnel/departments': '组织架构',
    '/personnel/import': '批量导入',
    '/schedule/calendar': '排班日历',
    '/schedule/roles': '值班角色配置',
    '/schedule/engine': '智能排班',
    '/system/settings': '基础配置',
    '/system/positions': '岗位管理',
    '/system/permissions': '权限管理',
    // 兼容旧路径
    '/departments': '部门管理',
    '/positions': '岗位管理',
    '/employees': '员工管理',
    '/rules': '规则管理',
    '/groups': '编组管理',
    '/personnel-status': '人员状态',
    '/calendar': '排班日历',
    '/settings': '系统设置'
  };
  
  const breadcrumbItems = [{ path: '/dashboard', name: '仪表盘' }];
  
  if (pathMap[route.path] && route.path !== '/dashboard') {
    // 添加父级菜单
    if (route.path.startsWith('/personnel/')) {
      breadcrumbItems.push({ path: '/personnel', name: '人员管理' });
    } else if (route.path.startsWith('/schedule/')) {
      breadcrumbItems.push({ path: '/schedule', name: '排班管理' });
    } else if (route.path.startsWith('/system/')) {
      breadcrumbItems.push({ path: '/system', name: '系统设置' });
    }
    
    breadcrumbItems.push({ path: route.path, name: pathMap[route.path] });
  }
  
  return breadcrumbItems;
});

const logout = () => {
  authStore.logout();
  router.push('/login');
};

const goToSettings = () => {
  router.push('/settings');
};
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
  background-color: #f0f2f5;
}

.sidebar {
  background-color: #1d2129 !important;
  border-right: none !important;
  
  .sidebar-logo {
    padding: 0 20px;
    height: 64px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid #2d3238;
    
    .logo-img {
      height: 32px;
      width: 32px;
    }
    
    .logo-text {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
    }
  }
  
  .sidebar-menu {
    border-right: none !important;
    background-color: transparent !important;
    padding: 8px;
    
    .menu-item {
      height: 44px;
      line-height: 44px;
      margin: 0 0 4px 0;
      border-radius: 6px;
      color: #a3a6ad;
      border-left: none;
      
      &:hover {
        background-color: #2d3238 !important;
        color: #ffffff;
      }
      
      &.is-active {
        background-color: #2d8cf0 !important;
        color: #ffffff !important;
        font-weight: 500;
        border-left: 3px solid #ffffff;
      }
      
      .el-icon {
        margin-right: 12px;
        font-size: 16px;
      }
    }
    
    .sub-menu {
      margin: 0 0 4px 0;
      border-radius: 6px;
      
      :deep(.el-sub-menu__title) {
        height: 44px;
        line-height: 44px;
        padding: 0 20px;
        color: #a3a6ad;
        border-radius: 6px;
        
        &:hover {
          background-color: #2d3238 !important;
          color: #ffffff;
        }
        
        .el-icon {
          margin-right: 12px;
          font-size: 16px;
        }
      }
      
      :deep(.el-menu) {
        background-color: transparent !important;
      }
      
      :deep(.el-menu-item) {
        height: 40px;
        line-height: 40px;
        padding-left: 52px !important;
        margin: 2px 0;
        border-radius: 6px;
        color: #a3a6ad;
        
        &:hover {
          background-color: #2d3238 !important;
          color: #ffffff;
        }
        
        &.is-active {
          background-color: #2d8cf0 !important;
          color: #ffffff !important;
          font-weight: 500;
        }
        
        .el-icon {
          margin-right: 8px;
          font-size: 14px;
        }
      }
    }
  }
}

.content-wrapper {
  .header {
    height: 64px !important;
    background-color: #ffffff !important;
    border-bottom: 1px solid #e4e7ed !important;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .header-left {
      .el-breadcrumb {
        font-size: 14px;
      }
    }
    
    .header-right {
      display: flex;
      align-items: center;
      
      .user-avatar {
        cursor: pointer;
      }
    }
  }
  
  .main-content {
    padding: 16px;
    height: calc(100vh - 64px);
    overflow-y: auto;
    background-color: #f0f2f5;
  }
}

/* 页面过渡动画 */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.25s ease-out;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>