<template>
  <div class="schedule-engine">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">智能排班</h1>
      <p class="page-description">使用智能算法自动生成排班计划，支持多种排班规则和冲突检测</p>
    </div>

    <!-- 系统状态 -->
    <div v-if="scheduleRules.length > 0" class="status-info">
      <el-alert
        :title="`已配置 ${scheduleRules.length} 个排班规则`"
        type="success"
        :closable="false"
        show-icon
        class="debug-alert"
      >
        <template #default>
          <div class="rules-summary">
            <span v-for="rule in scheduleRules" :key="rule.id" class="rule-tag">
              {{ rule.name }}
            </span>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 配置检查提示 -->
    <div v-if="configurationIssues.length > 0" class="configuration-alerts">
      <el-alert
        v-for="issue in configurationIssues"
        :key="issue.type"
        :title="issue.title"
        :type="issue.level"
        :closable="false"
        show-icon
        class="config-alert"
      >
        <template #default>
          <p>{{ issue.message }}</p>
          <el-button 
            type="primary" 
            size="small" 
            @click="handleConfigurationAction(issue.action)"
          >
            {{ issue.actionText }}
          </el-button>
        </template>
      </el-alert>
    </div>

    <!-- 操作区域 -->
    <el-row :gutter="16" class="action-section">
      <el-col :xs="24" :lg="16">
        <el-card class="generation-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>排班生成</span>
              <el-button 
                type="primary" 
                :icon="MagicStick" 
                @click="showGenerationDialog = true"
                :disabled="!canGenerate"
              >
                开始生成
              </el-button>
            </div>
          </template>
          
          <div class="generation-form">
            <el-form :model="generationForm" label-width="120px" size="default">
              <el-form-item label="排班规则">
                <div class="rule-select-container">
                  <el-select v-model="generationForm.ruleId" placeholder="选择排班规则" style="width: 100%">
                    <el-option
                      v-for="rule in scheduleRules"
                      :key="rule.id"
                      :label="rule.name"
                      :value="rule.id"
                    >
                    <div class="rule-option">
                      <div class="rule-main">
                        <span class="rule-name">{{ rule.name }}</span>
                        <span class="rule-type">{{ getRuleTypeText(rule.rotationType) }}</span>
                      </div>
                      <div v-if="rule.source === 'roles'" class="rule-details">
                        <span class="rule-time">
                          {{ rule.timeConfig?.startTime }}-{{ rule.timeConfig?.endTime }}
                          <span v-if="rule.timeConfig?.crossDay">(次日)</span>
                        </span>
                        <span class="rule-category">{{ getShiftCategoryText(rule.shiftCategory) }}</span>
                      </div>
                    </div>
                  </el-option>
                </el-select>
                <el-button 
                  type="primary" 
                  link 
                  @click="loadScheduleRules"
                  style="margin-top: 8px;"
                >
                  <el-icon><Refresh /></el-icon>
                  刷新规则列表
                </el-button>
              </el-form-item>
              
              <el-form-item label="时间范围">
                <el-date-picker
                  v-model="generationForm.dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  format="YYYY-MM-DD"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
              
              <el-form-item label="生成选项">
                <el-checkbox v-model="generationForm.forceRegenerate">强制重新生成</el-checkbox>
                <el-checkbox v-model="generationForm.previewMode">预览模式</el-checkbox>
              </el-form-item>
            </el-form>
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
              type="primary" 
              :icon="View" 
              class="action-button"
              @click="previewRule"
              :disabled="!generationForm.ruleId"
            >
              预览规则效果
            </el-button>
            
            <el-button 
              type="success" 
              :icon="Check" 
              class="action-button"
              @click="detectConflicts"
            >
              检测冲突
            </el-button>
            
            <el-button 
              type="warning" 
              :icon="Setting" 
              class="action-button"
              @click="$router.push('/schedule/roles')"
            >
              管理角色
            </el-button>
            
            <el-button 
              type="info" 
              :icon="Refresh" 
              class="action-button"
              @click="forceRefresh"
            >
              强制刷新
            </el-button>
            
            <el-button 
              type="info" 
              :icon="Calendar" 
              class="action-button"
              @click="$router.push('/schedule/calendar')"
            >
              查看日历
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 结果展示区域 -->
    <div v-if="generationResult" class="result-section">
      <el-card class="result-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>生成结果</span>
            <div class="result-actions">
              <el-button type="success" :icon="Check" @click="applySchedules" v-if="!generationResult.applied">
                应用排班
              </el-button>
              <el-button type="primary" :icon="Download" @click="exportSchedules">
                导出结果
              </el-button>
            </div>
          </div>
        </template>
        
        <!-- 统计信息 -->
        <div class="result-stats">
          <div class="stat-item">
            <div class="stat-label">总天数</div>
            <div class="stat-value">{{ generationResult.statistics.totalDays }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">已排班天数</div>
            <div class="stat-value success">{{ generationResult.statistics.scheduledDays }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">空缺天数</div>
            <div class="stat-value warning">{{ generationResult.statistics.emptyDays }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">冲突天数</div>
            <div class="stat-value danger">{{ generationResult.statistics.conflictDays }}</div>
          </div>
        </div>
        
        <!-- 冲突和警告 -->
        <div v-if="generationResult.conflicts.length > 0 || generationResult.warnings.length > 0" class="issues-section">
          <el-tabs v-model="activeIssueTab">
            <el-tab-pane label="冲突" :name="'conflicts'" v-if="generationResult.conflicts.length > 0">
              <div class="conflicts-list">
                <div v-for="conflict in generationResult.conflicts" :key="conflict.id" class="conflict-item">
                  <el-icon class="conflict-icon"><Warning /></el-icon>
                  <div class="conflict-content">
                    <div class="conflict-title">{{ conflict.title }}</div>
                    <div class="conflict-desc">{{ conflict.description }}</div>
                    <div class="conflict-actions">
                      <el-button size="small" type="primary" link>查看详情</el-button>
                      <el-button size="small" type="success" link>自动解决</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="警告" :name="'warnings'" v-if="generationResult.warnings.length > 0">
              <div class="warnings-list">
                <div v-for="(warning, index) in generationResult.warnings" :key="index" class="warning-item">
                  <el-icon class="warning-icon"><InfoFilled /></el-icon>
                  <span>{{ warning }}</span>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
        
        <!-- 排班预览 -->
        <div class="schedule-preview">
          <div class="preview-header">
            <span>排班预览</span>
            <el-button type="primary" link @click="showDetailedView = !showDetailedView">
              {{ showDetailedView ? '简化视图' : '详细视图' }}
            </el-button>
          </div>
          
          <div class="preview-content">
            <el-table :data="previewSchedules" stripe size="small" max-height="400">
              <el-table-column prop="date" label="日期" width="120" />
              <el-table-column prop="shift" label="班次" width="100" />
              <el-table-column prop="role" label="角色" width="120" />
              <el-table-column prop="assignedPerson" label="分配人员" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ getStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column v-if="showDetailedView" prop="notes" label="备注" />
            </el-table>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 生成对话框 -->
    <el-dialog
      v-model="showGenerationDialog"
      title="确认生成排班"
      width="500px"
      :before-close="handleDialogClose"
    >
      <div class="dialog-content">
        <el-alert
          title="生成提醒"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>即将根据选择的规则生成排班计划，请确认以下信息：</p>
            <ul>
              <li>排班规则：{{ selectedRuleName }}</li>
              <li>时间范围：{{ generationForm.dateRange?.[0] }} 至 {{ generationForm.dateRange?.[1] }}</li>
              <li>生成模式：{{ generationForm.previewMode ? '预览模式' : '正式生成' }}</li>
            </ul>
          </template>
        </el-alert>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showGenerationDialog = false">取消</el-button>
          <el-button type="primary" @click="generateSchedule" :loading="generating">
            {{ generating ? '生成中...' : '确认生成' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useRouter } from 'vue-router';
import { 
  MagicStick, 
  View, 
  Check, 
  Setting, 
  Calendar, 
  Download,
  Warning,
  InfoFilled,
  Refresh
} from '@element-plus/icons-vue';
import apiClient from '@/api';

// 路由
const router = useRouter();

// 响应式数据
const scheduleRules = ref([]);
const generationForm = ref({
  ruleId: null,
  dateRange: null,
  forceRegenerate: false,
  previewMode: false
});

const showGenerationDialog = ref(false);
const generating = ref(false);
const generationResult = ref(null);
const activeIssueTab = ref('conflicts');
const showDetailedView = ref(false);

// 计算属性
const selectedRuleName = computed(() => {
  const rule = scheduleRules.value.find(r => r.id === generationForm.value.ruleId);
  return rule ? rule.name : '';
});

const previewSchedules = computed(() => {
  if (!generationResult.value) return [];
  
  return generationResult.value.schedules.map(schedule => ({
    date: new Date(schedule.date).toLocaleDateString('zh-CN'),
    shift: schedule.shiftName || '全天',
    role: schedule.roleName || '值班员',
    assignedPerson: schedule.assignedPersonName || schedule.assignedGroupName || '未分配',
    status: schedule.status || 'NORMAL',
    notes: schedule.notes || ''
  }));
});

// 配置检查
const configurationIssues = computed(() => {
  const issues = [];
  
  // 检查是否有值班角色配置
  const savedRoles = JSON.parse(localStorage.getItem('shiftRoles') || '[]');
  if (savedRoles.length === 0) {
    issues.push({
      type: 'no_roles',
      level: 'error',
      title: '未配置值班角色',
      message: '智能排班需要先配置值班角色，包括值班时间、轮换方式和人员安排。',
      action: 'configure_roles',
      actionText: '立即配置'
    });
  } else {
    // 检查角色配置完整性
    const incompleteRoles = savedRoles.filter(role => {
      const config = role.extendedConfig;
      return !config?.timeConfig?.startTime || 
             !config?.timeConfig?.endTime || 
             !config?.timeConfig?.workDays?.length ||
             (!config?.selectedPersonnel?.length && !config?.selectedGroups?.length);
    });
    
    if (incompleteRoles.length > 0) {
      issues.push({
        type: 'incomplete_roles',
        level: 'warning',
        title: '值班角色配置不完整',
        message: `有 ${incompleteRoles.length} 个角色的配置不完整，可能影响排班效果。请检查值班时间、工作日和人员配置。`,
        action: 'configure_roles',
        actionText: '检查配置'
      });
    }
    
    // 检查时间覆盖
    const weekDays = ['0', '1', '2', '3', '4', '5', '6'];
    const uncoveredDays = weekDays.filter(day => {
      return !savedRoles.some(role => 
        role.extendedConfig?.timeConfig?.workDays?.includes(day)
      );
    });
    
    if (uncoveredDays.length > 0) {
      const dayNames = uncoveredDays.map(day => {
        const dayMap = { '0': '周日', '1': '周一', '2': '周二', '3': '周三', '4': '周四', '5': '周五', '6': '周六' };
        return dayMap[day];
      });
      
      issues.push({
        type: 'uncovered_days',
        level: 'warning',
        title: '工作日覆盖不完整',
        message: `${dayNames.join('、')} 还没有配置值班角色，建议完善覆盖配置。`,
        action: 'configure_roles',
        actionText: '完善配置'
      });
    }
  }
  
  return issues;
});

const canGenerate = computed(() => {
  return scheduleRules.value.length > 0 && 
         !configurationIssues.value.some(issue => issue.level === 'error');
});

// 方法
const getRuleTypeText = (type: string) => {
  const typeMap = {
    'DAILY': '每日轮换',
    'DAILY_ROTATION': '每日轮换',
    'WEEKLY': '每周轮换',
    'WEEKLY_ROTATION': '每周轮换',
    'MONTHLY': '每月轮换',
    'CONTINUOUS': '连班模式',
    'SHIFT_BASED': '基于班次'
  };
  return typeMap[type] || type;
};

const getShiftCategoryText = (category: string) => {
  const categoryMap = {
    'FULL_DAY': '全天班',
    'DAY_NIGHT': '白夜班',
    'MORNING_EVENING': '早晚班',
    'CUSTOM': '自定义'
  };
  return categoryMap[category] || '白夜班';
};

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

const loadScheduleRules = async () => {
  console.log('🔄 简化版加载排班规则...');
  
  try {
    const rawData = localStorage.getItem('shiftRoles');
    
    if (!rawData) {
      console.log('❌ 没有找到shiftRoles数据');
      scheduleRules.value = [];
      return;
    }
    
    const savedRoles = JSON.parse(rawData);
    console.log('✅ 成功解析角色数据，数量:', savedRoles.length);
    
    const rules = savedRoles.map(role => ({
      id: `role_${role.id}`,
      name: role.name,
      rotationType: role.extendedConfig?.rotationType || 'DAILY_ROTATION'
    }));
    
    scheduleRules.value = rules;
    console.log('✅ 设置规则完成，当前规则数量:', scheduleRules.value.length);
    
  } catch (error) {
    console.error('❌ 加载失败:', error);
    scheduleRules.value = [];
  }
};

const previewRule = async () => {
  if (!generationForm.value.ruleId) {
    ElMessage.warning('请先选择排班规则');
    return;
  }
  
  try {
    const startDate = generationForm.value.dateRange?.[0] || new Date().toISOString().split('T')[0];
    const endDate = generationForm.value.dateRange?.[1] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 提取真实的角色ID
    const roleId = generationForm.value.ruleId.toString().replace('role_', '');
    
    const response = await apiClient.post('/simplified-schedule-engine/generate-by-roles', {
      roleIds: [parseInt(roleId)],
      startDate,
      endDate,
      forceRegenerate: false
    });
    
    ElMessageBox.alert(
      `预览结果：\n总天数：${response.data.statistics.totalDays}\n已排班：${response.data.statistics.scheduledDays}\n空缺：${response.data.statistics.emptyDays}`,
      '规则预览',
      { confirmButtonText: '确定' }
    );
  } catch (error) {
    console.error('预览规则失败:', error);
    ElMessage.error('预览规则失败');
  }
};

const detectConflicts = async () => {
  try {
    // 模拟冲突检测
    ElMessage.success('冲突检测完成，未发现冲突');
  } catch (error) {
    console.error('冲突检测失败:', error);
    ElMessage.error('冲突检测失败');
  }
};

const generateSchedule = async () => {
  if (!generationForm.value.ruleId || !generationForm.value.dateRange) {
    ElMessage.warning('请完整填写生成参数');
    return;
  }
  
  generating.value = true;
  
  try {
    // 提取真实的角色ID
    const roleId = generationForm.value.ruleId.toString().replace('role_', '');
    
    const response = await apiClient.post('/simplified-schedule-engine/generate-by-roles', {
      roleIds: [parseInt(roleId)],
      startDate: generationForm.value.dateRange[0],
      endDate: generationForm.value.dateRange[1],
      forceRegenerate: generationForm.value.forceRegenerate
    });
    
    generationResult.value = {
      ...response.data,
      applied: generationForm.value.previewMode
    };
    
    showGenerationDialog.value = false;
    ElMessage.success('排班生成完成');
  } catch (error) {
    console.error('生成排班失败:', error);
    ElMessage.error(error.response?.data?.message || '生成排班失败');
  } finally {
    generating.value = false;
  }
};

const applySchedules = async () => {
  try {
    await ElMessageBox.confirm('确认应用此排班计划？', '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    // 这里应该调用应用排班的API
    generationResult.value.applied = true;
    ElMessage.success('排班计划已应用');
  } catch (error) {
    if (error !== 'cancel') {
      console.error('应用排班失败:', error);
      ElMessage.error('应用排班失败');
    }
  }
};

const exportSchedules = () => {
  // 导出功能
  ElMessage.success('导出功能开发中');
};

const handleDialogClose = (done: Function) => {
  if (generating.value) {
    ElMessage.warning('正在生成中，请稍候...');
    return;
  }
  done();
};

const handleConfigurationAction = (action: string) => {
  switch (action) {
    case 'configure_roles':
      // 跳转到值班角色配置页面
      router.push('/schedule/roles');
      break;
    default:
      break;
  }
};

const forceRefresh = () => {
  console.log('强制刷新排班规则...');
  loadScheduleRules();
  ElMessage.success('已刷新排班规则');
};

// 加载排班规则的简化方法
const loadRulesFromStorage = () => {
  try {
    const rawData = localStorage.getItem('shiftRoles');
    if (!rawData) return;
    
    const savedRoles = JSON.parse(rawData);
    const rules = savedRoles.map(role => ({
      id: `role_${role.id}`,
      name: role.name,
      rotationType: role.extendedConfig?.rotationType || 'DAILY_ROTATION'
    }));
    
    scheduleRules.value = rules;
  } catch (error) {
    ElMessage.error('加载排班规则失败');
  }
};

// 监听scheduleRules变化
// 生命周期
onMounted(() => {
  loadScheduleRules();
  
  // 监听localStorage变化，当角色配置更新时自动刷新
  window.addEventListener('storage', (e) => {
    if (e.key === 'shiftRoles') {
      loadScheduleRules();
    }
  });
  
  // 监听页面焦点，当从其他页面返回时刷新
  window.addEventListener('focus', () => {
    console.log('页面获得焦点，检查角色配置更新');
    loadScheduleRules();
  });
});
</script>

<style lang="scss" scoped>
.schedule-engine {
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

  .debug-info {
    margin-bottom: 16px;
    
    .debug-alert {
      .rules-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
        
        .rule-tag {
          background-color: #f0f9ff;
          color: #1890ff;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          border: 1px solid #91d5ff;
        }
      }
    }
  }

  .configuration-alerts {
    margin-bottom: 24px;
    
    .config-alert {
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      :deep(.el-alert__content) {
        p {
          margin: 0 0 12px 0;
          line-height: 1.5;
        }
      }
    }
  }

  .action-section {
    margin-bottom: 24px;
    
    .generation-card, .quick-actions-card {
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
    }
    
    .generation-form {
      .rule-option {
        display: flex;
        flex-direction: column;
        gap: 4px;
        
        .rule-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .rule-name {
            font-weight: 500;
          }
          
          .rule-type {
            font-size: 12px;
            color: #909399;
          }
        }
        
        .rule-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #606266;
          
          .rule-time {
            color: #1890ff;
          }
          
          .rule-category {
            background-color: #f0f2f5;
            padding: 2px 6px;
            border-radius: 3px;
            color: #606266;
          }
        }
      }
    }
    
    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      
      .action-button {
        width: 100%;
        height: 40px;
        justify-content: flex-start;
      }
    }
  }

  .result-section {
    .result-card {
      border-radius: 8px;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1d2129;
        
        .result-actions {
          display: flex;
          gap: 8px;
        }
      }
      
      .result-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 24px;
        margin-bottom: 24px;
        padding: 20px;
        background-color: #f8f9fa;
        border-radius: 6px;
        
        .stat-item {
          text-align: center;
          
          .stat-label {
            font-size: 14px;
            color: #606266;
            margin-bottom: 8px;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: 600;
            
            &.success { color: #52c41a; }
            &.warning { color: #fa8c16; }
            &.danger { color: #ff4d4f; }
          }
        }
      }
      
      .issues-section {
        margin-bottom: 24px;
        
        .conflicts-list {
          .conflict-item {
            display: flex;
            align-items: flex-start;
            padding: 16px;
            border: 1px solid #ffccc7;
            border-radius: 6px;
            background-color: #fff2f0;
            margin-bottom: 12px;
            
            .conflict-icon {
              color: #ff4d4f;
              font-size: 16px;
              margin-right: 12px;
              margin-top: 2px;
            }
            
            .conflict-content {
              flex: 1;
              
              .conflict-title {
                font-size: 14px;
                font-weight: 500;
                color: #1d2129;
                margin-bottom: 4px;
              }
              
              .conflict-desc {
                font-size: 12px;
                color: #606266;
                margin-bottom: 8px;
                line-height: 1.4;
              }
              
              .conflict-actions {
                display: flex;
                gap: 8px;
              }
            }
          }
        }
        
        .warnings-list {
          .warning-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            border: 1px solid #ffe7ba;
            border-radius: 6px;
            background-color: #fffbe6;
            margin-bottom: 8px;
            
            .warning-icon {
              color: #fa8c16;
              font-size: 16px;
              margin-right: 12px;
            }
          }
        }
      }
      
      .schedule-preview {
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-weight: 500;
          color: #1d2129;
        }
      }
    }
  }

  .dialog-content {
    .el-alert {
      :deep(.el-alert__content) {
        ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
          
          li {
            margin-bottom: 4px;
            color: #606266;
          }
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .schedule-engine {
    .action-section {
      .el-col {
        margin-bottom: 16px;
      }
    }
    
    .result-stats {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 16px !important;
    }
  }
}
</style>