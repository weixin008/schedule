<template>
  <div class="personnel-import">
    <div class="page-header">
      <h1 class="page-title">人员批量导入</h1>
      <p class="page-description">支持Excel文件批量导入员工信息，提高数据录入效率</p>
    </div>

    <el-card class="import-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>导入操作</span>
          <div class="header-actions">
            <el-button type="success" :icon="Download" @click="exportEmployees">
              导出员工信息
            </el-button>
            <el-button type="primary" :icon="Download" @click="downloadTemplate">
              下载模板
            </el-button>
          </div>
        </div>
      </template>

      <div class="import-content">
        <el-steps :active="currentStep" finish-status="success">
          <el-step title="选择文件" />
          <el-step title="数据预览" />
          <el-step title="导入结果" />
        </el-steps>

        <!-- 步骤1：文件上传 -->
        <div v-if="currentStep === 0" class="step-content">
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            accept=".xlsx,.xls"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将Excel文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                只能上传xlsx/xls文件，且不超过10MB
              </div>
            </template>
          </el-upload>

          <div v-if="selectedFile" class="file-info">
            <el-alert
              :title="`已选择文件：${selectedFile.name}`"
              type="success"
              :closable="false"
              show-icon
            />
            <div class="step-actions">
              <el-button type="primary" @click="previewFileData">下一步</el-button>
            </div>
          </div>
        </div>

        <!-- 步骤2：数据预览 -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="preview-header">
            <span>数据预览（共 {{ previewData.length }} 条记录）</span>
            <div class="preview-actions">
              <el-button @click="currentStep = 0">上一步</el-button>
              <el-button type="primary" @click="importData" :loading="importing">
                确认导入
              </el-button>
            </div>
          </div>

          <el-table :data="previewData" stripe max-height="400">
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="employeeNumber" label="工号" width="120" />
            <el-table-column prop="phone" label="电话" width="120" />
            <el-table-column prop="joinDate" label="入职日期" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="organizationNodeName" label="所属职位" width="150" />
            <el-table-column prop="level" label="级别" width="80" />
            <el-table-column prop="tags" label="标签" width="120">
              <template #default="{ row }">
                <el-tag v-for="tag in row.tags" :key="tag" size="small" style="margin-right: 4px;">
                  {{ tag }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 步骤3：导入结果 -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="result-summary">
            <el-alert
              :title="`导入完成！成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
              :type="importResult.failed > 0 ? 'warning' : 'success'"
              :closable="false"
              show-icon
            />
          </div>

          <div v-if="importResult.errors.length > 0" class="error-list">
            <h4>错误详情：</h4>
            <el-table :data="importResult.errors" stripe max-height="300">
              <el-table-column prop="row" label="行号" width="80" />
              <el-table-column prop="field" label="字段" width="120" />
              <el-table-column prop="error" label="错误信息" />
            </el-table>
          </div>

          <div class="step-actions">
            <el-button @click="resetImport">重新导入</el-button>
            <el-button type="primary" @click="$router.push('/personnel/employees')">
              查看员工列表
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 导入说明 -->
    <el-card class="help-card" shadow="hover">
      <template #header>
        <span>导入说明</span>
      </template>
      
      <div class="help-content">
        <h4>Excel模板格式：</h4>
        <ul>
          <li>姓名（必填）：员工姓名</li>
          <li>工号（可选）：员工工号，如不填写系统自动生成</li>
          <li>电话（可选）：联系电话</li>
          <li>入职日期（可选）：格式为YYYY-MM-DD，如：2024-01-15</li>
          <li>状态（可选）：ON_DUTY/LEAVE/BUSINESS_TRIP/TRANSFER/RESIGNED，默认为ON_DUTY</li>
          <li>所属职位（可选）：在组织架构中的职位名称</li>
          <li>级别（可选）：员工级别，数字1-5，数字越小权限越高</li>
          <li>标签（可选）：多个标签用逗号分隔，如：医生,主任</li>
        </ul>

        <h4>注意事项：</h4>
        <ul>
          <li>请使用提供的Excel模板进行数据录入</li>
          <li>姓名为必填字段</li>
          <li>工号不能重复，如有重复系统会自动处理</li>
          <li>所属职位必须是已存在的组织架构节点</li>
          <li>状态字段请使用规定的值：ON_DUTY(在岗)、LEAVE(请假)、BUSINESS_TRIP(出差)、TRANSFER(调动)、RESIGNED(离职)</li>
          <li>标签字段支持多个值，用英文逗号分隔</li>
          <li>导入前请确保数据格式正确</li>
        </ul>
      </div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Download, UploadFilled } from '@element-plus/icons-vue';
import apiClient from '@/api';

// 响应式数据
const currentStep = ref(0);
const selectedFile = ref(null);
const previewData = ref([]);
const importing = ref(false);
const importResult = ref({
  success: 0,
  failed: 0,
  errors: []
});

// 方法
const getStatusType = (status: string) => {
  switch (status) {
    case 'ON_DUTY': return 'success';
    case 'LEAVE': return 'warning';
    case 'BUSINESS_TRIP': return 'info';
    case 'TRANSFER': return 'warning';
    case 'RESIGNED': return 'danger';
    default: return 'info';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'ON_DUTY': return '在岗';
    case 'LEAVE': return '请假';
    case 'BUSINESS_TRIP': return '出差';
    case 'TRANSFER': return '调动';
    case 'RESIGNED': return '离职';
    default: return '未知';
  }
};

const downloadTemplate = async () => {
  try {
    // 创建模板数据
    const templateData = [
      {
        '姓名': '张三',
        '工号': 'E001',
        '电话': '13800138000',
        '入职日期': '2024-01-15',
        '状态': 'ON_DUTY',
        '所属职位': '主治医师',
        '级别': '2',
        '标签': '医生,内科'
      },
      {
        '姓名': '李四',
        '工号': 'E002',
        '电话': '13800138001',
        '入职日期': '2024-02-01',
        '状态': 'ON_DUTY',
        '所属职位': '护士长',
        '级别': '3',
        '标签': '护士,外科'
      }
    ];

    // 调用后端API生成Excel文件
    const response = await apiClient.post('/employee/export-template', templateData, {
      responseType: 'blob'
    });
    
    // 创建下载链接
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '员工导入模板.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('模板下载成功');
  } catch (error) {
    console.error('下载模板失败:', error);
    ElMessage.error('模板下载失败');
  }
};

// 导出员工信息
const exportEmployees = async () => {
  try {
    const response = await apiClient.get('/employee/export', {
      responseType: 'blob'
    });
    
    // 创建下载链接
    const blob = new Blob([response.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `员工信息_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('员工信息导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('员工信息导出失败');
  }
};

const handleFileChange = (file: any) => {
  selectedFile.value = file;
};

const previewFileData = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件');
    return;
  }

  try {
    // 创建FormData对象上传文件
    const formData = new FormData();
    formData.append('file', selectedFile.value.raw);

    // 调用后端API解析Excel文件
    const response = await apiClient.post('/employee/preview-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    previewData.value = response.data.map(item => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags : (item.tags ? item.tags.split(',') : [])
    }));

    currentStep.value = 1;
  } catch (error) {
    console.error('解析文件失败:', error);
    ElMessage.error('文件解析失败，请检查文件格式');
  }
};

const importData = async () => {
  importing.value = true;

  try {
    // 调用后端API导入数据
    const response = await apiClient.post('/employee/import', {
      employees: previewData.value
    });

    importResult.value = response.data;
    currentStep.value = 2;
    
    if (importResult.value.failed === 0) {
      ElMessage.success('数据导入成功');
    } else {
      ElMessage.warning(`导入完成，成功${importResult.value.success}条，失败${importResult.value.failed}条`);
    }
  } catch (error) {
    console.error('导入失败:', error);
    ElMessage.error('数据导入失败');
    importResult.value = {
      success: 0,
      failed: previewData.value.length,
      errors: [{ row: 0, field: '系统', error: '导入过程中发生错误' }]
    };
    currentStep.value = 2;
  } finally {
    importing.value = false;
  }
};

const resetImport = () => {
  currentStep.value = 0;
  selectedFile.value = null;
  previewData.value = [];
  importResult.value = {
    success: 0,
    failed: 0,
    errors: []
  };
};
</script>

<style lang="scss" scoped>
.personnel-import {
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

  .import-card {
    margin-bottom: 24px;
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
    
    .import-content {
      .el-steps {
        margin-bottom: 32px;
      }
      
      .step-content {
        min-height: 300px;
        
        .upload-demo {
          margin-bottom: 24px;
        }
        
        .file-info {
          .el-alert {
            margin-bottom: 16px;
          }
        }
        
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-weight: 500;
          
          .preview-actions {
            display: flex;
            gap: 8px;
          }
        }
        
        .result-summary {
          margin-bottom: 24px;
        }
        
        .error-list {
          margin-bottom: 24px;
          
          h4 {
            margin-bottom: 12px;
            color: #1d2129;
          }
        }
        
        .step-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 24px;
        }
      }
    }
  }

  .help-card {
    border-radius: 8px;
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .help-content {
      h4 {
        color: #1d2129;
        margin-bottom: 12px;
        margin-top: 20px;
        
        &:first-child {
          margin-top: 0;
        }
      }
      
      ul {
        margin: 0 0 16px 0;
        padding-left: 20px;
        
        li {
          margin-bottom: 8px;
          color: #606266;
          line-height: 1.5;
        }
      }
    }
  }
}
</style>