import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '@/layout/MainLayout.vue';
import Dashboard from '@/views/Dashboard.vue';
import DepartmentManagement from '@/views/DepartmentManagement.vue';
import PositionManagement from '@/views/PositionManagement.vue';
import EmployeeManagement from '@/views/EmployeeManagement.vue';
import RuleManagement from '@/views/RuleManagement.vue';
import ScheduleCalendar from '@/views/ScheduleCalendar.vue';
import Login from '@/views/Login.vue';
import Register from '@/views/Register.vue';
import SystemSettings from '@/views/SystemSettings.vue';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      // 📊 仪表盘
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '仪表盘', icon: 'House' }
      },
      
      // 👥 人员管理
      {
        path: 'personnel',
        name: 'PersonnelManagement',
        redirect: '/personnel/employees',
        meta: { title: '人员管理', icon: 'User' },
        children: [
          {
            path: 'employees',
            name: 'EmployeeManagement',
            component: EmployeeManagement,
            meta: { title: '员工信息', icon: 'User' }
          },
          {
            path: 'departments',
            name: 'DepartmentManagement',
            component: () => import('@/views/OrganizationManagement.vue'),
            meta: { title: '组织架构', icon: 'OfficeBuilding', adminOnly: true }
          },
          {
            path: 'import',
            name: 'PersonnelImport',
            component: () => import('@/views/PersonnelImport.vue'),
            meta: { title: '批量导入', icon: 'Upload' }
          }
        ]
      },
      
      // 📅 排班管理（核心功能）
      {
        path: 'schedule',
        name: 'ScheduleManagement',
        redirect: '/schedule/calendar',
        meta: { title: '排班管理', icon: 'Calendar' },
        children: [
          {
            path: 'calendar',
            name: 'ScheduleCalendar',
            component: ScheduleCalendar,
            meta: { title: '排班日历', icon: 'Calendar' }
          },

          {
            path: 'roles',
            name: 'ImprovedShiftRoleManagement',
            component: () => import('@/views/ImprovedShiftRoleManagement.vue'),
            meta: { title: '值班角色配置', icon: 'UserFilled' }
          },
          {
            path: 'roles-old',
            name: 'ShiftRoleManagement',
            component: () => import('@/views/ShiftRoleManagement.vue'),
            meta: { title: '值班角色配置(旧版)', icon: 'UserFilled', hidden: true }
          },
          {
            path: 'groups',
            name: 'GroupManagement',
            component: () => import('@/views/GroupManagement.vue'),
            meta: { title: '编组管理', icon: 'Users', disabled: true, hidden: true }
          },
          {
            path: 'generate',
            name: 'RoleBasedScheduleGeneration',
            component: () => import('@/views/RoleBasedScheduleGeneration.vue'),
            meta: { title: '智能排班', icon: 'MagicStick' }
          },
          {
            path: 'engine',
            name: 'ScheduleEngine',
            component: () => import('@/views/ScheduleEngineFixed.vue'),
            meta: { title: '智能排班(旧版)', icon: 'MagicStick', hidden: true }
          },
          {
            path: 'advanced-config',
            name: 'AdvancedScheduleConfig',
            component: () => import('@/views/AdvancedScheduleConfig.vue'),
            meta: { title: '高级排班配置', icon: 'Tools' }
          },
          {
            path: 'custom-config',
            name: 'CustomScheduleConfig',
            component: () => import('@/views/CustomScheduleConfig.vue'),
            meta: { title: '12人单位排班', icon: 'Star' }
          },

        ]
      },
      
      // ⚙️ 系统设置
      {
        path: 'system',
        name: 'SystemManagement',
        redirect: '/system/settings',
        meta: { title: '系统设置', icon: 'Setting' },
        children: [
          {
            path: 'settings',
            name: 'SystemSettings',
            component: SystemSettings,
            meta: { title: '基础配置', icon: 'Setting' }
          },
          {
            path: 'positions',
            name: 'PositionManagement',
            component: PositionManagement,
            meta: { title: '岗位管理', icon: 'Postcard' }
          },
          {
            path: 'permissions',
            name: 'PermissionManagement',
            component: () => import('@/views/PermissionManagement.vue'),
            meta: { title: '权限管理', icon: 'Lock', adminOnly: true }
          },
          {
            path: 'monitor',
            name: 'SystemMonitor',
            component: () => import('@/views/SystemMonitor.vue'),
            meta: { title: '系统监控', icon: 'Monitor', adminOnly: true }
          }
        ]
      },
      
      // 保留旧路由以兼容
      {
        path: 'personnel-status',
        name: 'PersonnelStatus',
        component: () => import('@/views/PersonnelStatus.vue'),
        meta: { hidden: true }
      },
      

    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  try {
    // Fetch profile if not already fetched and token exists
    if (!authStore.user && authStore.token) {
      await authStore.fetchProfile();
    }

    const isAuthenticated = !!authStore.token && !!authStore.user;

    if (to.matched.some(record => record.meta.requiresAuth)) {
      if (!isAuthenticated) {
        next({ name: 'Login' });
      } else {
        next();
      }
    } else if (to.name === 'Login' && isAuthenticated) {
      next({ path: '/' });
    } else {
      next();
    }
  } catch (error) {
    authStore.logout();
    next({ name: 'Login' });
  }
});

export default router;