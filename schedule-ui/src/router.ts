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
import { useAuthStore } from './stores/auth';
import KanbanView from '@/views/KanbanView.vue'; // Import the new component

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
    path: '/kanban',
    name: 'KanbanView',
    component: KanbanView,
    meta: { requiresAuth: false }, // This page does not require authentication
  },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
      },
      {
        path: 'positions',
        name: 'PositionManagement',
        component: PositionManagement,
      },
      {
        path: 'employees',
        name: 'EmployeeManagement',
        component: EmployeeManagement,
      },
      {
        path: 'groups',
        name: 'GroupManagement',
        component: () => import('@/views/GroupManagement.vue'),
      },
      {
        path: 'rules',
        name: 'RuleManagement',
        component: RuleManagement,
      },
      {
        path: 'personnel-status',
        name: 'PersonnelStatus',
        component: () => import('@/views/PersonnelStatus.vue'),
      },
      {
        path: 'calendar',
        name: 'ScheduleCalendar',
        component: ScheduleCalendar,
      },
      {
        path: 'settings',
        name: 'SystemSettings',
        component: SystemSettings,
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