<template>
  <el-dialog
    v-model="visible"
    title="欢迎使用智能排班系统"
    width="800px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="system-intro-dialog"
  >
    <div class="intro-content">
      <!-- 系统标题 -->
      <div class="system-header">
        <el-icon class="system-icon"><Calendar /></el-icon>
        <div class="system-title">
          <h1>智能排班管理系统</h1>
          <p class="version">Version 2.0</p>
        </div>
      </div>

      <!-- 系统简介 -->
      <div class="system-description">
        <p>本系统是专为医疗机构、企事业单位设计的智能化排班管理平台，提供灵活的人员调度、智能的冲突检测和完善的数据管理功能。</p>
      </div>

      <!-- 功能模块 -->
      <div class="features-section">
        <h3><el-icon><Star /></el-icon> 主要功能模块</h3>
        
        <div class="features-grid">
          <!-- 已完善功能 -->
          <div class="feature-category">
            <h4 class="category-title completed">
              <el-icon><Check /></el-icon>
              已完善功能
            </h4>
            <ul class="feature-list">
              <li class="feature-item completed">
                <el-icon><User /></el-icon>
                <div class="feature-content">
                  <strong>员工管理</strong>
                  <span>完整的员工信息管理，支持智能删除和冲突检测</span>
                </div>
              </li>
              <li class="feature-item completed">
                <el-icon><Setting /></el-icon>
                <div class="feature-content">
                  <strong>值班角色配置</strong>
                  <span>灵活的角色定义和人员筛选条件设置</span>
                </div>
              </li>
              <li class="feature-item completed">
                <el-icon><Calendar /></el-icon>
                <div class="feature-content">
                  <strong>班次管理</strong>
                  <span>支持多种班次类型和时间配置</span>
                </div>
              </li>
              <li class="feature-item completed">
                <el-icon><DocumentCopy /></el-icon>
                <div class="feature-content">
                  <strong>排班规则</strong>
                  <span>智能排班引擎，支持复杂的排班逻辑</span>
                </div>
              </li>
              <li class="feature-item completed">
                <el-icon><DataAnalysis /></el-icon>
                <div class="feature-content">
                  <strong>统计分析</strong>
                  <span>工作量统计和考勤分析报表</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- 待完善功能 -->
          <div class="feature-category">
            <h4 class="category-title pending">
              <el-icon><Clock /></el-icon>
              待完善功能
            </h4>
            <ul class="feature-list">
              <li class="feature-item pending">
                <el-icon><UserFilled /></el-icon>
                <div class="feature-content">
                  <strong>编组管理</strong>
                  <span>员工分组功能暂时不可用，正在优化中</span>
                </div>
              </li>
              <li class="feature-item pending">
                <el-icon><Bell /></el-icon>
                <div class="feature-content">
                  <strong>消息通知</strong>
                  <span>排班变更通知和提醒功能</span>
                </div>
              </li>
              <li class="feature-item pending">
                <el-icon><Phone /></el-icon>
                <div class="feature-content">
                  <strong>移动端支持</strong>
                  <span>手机APP和微信小程序</span>
                </div>
              </li>
              <li class="feature-item pending">
                <el-icon><Connection /></el-icon>
                <div class="feature-content">
                  <strong>系统集成</strong>
                  <span>与OA、HR等系统的数据对接</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 使用建议 -->
      <div class="usage-guide">
        <h3><el-icon><Guide /></el-icon> 使用建议</h3>
        <div class="guide-steps">
          <div class="step-item">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>员工信息录入</strong>
              <p>首先在"员工管理"中录入所有员工的基本信息</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>配置班次和角色</strong>
              <p>在"班次管理"和"值班角色"中设置排班基础配置</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>创建排班规则</strong>
              <p>根据实际需求在"排班规则"中创建自动排班规则</p>
            </div>
          </div>
          <div class="step-item">
            <div class="step-number">4</div>
            <div class="step-content">
              <strong>生成和管理排班</strong>
              <p>使用排班引擎生成排班表，并进行必要的调整</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 注意事项 -->
      <div class="notice-section">
        <el-alert
          title="重要提示"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <ul class="notice-list">
              <li>编组管理功能暂时不可用，请使用值班角色功能进行人员分组</li>
              <li>首次使用请先完善员工信息，确保数据准确性</li>
              <li>建议定期备份重要数据，避免数据丢失</li>
              <li>如遇问题请联系系统管理员或查看帮助文档</li>
            </ul>
          </template>
        </el-alert>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-checkbox v-model="dontShowAgain">不再显示此提示</el-checkbox>
        <div class="footer-buttons">
          <el-button @click="handleClose">稍后查看</el-button>
          <el-button type="primary" @click="handleStart">开始使用</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, defineEmits } from 'vue'
import { 
  Calendar, Star, Check, User, Setting, DocumentCopy, 
  DataAnalysis, UserFilled, Bell, Phone, Connection, 
  Guide, Clock 
} from '@element-plus/icons-vue'

const emit = defineEmits(['close', 'start'])

const visible = ref(true)
const dontShowAgain = ref(false)

const handleClose = () => {
  visible.value = false
  emit('close', dontShowAgain.value)
}

const handleStart = () => {
  visible.value = false
  emit('start', dontShowAgain.value)
}
</script>

<style scoped>
.system-intro-dialog :deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.system-intro-dialog :deep(.el-dialog__header) {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.system-intro-dialog :deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.system-intro-dialog :deep(.el-dialog__body) {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.intro-content {
  line-height: 1.6;
}

.system-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.system-icon {
  font-size: 48px;
  opacity: 0.9;
}

.system-title h1 {
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 600;
}

.version {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}

.system-description {
  margin-bottom: 32px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.system-description p {
  margin: 0;
  color: #606266;
  font-size: 15px;
}

.features-section {
  margin-bottom: 32px;
}

.features-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #303133;
}

.features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.feature-category {
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.category-title.completed {
  color: #67c23a;
}

.category-title.pending {
  color: #e6a23c;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-item.completed .el-icon {
  color: #67c23a;
}

.feature-item.pending .el-icon {
  color: #e6a23c;
}

.feature-content {
  flex: 1;
}

.feature-content strong {
  display: block;
  margin-bottom: 4px;
  color: #303133;
}

.feature-content span {
  font-size: 13px;
  color: #909399;
}

.usage-guide {
  margin-bottom: 32px;
}

.usage-guide h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #303133;
}

.guide-steps {
  display: grid;
  gap: 16px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.step-content strong {
  display: block;
  margin-bottom: 4px;
  color: #303133;
}

.step-content p {
  margin: 0;
  font-size: 14px;
  color: #606266;
}

.notice-section {
  margin-bottom: 24px;
}

.notice-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.notice-list li {
  margin-bottom: 8px;
  color: #e6a23c;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

.footer-buttons {
  display: flex;
  gap: 12px;
}

.footer-buttons .el-button {
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .system-intro-dialog :deep(.el-dialog) {
    width: 95% !important;
    margin: 20px auto;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .system-header {
    flex-direction: column;
    text-align: center;
  }
  
  .dialog-footer {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .footer-buttons {
    justify-content: center;
  }
}
</style>