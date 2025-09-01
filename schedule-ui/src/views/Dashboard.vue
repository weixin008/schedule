<template>
  <div class="dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">系统概览</h1>
      <p class="page-description">实时监控排班系统运行状态和关键指标</p>
    </div>

    <!-- 统计卡片网格 -->
    <el-row :gutter="16" class="stats-grid">
      <el-col :xs="24" :sm="12" :md="6" v-for="stat in statsData" :key="stat.key">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon-wrapper" :style="{ backgroundColor: stat.iconBg }">
              <el-icon class="stat-icon" :style="{ color: stat.iconColor }">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-title">{{ stat.title }}</div>
              <div class="stat-value">{{ stat.value }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 近期值班信息 -->
    <el-row :gutter="16" class="schedule-section">
      <el-col :xs="24" :lg="12">
        <el-card class="schedule-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>今日值班</span>
              <el-button type="primary" link @click="router.push('/schedule/calendar')">查看日历</el-button>
            </div>
          </template>
          <div class="schedule-list">
            <div v-if="recentSchedules.today.length === 0" class="empty-state">
              <el-icon class="empty-icon"><Calendar /></el-icon>
              <p>今日暂无值班安排</p>
            </div>
            <div v-for="schedule in recentSchedules.today" :key="schedule.id" class="schedule-item">
              <div class="schedule-time">{{ schedule.shift }}</div>
              <div class="schedule-info">
                <div class="schedule-role">{{ schedule.role }}</div>
                <div class="schedule-person">{{ schedule.assignedPerson || schedule.assignedGroup || '未分配' }}</div>
              </div>
              <div class="schedule-status" :class="schedule.status">
                <el-tag :type="getStatusType(schedule.status)" size="small">
                  {{ getStatusText(schedule.status) }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <el-card class="schedule-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>明日值班</span>
              <el-button type="primary" link @click="router.push('/schedule/engine')">智能排班</el-button>
            </div>
          </template>
          <div class="schedule-list">
            <div v-if="recentSchedules.tomorrow.length === 0" class="empty-state">
              <el-icon class="empty-icon"><Calendar /></el-icon>
              <p>明日暂无值班安排</p>
            </div>
            <div v-for="schedule in recentSchedules.tomorrow" :key="schedule.id" class="schedule-item">
              <div class="schedule-time">{{ schedule.shift }}</div>
              <div class="schedule-info">
                <div class="schedule-role">{{ schedule.role }}</div>
                <div class="schedule-person">{{ schedule.assignedPerson || schedule.assignedGroup || '未分配' }}</div>
              </div>
              <div class="schedule-status" :class="schedule.status">
                <el-tag :type="getStatusType(schedule.status)" size="small">
                  {{ getStatusText(schedule.status) }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 系统状态和冲突警告 -->
    <el-row :gutter="16" class="status-section">
      <el-col :xs="24" :lg="16">
        <el-card class="status-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>系统状态</span>
              <el-button type="primary" link @click="router.push('/schedule/roles')">管理角色</el-button>
            </div>
          </template>
          <div class="status-content">
            <div class="status-item">
              <div class="status-label">排班规则总数</div>
              <div class="status-value">{{ systemStatus.totalRules }}</div>
            </div>
            <div class="status-item">
              <div class="status-label">活跃规则数</div>
              <div class="status-value">{{ systemStatus.activeRules }}</div>
            </div>
            <div class="status-item">
              <div class="status-label">最后生成时间</div>
              <div class="status-value">
                {{ systemStatus.lastGeneratedDate ? formatDate(systemStatus.lastGeneratedDate) : '未生成' }}
              </div>
            </div>
            <div class="status-item">
              <div class="status-label">下次排班日期</div>
              <div class="status-value">
                {{ systemStatus.nextScheduleDate ? formatDate(systemStatus.nextScheduleDate) : '未设置' }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="8">
        <el-card class="conflicts-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>冲突警告</span>
              <el-badge :value="recentSchedules.conflicts.length" :hidden="recentSchedules.conflicts.length === 0">
                <el-icon><Warning /></el-icon>
              </el-badge>
            </div>
          </template>
          <div class="conflicts-list">
            <div v-if="recentSchedules.conflicts.length === 0" class="empty-state">
              <el-icon class="empty-icon" style="color: #52c41a;"><User /></el-icon>
              <p style="color: #52c41a;">暂无冲突</p>
            </div>
            <div v-for="conflict in recentSchedules.conflicts" :key="conflict.id" class="conflict-item">
              <el-icon class="conflict-icon"><Warning /></el-icon>
              <div class="conflict-content">
                <div class="conflict-title">{{ conflict.title }}</div>
                <div class="conflict-desc">{{ conflict.description }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近活动 -->
    <el-row :gutter="16" class="activity-section">
      <el-col :xs="24" :lg="16">
        <el-card class="activity-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>最近活动</span>
              <el-button type="primary" link>查看全部</el-button>
            </div>
          </template>
          <div class="activity-list">
            <div v-if="recentActivities.length === 0" class="empty-state">
              <el-icon class="empty-icon"><Calendar /></el-icon>
              <p>暂无最近活动</p>
            </div>
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="activity-icon" :style="{ backgroundColor: activity.iconBg }">
                <el-icon :style="{ color: activity.iconColor }">
                  <component :is="activity.icon" />
                </el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-time">{{ activity.time }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="8">
        <el-card class="quick-actions-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button 
              v-for="action in quickActions" 
              :key="action.key"
              :type="action.type" 
              :icon="action.icon"
              class="action-button"
              @click="handleQuickAction(action.key)"
            >
              {{ action.label }}
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api';
import { 
  Calendar, 
  Edit,
  User, 
  Setting,
  Plus,
  Warning
} from '@element-plus/icons-vue';


const router = useRouter();

// 人员统计数据
const personnelStats = ref({
  total: 0,
  available: 0,
  onLeave: 0,
  onBusinessTrip: 0,
  byDepartment: {} as Record<string, number>,
  byStatus: {} as Record<string, number>
});

// 统计卡片数据
const statsData = ref([
  {
    key: 'total',
    title: '员工总数',
    value: 0,
    icon: markRaw(User),
    iconBg: '#e6f7ff',
    iconColor: '#1890ff'
  },
  {
    key: 'available',
    title: '可用人员',
    value: 0,
    icon: markRaw(User),
    iconBg: '#f6ffed',
    iconColor: '#52c41a'
  },
  {
    key: 'onLeave',
    title: '请假人员',
    value: 0,
    icon: markRaw(Warning),
    iconBg: '#fff2e8',
    iconColor: '#fa8c16'
  },
  {
    key: 'onBusinessTrip',
    title: '出差人员',
    value: 0,
    icon: markRaw(Setting),
    iconBg: '#f9f0ff',
    iconColor: '#722ed1'
  }
]);

// 近期值班信息
const recentSchedules = ref({
  today: [] as any[],
  tomorrow: [] as any[],
  thisWeek: [] as any[],
  conflicts: [] as any[]
});

// 系统状态
const systemStatus = ref({
  totalRules: 0,
  activeRules: 0,
  lastGeneratedDate: null as Date | null,
  nextScheduleDate: null as Date | null
});



// 近期活动
const recentActivities = ref([]);

// 快捷操作
const quickActions = ref([
  {
    key: 'intelligent-schedule',
    label: '智能排班',
    icon: markRaw(Plus),
    type: 'primary'
  },
  {
    key: 'add-employee',
    label: '添加员工',
    icon: markRaw(User),
    type: 'success'
  },
  {
    key: 'manage-rules',
    label: '排班规则',
    icon: markRaw(Setting),
    type: 'warning'
  },
  {
    key: 'view-calendar',
    label: '排班日历',
    icon: markRaw(Calendar),
    type: 'info'
  }
]);

// 处理快捷操作
const handleQuickAction = (key: string) => {
  switch (key) {
    case 'intelligent-schedule':
      router.push('/schedule/engine');
      break;
    case 'add-employee':
      router.push('/personnel/employees');
      break;
    case 'manage-rules':
      router.push('/schedule/roles');
      break;
    case 'view-calendar':
      router.push('/schedule/calendar');
      break;
  }
};

// 辅助函数
const getStatusType = (status: string) => {
  switch (status) {
    case 'NORMAL': return 'success';
    case 'CONFLICT': return 'danger';
    case 'EMPTY': return 'warning';
    default: return 'info';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'NORMAL': return '正常';
    case 'CONFLICT': return '冲突';
    case 'EMPTY': return '空缺';
    default: return '未知';
  }
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN');
};

// 加载人员统计数据
const loadPersonnelStats = async () => {
  try {
    const response = await apiClient.get('/employees');
    const employees = response.data;
    
    personnelStats.value.total = employees.length;
    personnelStats.value.available = employees.filter((e: any) => e.status === 'ON_DUTY').length;
    personnelStats.value.onLeave = employees.filter((e: any) => e.status === 'LEAVE').length;
    personnelStats.value.onBusinessTrip = employees.filter((e: any) => e.status === 'BUSINESS_TRIP').length;
    
    // 按部门统计
    const deptStats: Record<string, number> = {};
    employees.forEach((e: any) => {
      if (e.department) {
        deptStats[e.department] = (deptStats[e.department] || 0) + 1;
      }
    });
    personnelStats.value.byDepartment = deptStats;
    
    // 按状态统计
    const statusStats: Record<string, number> = {};
    employees.forEach((e: any) => {
      statusStats[e.status] = (statusStats[e.status] || 0) + 1;
    });
    personnelStats.value.byStatus = statusStats;
    
    // 更新统计卡片
    statsData.value.find(s => s.key === 'total')!.value = personnelStats.value.total;
    statsData.value.find(s => s.key === 'available')!.value = personnelStats.value.available;
    statsData.value.find(s => s.key === 'onLeave')!.value = personnelStats.value.onLeave;
    statsData.value.find(s => s.key === 'onBusinessTrip')!.value = personnelStats.value.onBusinessTrip;
  } catch (error) {
    console.error('加载人员统计失败:', error);
  }
};

// 加载近期值班信息
const loadRecentSchedules = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('📅 加载仪表盘排班数据:', { today, tomorrow });
    
    // 获取所有排班数据
    const allSchedulesResponse = await apiClient.get('/schedules');
    const allSchedules = allSchedulesResponse.data || [];
    
    console.log('📋 获取到所有排班数据:', allSchedules.length, '条');
    
    // 筛选今日值班
    const todaySchedules = allSchedules.filter((s: any) => {
      const scheduleDate = s.date ? s.date.split('T')[0] : null;
      return scheduleDate === today;
    });
    
    // 筛选明日值班
    const tomorrowSchedules = allSchedules.filter((s: any) => {
      const scheduleDate = s.date ? s.date.split('T')[0] : null;
      return scheduleDate === tomorrow;
    });
    
    console.log('📅 今日排班:', todaySchedules.length, '条');
    console.log('📅 明日排班:', tomorrowSchedules.length, '条');
    
    // 处理今日值班数据
    recentSchedules.value.today = todaySchedules.map((s: any) => ({
      ...s,
      shift: s.shift || s.title || '值班',
      role: s.shift || '值班员',
      assignedPerson: s.employee?.name || s.employeeName || s.assignedPerson?.name || '未分配',
      status: s.status || 'NORMAL'
    }));
    
    // 处理明日值班数据
    recentSchedules.value.tomorrow = tomorrowSchedules.map((s: any) => ({
      ...s,
      shift: s.shift || s.title || '值班',
      role: s.shift || '值班员',
      assignedPerson: s.employee?.name || s.employeeName || s.assignedPerson?.name || '未分配',
      status: s.status || 'NORMAL'
    }));
    
    console.log('✅ 仪表盘排班数据处理完成');
    
    // 模拟冲突数据（实际应该从冲突检测API获取）
    recentSchedules.value.conflicts = [];
  } catch (error) {
    console.error('❌ 加载近期值班信息失败:', error);
  }
};

// 加载系统状态
const loadSystemStatus = async () => {
  try {
    const rulesResponse = await apiClient.get('/schedule-rules');
    const rules = rulesResponse.data;
    
    systemStatus.value.totalRules = rules.length;
    systemStatus.value.activeRules = rules.filter((r: any) => r.isActive).length;
    
    // 模拟其他状态数据
    systemStatus.value.lastGeneratedDate = new Date();
    systemStatus.value.nextScheduleDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } catch (error) {
    console.error('加载系统状态失败:', error);
  }
};

// 加载所有仪表盘数据
const loadDashboardData = async () => {
  await Promise.all([
    loadPersonnelStats(),
    loadRecentSchedules(),
    loadSystemStatus()
  ]);
};

onMounted(() => {
  loadDashboardData();
});
</script>

<style lang="scss" scoped>
.dashboard {
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

  .stats-grid {
    margin-bottom: 24px;
    
    .stat-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      transition: all 0.3s ease;
      
      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        transform: translateY(-2px);
      }
      
      .stat-content {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        
        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
          
          .stat-icon {
            font-size: 24px;
          }
        }
        
        .stat-info {
          flex: 1;
          
          .stat-title {
            font-size: 16px;
            font-weight: 600;
            color: #1d2129;
            margin-bottom: 4px;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #1d2129;
          }
        }
      }
    }
  }

  .schedule-section {
    margin-bottom: 24px;
    
    .schedule-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1d2129;
      }
      
      .schedule-list {
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          color: #909399;
          
          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          
          p {
            margin: 0;
            font-size: 14px;
          }
        }
        
        .schedule-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
          
          &:last-child {
            border-bottom: none;
          }
          
          .schedule-time {
            width: 80px;
            font-size: 12px;
            color: #909399;
            font-weight: 500;
          }
          
          .schedule-info {
            flex: 1;
            margin-left: 12px;
            
            .schedule-role {
              font-size: 14px;
              color: #1d2129;
              margin-bottom: 4px;
              font-weight: 500;
            }
            
            .schedule-person {
              font-size: 12px;
              color: #606266;
            }
          }
          
          .schedule-status {
            margin-left: 12px;
          }
        }
      }
    }
  }

  .status-section {
    .status-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1d2129;
      }
      
      .status-content {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        
        .status-item {
          .status-label {
            font-size: 14px;
            color: #606266;
            margin-bottom: 8px;
          }
          
          .status-value {
            font-size: 18px;
            font-weight: 600;
            color: #1d2129;
          }
        }
      }
    }
    
    .conflicts-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1d2129;
      }
      
      .conflicts-list {
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          
          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          
          p {
            margin: 0;
            font-size: 14px;
            font-weight: 500;
          }
        }
        
        .conflict-item {
          display: flex;
          align-items: flex-start;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
          
          &:last-child {
            border-bottom: none;
          }
          
          .conflict-icon {
            color: #fa8c16;
            font-size: 16px;
            margin-right: 12px;
            margin-top: 2px;
          }
          
          .conflict-content {
            flex: 1;
            
            .conflict-title {
              font-size: 14px;
              color: #1d2129;
              margin-bottom: 4px;
              font-weight: 500;
            }
            
            .conflict-desc {
              font-size: 12px;
              color: #606266;
              line-height: 1.4;
            }
          }
        }
      }
    }
  }

  .activity-section {
    .activity-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1d2129;
      }
      
      .activity-list {
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          color: #909399;
          
          .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          
          p {
            margin: 0;
            font-size: 14px;
          }
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
          
          &:last-child {
            border-bottom: none;
          }
          
          .activity-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            
            .el-icon {
              font-size: 16px;
            }
          }
          
          .activity-content {
            flex: 1;
            
            .activity-title {
              font-size: 14px;
              color: #1d2129;
              margin-bottom: 4px;
            }
            
            .activity-time {
              font-size: 12px;
              color: #909399;
            }
          }
        }
      }
    }
    
    .quick-actions-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      
      .card-header {
        font-weight: 600;
        color: #1d2129;
      }
      
      .quick-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        
        .action-button {
          width: 100%;
          height: 40px;
          justify-content: flex-start;
          
          .el-icon {
            margin-right: 8px;
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .dashboard {
    .stats-grid {
      .el-col {
        margin-bottom: 16px;
      }
    }
    
    .charts-section {
      .el-col {
        margin-bottom: 16px;
      }
    }
    
    .activity-section {
      .el-col {
        margin-bottom: 16px;
      }
    }
  }
}
</style>