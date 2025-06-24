import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Steps, Card, Typography, Alert, Space, Modal, Form, Input, message, ConfigProvider } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  CalendarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  CloseOutlined,
  BankOutlined,
  BgColorsOutlined
} from '@ant-design/icons';

// 导入组件
import Dashboard from './components/Dashboard';
import PersonnelManagement from './components/PersonnelManagement';
import PositionSetup from './components/PositionSetup';
import ScheduleRules from './components/ScheduleRules';
import ScheduleCalendar from './components/ScheduleCalendar';
import SystemSettings from './components/SystemSettings';
import ThemeSelector from './components/ThemeSelector';
import localStorageService from './services/localStorageService';
import { getCurrentTheme, getThemeConfig } from './utils/themes';

import './App.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Step } = Steps;

function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [systemSettings, setSystemSettings] = useState({});
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());
  const [setupForm] = Form.useForm();

  // 检查是否是首次使用
  useEffect(() => {
    const hasShownGuide = localStorage.getItem('paiban_guide_shown');
    if (hasShownGuide) {
      setShowGuide(false);
    }
    
    // 加载系统设置
    loadSystemSettings();
    
    // 检查是否需要首次设置
    checkFirstTimeSetup();
  }, []);

  const loadSystemSettings = () => {
    const settings = localStorageService.getSystemSettings();
    setSystemSettings(settings);
  };

  const checkFirstTimeSetup = () => {
    const settings = localStorageService.getSystemSettings();
    const hasSetupBefore = localStorage.getItem('paiban_first_setup_done');
    
    // 如果没有机构名称或者是首次使用，显示设置弹窗
    if (!settings.organizationName || !hasSetupBefore) {
      setShowFirstTimeSetup(true);
    }
  };

  const handleFirstTimeSetup = async () => {
    try {
      const values = await setupForm.validateFields();
      
      // 保存系统设置
      const newSettings = {
        organizationName: values.organizationName,
        contactPerson: values.contactPerson || '',
        contactPhone: values.contactPhone || '',
        workDays: [1, 2, 3, 4, 5],
        workStartTime: '08:00',
        workEndTime: '18:00',
        enableNotifications: true,
        maxContinuousDuty: 7,
        minRestDays: 1,
        updateTime: new Date().toISOString()
      };
      
      localStorageService.saveSystemSettings(newSettings);
      setSystemSettings(newSettings);
      
      // 标记首次设置已完成
      localStorage.setItem('paiban_first_setup_done', 'true');
      
      setShowFirstTimeSetup(false);
      message.success('系统初始化完成，欢迎使用排班管理系统！');
      
    } catch (error) {
      console.error('首次设置失败:', error);
    }
  };

  const steps = [
    {
      key: 'dashboard',
      title: '仪表盘',
      description: '排班统计和系统概览',
      icon: <DashboardOutlined />,
      component: <Dashboard />
    },
    {
      key: 'personnel',
      title: '人员管理',
      description: '添加人员，设置标签和状态',
      icon: <UserOutlined />,
      component: <PersonnelManagement />
    },
    {
      key: 'position',
      title: '岗位设置', 
      description: '设置岗位，分配人员，排序',
      icon: <TeamOutlined />,
      component: <PositionSetup />
    },
    {
      key: 'rules',
      title: '轮班规则',
      description: '设置轮班方式和时间',
      icon: <ClockCircleOutlined />,
      component: <ScheduleRules />
    },
    {
      key: 'calendar',
      title: '排班日历',
      description: '查看和管理排班表',
      icon: <CalendarOutlined />,
      component: <ScheduleCalendar />
    },
    {
      key: 'settings',
      title: '系统设置',
      description: '配置机构信息和系统参数',
      icon: <SettingOutlined />,
      component: <SystemSettings onSettingsChange={loadSystemSettings} />
    }
  ];

  const menuItems = steps.map((step, index) => ({
    key: index.toString(),
    icon: step.icon,
    label: step.title,
  }));

  const handleMenuClick = (e) => {
    setCurrentStep(parseInt(e.key));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('paiban_guide_shown', 'true');
  };

  const handleThemeChange = (themeKey) => {
    setCurrentTheme(themeKey);
  };

  const handleOpenThemeSelector = () => {
    setShowThemeSelector(true);
  };

  const handleCloseThemeSelector = () => {
    setShowThemeSelector(false);
  };

  // 获取当前主题配置
  const themeConfig = getThemeConfig(currentTheme);

  return (
    <ConfigProvider theme={themeConfig.token}>
      <Layout style={{ minHeight: '100vh', backgroundColor: themeConfig.token.colorBgLayout }}>
        <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="light"
        width={250}
        className={`theme-${currentTheme}`}
        style={{ 
          backgroundColor: themeConfig.styles.siderBg,
          borderRight: `1px solid ${themeConfig.token.colorBorderSecondary}`
        }}
      >
        <div style={{ 
          height: 64, 
          padding: '16px', 
          borderBottom: `1px solid ${themeConfig.token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: themeConfig.styles.siderBg
        }}>
          {!collapsed && (
            <Title level={4} style={{ 
              margin: 0, 
              color: themeConfig.colors.primary 
            }}>
              {systemSettings.organizationName || '值班排班系统'}
            </Title>
          )}
          {collapsed && (
            <SettingOutlined style={{ 
              fontSize: '24px', 
              color: themeConfig.colors.primary 
            }} />
          )}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[currentStep.toString()]}
          items={menuItems}
          onClick={handleMenuClick}
          className={`theme-${currentTheme}`}
          style={{ 
            borderRight: 0,
            backgroundColor: themeConfig.styles.siderBg
          }}
        />
      </Sider>

      <Layout>
        <Header style={{ 
          background: themeConfig.styles.headerBg, 
          padding: '16px 24px',
          borderBottom: `1px solid ${themeConfig.token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'auto',
          minHeight: '80px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Title level={3} style={{ 
              margin: 0, 
              lineHeight: '1.2',
              color: themeConfig.token.colorText
            }}>
              {steps[currentStep].title}
            </Title>
            <Text type="secondary" style={{ 
              fontSize: '14px', 
              lineHeight: '1.2',
              color: themeConfig.token.colorTextSecondary
            }}>
              {steps[currentStep].description}
            </Text>
          </div>
          
          <Button 
            icon={<BgColorsOutlined />}
            onClick={handleOpenThemeSelector}
            type="text"
            size="large"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: themeConfig.colors.primary
            }}
          >
            主题
          </Button>
        </Header>

        <Content style={{ 
          display: 'flex', 
          gap: '24px', 
          padding: '24px', 
          overflow: 'hidden',
          backgroundColor: themeConfig.styles.contentBg
        }}>
          {/* 主内容区域 */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ 
              flex: 1, 
              background: themeConfig.styles.cardBg,
              borderRadius: themeConfig.token.borderRadius,
              border: `1px solid ${themeConfig.token.colorBorder}`,
              overflow: 'auto'
            }}>
              {steps[currentStep].component}
            </div>
          </div>

          {/* 右侧引导区域 */}
          {showGuide && (
            <div style={{ width: '320px', minWidth: '320px' }}>
              <Card 
                size="small"
                title={
                  <Space>
                    <span>操作指南</span>
                    <Button 
                      type="text" 
                      size="small" 
                      icon={<CloseOutlined />}
                      onClick={handleCloseGuide}
                      style={{ marginLeft: 'auto' }}
                    />
                  </Space>
                }
                style={{ 
                  marginBottom: '16px',
                  backgroundColor: themeConfig.styles.cardBg,
                  border: `1px solid ${themeConfig.token.colorBorder}`
                }}
              >
                <Alert
                  message="首次使用提示"
                  description="按照以下步骤完成系统设置，关闭后将不再显示此指南。"
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                
                <Steps 
                  current={currentStep} 
                  direction="vertical"
                  size="small"
                  items={steps.map((step, index) => ({
                    title: step.title,
                    description: step.description,
                    icon: step.icon
                  }))}
                />
                
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <Button 
                    size="small"
                    disabled={currentStep === 0}
                    onClick={handlePrev}
                  >
                    上一步
                  </Button>
                  <Button 
                    type="primary"
                    size="small"
                    disabled={currentStep === steps.length - 1}
                    onClick={handleNext}
                  >
                    下一步
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </Content>
      </Layout>

      {/* 首次使用设置弹窗 */}
      <Modal
        title={
          <Space>
            <BankOutlined />
            <span>欢迎使用排班管理系统</span>
          </Space>
        }
        open={showFirstTimeSetup}
        onOk={handleFirstTimeSetup}
        closable={false}
        maskClosable={false}
        okText="开始使用"
        cancelText="稍后设置"
        onCancel={() => setShowFirstTimeSetup(false)}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          <Alert
            message="首次使用提示"
            description="请先设置您的机构信息，这将帮助系统更好地为您服务。"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          
          <Alert
            message="开发说明"
            description="本系统为个人开发项目，部分边缘功能可能不够完善，后续版本会持续优化和修复。感谢您的使用！"
            type="warning"
            showIcon
            style={{ marginBottom: '20px' }}
          />
          
          <Form
            form={setupForm}
            layout="vertical"
            initialValues={{
              organizationName: '',
              contactPerson: '',
              contactPhone: ''
            }}
          >
            <Form.Item
              name="organizationName"
              label="机构名称"
              rules={[{ required: true, message: '请输入机构名称' }]}
            >
              <Input placeholder="如：XX公司、XX部门等" />
            </Form.Item>
            
            <Form.Item
              name="contactPerson"
              label="联系人（可选）"
            >
              <Input placeholder="系统管理员姓名" />
            </Form.Item>
            
            <Form.Item
              name="contactPhone"
              label="联系电话（可选）"
            >
              <Input placeholder="联系电话" />
            </Form.Item>
          </Form>
          
          <Alert
            message="您可以稍后在系统设置中修改这些信息"
            type="success"
            showIcon
            size="small"
          />
        </div>
      </Modal>

      {/* 主题选择器 */}
      <ThemeSelector
        visible={showThemeSelector}
        onClose={handleCloseThemeSelector}
        onThemeChange={handleThemeChange}
      />
    </Layout>
    </ConfigProvider>
  );
}

export default App; 