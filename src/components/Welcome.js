import React from 'react';
import { Card, Steps, Button, Row, Col, Typography, Alert, message, Space, Divider } from 'antd';
import { 
  UserAddOutlined, 
  SettingOutlined, 
  CalendarOutlined, 
  BarChartOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import localStorageService from '../services/localStorageService';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

const Welcome = ({ onNavigate }) => {
  // 创建演示数据
  const createDemoData = async () => {
    try {
      const result = localStorageService.createDemoData();
      message.success(`演示数据创建成功！
        - 员工总数: ${result.employees}
        - 领导: ${result.leaders}人 (包含1人出差中)
        - 职工: ${result.staff}人
        - 监督员: ${result.supervisors}人
        - 监督组: ${result.supervisorGroups}组`);
    } catch (error) {
      message.error('创建演示数据失败: ' + error.message);
    }
  };

  // 生成复杂排班表
  const generateComplexSchedule = async () => {
    try {
      const startDate = '2024-06-10'; // 开始日期
      const endDate = '2024-06-30';   // 结束日期（3周演示）
      
      const result = localStorageService.generateComplexSchedule(startDate, endDate);
      
      // 调试：输出生成的排班数据
      console.log('生成的排班数据:', localStorageService.getDutySchedules());
      
      message.success(`复杂排班表生成成功！
        - 排班天数: ${result.scheduleCount}天
        - 参与领导: ${result.summary.leadersUsed}人
        - 参与职工: ${result.summary.staffUsed}人
        - 监督组数: ${result.summary.supervisorGroups}组
        
        排班规则:
        ✅ 领导每日轮换
        ✅ 职工周一至周四每日轮换
        ✅ 职工周五至周日连班三天
        ✅ 监督员每周轮换（仅工作日）
        ✅ 出差期间自动跳过排班
        
        💡 请打开浏览器开发者工具的控制台查看详细数据`);
    } catch (error) {
      console.error('生成排班表失败:', error);
      message.error('生成排班表失败: ' + error.message);
    }
  };

  // 查看当前数据状态
  const checkDataStatus = () => {
    const employees = localStorageService.getEmployees();
    const schedules = localStorageService.getDutySchedules();
    const supervisorGroups = localStorageService.getAttendanceSupervisorGroups();
    
    console.log('=== 当前数据状态 ===');
    console.log('员工数据:', employees);
    console.log('排班数据:', schedules);
    console.log('监督员组:', supervisorGroups);
    
    message.info(`数据状态检查完成，请查看控制台：
      - 员工: ${employees.length}人
      - 排班记录: ${schedules.length}条
      - 监督组: ${supervisorGroups.length}组`);
  };

  const steps = [
    {
      title: '添加员工',
      icon: <UserAddOutlined />,
      description: '首先添加您的员工信息，包括姓名、部门、职位等基本信息',
      action: () => onNavigate && onNavigate('employees')
    },
    {
      title: '配置班次',
      icon: <SettingOutlined />,
      description: '设置班次类型、工作时间和颜色标识，也可以使用默认配置',
      action: () => onNavigate && onNavigate('settings')
    },
    {
      title: '创建排班',
      icon: <CalendarOutlined />,
      description: '在日历中点击日期创建排班，或使用自动排班功能',
      action: () => onNavigate && onNavigate('calendar')
    },
    {
      title: '查看统计',
      icon: <BarChartOutlined />,
      description: '查看排班统计和分析报告，优化排班安排',
      action: () => onNavigate && onNavigate('statistics')
    }
  ];

  return (
    <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={1}>欢迎使用排班管理系统</Title>
        <Paragraph style={{ fontSize: 16, color: '#666' }}>
          一个简单易用的前端排班管理工具，帮助您高效管理员工排班
        </Paragraph>
      </div>

      <Alert
        message="系统特点"
        description="✅ 纯前端运行，无需服务器 ✅ 数据本地存储，保护隐私 ✅ 支持数据导入导出 ✅ 响应式设计，多端适配"
        type="info"
        showIcon
        style={{ marginBottom: 30 }}
      />

      {/* 演示功能卡片 */}
      <Card 
        title={<span><ExperimentOutlined /> 复杂排班演示</span>}
        style={{ marginBottom: 30 }}
        extra={<Text type="secondary">体验高级排班功能</Text>}
      >
        <Alert
          message="演示说明"
          description="这是一个完整的复杂排班演示，包含以下特性：
          • 3个领导 + 7个职工 + 4个监督员（2组）
          • 1个领导出差中（7月1日回来）
          • 领导每日轮换，出差期间自动跳过
          • 职工周一至周四每日轮换，周五至周日连班三天
          • 监督员固定编组，每周轮换（仅工作日）"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>第一步：创建演示数据</Text>
            <div style={{ marginTop: 8 }}>
              <Button 
                type="primary" 
                icon={<TeamOutlined />}
                onClick={createDemoData}
                size="large"
              >
                创建演示员工数据
              </Button>
              <Text type="secondary" style={{ marginLeft: 12 }}>
                将创建3个领导、7个职工、4个监督员和2个监督组
              </Text>
            </div>
          </div>
          
          <Divider />
          
          <div>
            <Text strong>第二步：生成复杂排班表</Text>
            <div style={{ marginTop: 8 }}>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={generateComplexSchedule}
                size="large"
                ghost
              >
                生成高级排班表
              </Button>
              <Text type="secondary" style={{ marginLeft: 12 }}>
                生成符合复杂规则的排班表（2024年6月10日-30日）
              </Text>
            </div>
          </div>
          
          <Divider />
          
          <div>
            <Text strong>第三步：查看结果</Text>
            <div style={{ marginTop: 8 }}>
              <Space>
                <Button 
                  icon={<UserAddOutlined />}
                  onClick={() => onNavigate && onNavigate('employees')}
                >
                  查看员工信息
                </Button>
                <Button 
                  icon={<CalendarOutlined />}
                  onClick={() => onNavigate && onNavigate('calendar')}
                >
                  查看排班日历
                </Button>
                <Button 
                  icon={<BarChartOutlined />}
                  onClick={checkDataStatus}
                  type="dashed"
                >
                  检查数据状态
                </Button>
              </Space>
            </div>
          </div>
        </Space>
      </Card>

      <Card title="快速开始" style={{ marginBottom: 30 }}>
        <Steps direction="vertical" size="small">
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={
                <div>
                  <Paragraph>{step.description}</Paragraph>
                  {step.action && (
                    <Button 
                      type="primary" 
                      size="small"
                      icon={step.icon}
                      onClick={step.action}
                      style={{ marginTop: 8 }}
                    >
                      开始{step.title}
                    </Button>
                  )}
                </div>
              }
              icon={step.icon}
            />
          ))}
        </Steps>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="功能亮点" size="small">
            <ul style={{ paddingLeft: 20, lineHeight: '1.8' }}>
              <li>📅 可视化日历排班</li>
              <li>👥 员工信息管理</li>
              <li>🎨 自定义班次设置</li>
              <li>📊 排班统计分析</li>
              <li>🔄 自动排班算法</li>
              <li>💾 数据备份恢复</li>
            </ul>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="使用提示" size="small">
            <ul style={{ paddingLeft: 20, lineHeight: '1.8' }}>
              <li>数据保存在浏览器本地，清除缓存会丢失数据</li>
              <li>建议定期使用导出功能备份数据</li>
              <li>支持批量导入导出，方便数据迁移</li>
              <li>可自定义班次颜色，便于区分不同班次</li>
              <li>支持排班冲突检测，避免重复排班</li>
              <li>统计功能帮助优化排班安排</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Welcome; 