<template>
  <div class="system-monitor">
    <div class="page-header">
      <h1 class="page-title">系统监控</h1>
      <p class="page-description">实时监控系统性能和运行状态</p>
    </div>

    <!-- 概览卡片 -->
    <el-row :gutter="16" class="overview-section">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">⚡</div>
            <div class="metric-info">
              <div class="metric-value">{{ performanceMetrics.averageApiTime }}ms</div>
              <div class="metric-label">平均API响应时间</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">💾</div>
            <div class="metric-info">
              <div class="metric-value">{{ cacheStats.total }}</div>
              <div class="metric-label">缓存项数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">📊</div>
            <div class="metric-info">
              <div class="metric-value">{{ formatBytes(cacheStats.size) }}</div>
              <div class="metric-label">缓存占用内存</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">🔄</div>
            <div class="metric-info">
              <div class="metric-value">{{ cacheHitRate }}%</div>
              <div class="metric-label">缓存命中率</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 性能指标详情 -->
    <el-row :gutter="16" class="details-section">
      <el-col :xs="24" :lg="12">
        <el-card class="details-card">
          <template #header>
            <div class="card-header">
              <span>API性能指标</span>
              <el-button type="primary" link @click="refreshMetrics">刷新</el-button>
            </div>
          </template>
          
          <div class="metrics-table">
            <el-table :data="apiMetricsData" size="small" max-height="400">
              <el-table-column prop="name" label="API接口" width="200" />
              <el-table-column prop="average" label="平均耗时" width="100">
                <template #default="{ row }">
                  <span :class="getPerformanceClass(row.average)">
                    {{ row.average.toFixed(2) }}ms
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="count" label="调用次数" width="80" />
              <el-table-column prop="latest" label="最近耗时" width="100">
                <template #default="{ row }">
                  <span :class="getPerformanceClass(row.latest)">
                    {{ row.latest.toFixed(2) }}ms
                  </span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <el-card class="details-card">
          <template #header>
            <div class="card-header">
              <span>缓存管理</span>
              <div class="header-actions">
                <el-button type="warning" size="small" @click="clearExpiredCache">
                  清理过期
                </el-button>
                <el-button type="danger" size="small" @click="clearAllCache">
                  清空缓存
                </el-button>
              </div>
            </div>
          </template>
          
          <div class="cache-info">
            <div class="cache-stats">
              <div class="stat-item">
                <span class="stat-label">总缓存项:</span>
                <span class="stat-value">{{ cacheStats.total }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">过期项:</span>
                <span class="stat-value expired">{{ cacheStats.expired }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">内存占用:</span>
                <span class="stat-value">{{ formatBytes(cacheStats.size) }}</span>
              </div>
            </div>
            
            <div class="cache-progress">
              <div class="progress-label">缓存健康度</div>
              <el-progress 
                :percentage="cacheHealthPercentage" 
                :color="getCacheHealthColor(cacheHealthPercentage)"
                :show-text="false"
              />
              <div class="progress-text">{{ getCacheHealthText(cacheHealthPercentage) }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 系统日志 -->
    <el-card class="log-card">
      <template #header>
        <div class="card-header">
          <span>系统日志</span>
          <div class="header-actions">
            <el-select v-model="logLevel" size="small" style="width: 120px">
              <el-option label="全部" value="all" />
              <el-option label="错误" value="error" />
              <el-option label="警告" value="warning" />
              <el-option label="信息" value="info" />
            </el-select>
            <el-button type="primary" size="small" @click="clearLogs">清空日志</el-button>
          </div>
        </div>
      </template>
      
      <div class="log-container">
        <div 
          v-for="(log, index) in filteredLogs" 
          :key="index" 
          :class="['log-item', `log-${log.level}`]"
        >
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
        
        <div v-if="filteredLogs.length === 0" class="no-logs">
          暂无日志记录
        </div>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { performanceMonitor } from '@/utils/performance';
import { cacheManager } from '@/utils/cache';

// 响应式数据
const performanceMetrics = ref({
  averageApiTime: 0,
  totalApiCalls: 0
});

const cacheStats = ref({
  total: 0,
  expired: 0,
  size: 0
});

const apiMetricsData = ref([]);
const logLevel = ref('all');
const logs = ref<any[]>([]);

// 计算属性
const cacheHitRate = computed(() => {
  const total = cacheStats.value.total;
  const expired = cacheStats.value.expired;
  if (total === 0) return 0;
  return Math.round(((total - expired) / total) * 100);
});

const cacheHealthPercentage = computed(() => {
  return Math.max(0, Math.min(100, cacheHitRate.value));
});

const filteredLogs = computed(() => {
  if (logLevel.value === 'all') {
    return logs.value;
  }
  return logs.value.filter(log => log.level === logLevel.value);
});

// 方法
const refreshMetrics = () => {
  // 获取性能指标
  const metrics = performanceMonitor.getAllMetrics();
  apiMetricsData.value = Object.entries(metrics).map(([name, data]) => ({
    name,
    ...data
  }));

  // 计算平均API时间
  const apiMetrics = Object.values(metrics);
  if (apiMetrics.length > 0) {
    const totalTime = apiMetrics.reduce((sum, metric) => sum + metric.average, 0);
    performanceMetrics.value.averageApiTime = Math.round(totalTime / apiMetrics.length);
    performanceMetrics.value.totalApiCalls = apiMetrics.reduce((sum, metric) => sum + metric.count, 0);
  }

  // 获取缓存统计
  cacheStats.value = cacheManager.getStats();
};

const clearExpiredCache = async () => {
  try {
    const cleared = cacheManager.clearExpired();
    ElMessage.success(`清理了 ${cleared} 个过期缓存项`);
    refreshMetrics();
    addLog('info', `清理了 ${cleared} 个过期缓存项`);
  } catch (error) {
    ElMessage.error('清理过期缓存失败');
    addLog('error', '清理过期缓存失败');
  }
};

const clearAllCache = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有缓存吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    cacheManager.clear();
    ElMessage.success('缓存已清空');
    refreshMetrics();
    addLog('warning', '清空了所有缓存');
  } catch (error) {
    // 用户取消操作
  }
};

const clearLogs = () => {
  logs.value = [];
  ElMessage.success('日志已清空');
};

const addLog = (level: string, message: string) => {
  logs.value.unshift({
    level,
    message,
    timestamp: Date.now()
  });
  
  // 限制日志数量
  if (logs.value.length > 100) {
    logs.value = logs.value.slice(0, 100);
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString();
};

const getPerformanceClass = (time: number): string => {
  if (time < 500) return 'performance-good';
  if (time < 1000) return 'performance-warning';
  return 'performance-poor';
};

const getCacheHealthColor = (percentage: number): string => {
  if (percentage >= 80) return '#67c23a';
  if (percentage >= 60) return '#e6a23c';
  return '#f56c6c';
};

const getCacheHealthText = (percentage: number): string => {
  if (percentage >= 80) return '优秀';
  if (percentage >= 60) return '良好';
  return '需要优化';
};

// 定时刷新
let refreshTimer: number;

onMounted(() => {
  refreshMetrics();
  addLog('info', '系统监控页面已加载');
  
  // 每30秒刷新一次
  refreshTimer = setInterval(refreshMetrics, 30000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});
</script>

<style lang="scss" scoped>
.system-monitor {
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

  .overview-section {
    margin-bottom: 24px;
    
    .metric-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      
      .metric-content {
        display: flex;
        align-items: center;
        
        .metric-icon {
          font-size: 32px;
          margin-right: 16px;
        }
        
        .metric-info {
          .metric-value {
            font-size: 24px;
            font-weight: 600;
            color: #1d2129;
            line-height: 1;
          }
          
          .metric-label {
            font-size: 12px;
            color: #606266;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .details-section {
    margin-bottom: 24px;
    
    .details-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1d2129;
        
        .header-actions {
          display: flex;
          gap: 8px;
        }
      }
      
      .cache-info {
        .cache-stats {
          margin-bottom: 20px;
          
          .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            
            .stat-label {
              color: #606266;
            }
            
            .stat-value {
              font-weight: 500;
              
              &.expired {
                color: #e6a23c;
              }
            }
          }
        }
        
        .cache-progress {
          .progress-label {
            font-size: 14px;
            color: #606266;
            margin-bottom: 8px;
          }
          
          .progress-text {
            text-align: center;
            font-size: 12px;
            color: #606266;
            margin-top: 4px;
          }
        }
      }
    }
  }

  .log-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      color: #1d2129;
      
      .header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
    }
    
    .log-container {
      max-height: 400px;
      overflow-y: auto;
      
      .log-item {
        display: flex;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #f0f0f0;
        font-size: 12px;
        
        .log-time {
          width: 80px;
          color: #909399;
          margin-right: 12px;
        }
        
        .log-level {
          width: 60px;
          font-weight: 500;
          margin-right: 12px;
        }
        
        .log-message {
          flex: 1;
          color: #606266;
        }
        
        &.log-error {
          .log-level {
            color: #f56c6c;
          }
        }
        
        &.log-warning {
          .log-level {
            color: #e6a23c;
          }
        }
        
        &.log-info {
          .log-level {
            color: #409eff;
          }
        }
      }
      
      .no-logs {
        text-align: center;
        color: #909399;
        padding: 40px 0;
      }
    }
  }
}

// 性能指标颜色
.performance-good {
  color: #67c23a;
}

.performance-warning {
  color: #e6a23c;
}

.performance-poor {
  color: #f56c6c;
}

// 响应式设计
@media (max-width: 768px) {
  .system-monitor {
    .overview-section {
      .el-col {
        margin-bottom: 16px;
      }
    }
    
    .details-section {
      .el-col {
        margin-bottom: 16px;
      }
    }
  }
}
</style>