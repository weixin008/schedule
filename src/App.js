import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Steps, Card, Typography, Alert, Space, Modal, Form, Input, message, ConfigProvider, notification, Badge, Affix, Dropdown, Avatar } from 'antd';
import {
  UserOutlined,
  SettingOutlined,
  CalendarOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  CloseOutlined,
  BankOutlined,
  BgColorsOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  HeartOutlined,
  LogoutOutlined,
  KeyOutlined
} from '@ant-design/icons';

// 导入组件
import Dashboard from './components/Dashboard';
import PersonnelManagement from './components/PersonnelManagement';
import PositionSetup from './components/PositionSetup';
import ScheduleRules from './components/ScheduleRules';
import ScheduleCalendar from './components/ScheduleCalendar';
import SystemSettings from './components/SystemSettings';
import ThemeSelector from './components/ThemeSelector';
import About from './components/About';
import Login from './components/Login';
import Register from './components/Register';
import hybridStorageService from './services/hybridStorageService';
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
  
  // 用户认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showRegister, setShowRegister] = useState(false);

  // 简化的系统检测
  const isLinux = navigator.platform.toLowerCase().includes('linux');
  const isElectron = window.require !== undefined;

  // 检查是否是首次使用
  useEffect(() => {
    const initializeApp = async () => {
      const hasShownGuide = localStorage.getItem('paiban_guide_shown');
      if (hasShownGuide) {
        setShowGuide(false);
      }
      
      // 加载系统设置
      await loadSystemSettings();
      
      // 检查用户认证状态
      await checkAuthStatus();
      
      // 初始化默认管理员账户
      await hybridStorageService.initializeDefaultAdmin();
    };
    
    initializeApp();
  }, []);

  // 检查用户认证状态
  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
      const sessionValid = await hybridStorageService.validateSession(token);
      if (sessionValid.valid) {
        setCurrentUser(JSON.parse(user));
        setIsAuthenticated(true);
        
        // 登录后检查是否需要显示首次设置
        await checkFirstTimeSetup();
      } else {
        // 会话过期，清除登录状态
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        await hybridStorageService.removeSession(token);
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    }
  };

  // 检查是否需要显示首次设置
  const checkFirstTimeSetup = async () => {
    const settings = await hybridStorageService.getSystemSettings();
    const hasSetupBefore = localStorage.getItem('paiban_first_setup_done');
    
    console.log('检查首次设置:', {
      organizationName: settings.organizationName,
      hasSetupBefore
    });
    
    // 如果没有机构名称或者是首次使用，显示设置弹窗
    if (!settings.organizationName || !hasSetupBefore) {
      console.log('显示首次设置弹窗');
      setShowFirstTimeSetup(true);
    }
  };

  // 处理登录
  const handleLogin = async (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setShowLogin(false);
    setShowRegister(false);
    
    // 如果是admin用户，自动重置云端演示数据
    if (user.role === 'admin') {
      try {
        await hybridStorageService.resetDemoData();
        message.success('🎉 演示环境已准备就绪！');
        // 重新加载系统设置而不是刷新页面
        await loadSystemSettings();
      } catch (error) {
        console.error('创建演示数据失败:', error);
        message.warning('演示数据创建失败，但您可以正常使用系统');
      }
    }
    
    // 登录后检查是否需要显示首次设置
    setTimeout(async () => {
      await checkFirstTimeSetup();
    }, 100);
  };

  // 处理注册
  const handleRegister = () => {
    setShowRegister(false);
    setShowLogin(true);
  };

  // 处理登出
  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      await hybridStorageService.removeSession(token);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowLogin(true);
    setShowRegister(false);
    message.success('已退出登录');
  };

  // 切换登录/注册界面
  const switchToRegister = () => {
    setShowLogin(false);
    setShowRegister(true);
  };

  const switchToLogin = () => {
    setShowLogin(true);
    setShowRegister(false);
  };

  // Linux系统检测和通知
  useEffect(() => {
    if (isLinux) {
      notification.info({
        message: 'Linux系统检测',
        description: '检测到您正在使用Linux系统，应用已进行相应优化',
        duration: 3,
        icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />
      });
    }
  }, [isLinux]);

  const loadSystemSettings = async () => {
    const settings = await hybridStorageService.getSystemSettings();
    setSystemSettings(settings);
  };

  const handleFirstTimeSetup = async () => {
    try {
      const settings = await hybridStorageService.getSystemSettings();
      
      // 保存设置
      await hybridStorageService.saveSystemSettings(settings);
      setSystemSettings(settings);
      
      // 标记首次设置已完成
      localStorage.setItem('paiban_first_setup_done', 'true');
      
      // 关闭设置弹窗
      setShowFirstTimeSetup(false);
      
      message.success('系统设置完成！');
    } catch (error) {
      console.error('保存设置失败:', error);
      message.error('保存设置失败，请重试');
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
    },
    {
      key: 'about',
      title: '关于系统',
      description: '版本信息和开发者联系方式',
      icon: <HeartOutlined />,
      component: <About />
    }
  ];

  // 根据用户权限过滤菜单项
  const filteredSteps = steps.filter(step => {
    if (step.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    return true;
  });

  const menuItems = filteredSteps.map((step, index) => ({
    key: index.toString(),
    icon: step.icon,
    label: step.title,
  }));

  const handleMenuClick = (e) => {
    setCurrentStep(parseInt(e.key));
  };

  const handleNext = () => {
    if (currentStep < filteredSteps.length - 1) {
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
    localStorage.setItem('paiban_welcome_shown', 'true');
    message.success('指南已关闭，您可以开始使用系统了');
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
      <div className={`app ${isLinux ? 'linux-system' : ''}`} style={{ backgroundColor: '#f5f7fa' }}>
        <Layout style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
          {isAuthenticated && (
            <Sider 
              collapsible 
              collapsed={collapsed} 
              onCollapse={setCollapsed}
              theme="light"
              width={250}
              className={`theme-${currentTheme}`}
              style={{ 
                backgroundColor: '#ffffff',
                borderRight: `1px solid ${themeConfig.token.colorBorderSecondary}`
              }}
            >
              <div style={{ 
                height: 64, 
                padding: '16px', 
                borderBottom: `1px solid ${themeConfig.token.colorBorderSecondary}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff'
              }}>
                {!collapsed && (
                  <>
                    <Title level={4} style={{ 
                      margin: 0, 
                      color: themeConfig.colors.primary 
                    }}>
                      {systemSettings.organizationName || '值班排班系统'}
                    </Title>
                    {isLinux && (
                      <div style={{ 
                        marginTop: '4px',
                        display: 'flex',
                        gap: '4px',
                        fontSize: '10px'
                      }}>
                        <span style={{
                          background: '#f0f0f0',
                          color: '#666',
                          padding: '1px 4px',
                          borderRadius: '2px'
                        }}>
                          Linux
                        </span>
                        {isElectron && (
                          <span style={{
                            background: '#52c41a',
                            color: 'white',
                            padding: '1px 4px',
                            borderRadius: '2px'
                          }}>
                            桌面版
                          </span>
                        )}
                      </div>
                    )}
                  </>
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
                  backgroundColor: '#ffffff'
                }}
              />
            </Sider>
          )}

          <Layout>
            {isAuthenticated && (
              <Header className={`app-header ${isLinux ? 'linux-header' : ''}`} style={{ 
                background: '#ffffff', 
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
                    {filteredSteps[currentStep]?.title}
                    {isLinux && (
                      <span className="system-label" style={{
                        fontSize: '12px',
                        background: '#1890ff',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        marginLeft: '8px'
                      }}>
                        Linux版
                      </span>
                    )}
                  </Title>
                  <Text type="secondary" style={{ 
                    fontSize: '14px', 
                    lineHeight: '1.2',
                    color: themeConfig.token.colorTextSecondary
                  }}>
                    {filteredSteps[currentStep]?.description}
                  </Text>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* 状态指示器 */}
                  <div className="status-indicators" style={{ display: 'flex', gap: '8px' }}>
                    {isLinux && isElectron && <Badge status="success" text="桌面版" />}
                    {isLinux && !isElectron && <Badge status="processing" text="Web版" />}
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

                  {/* 用户信息 */}
                  {currentUser && (
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'profile',
                            icon: <UserOutlined />,
                            label: `${currentUser.name} (${currentUser.role === 'admin' ? '管理员' : currentUser.role === 'manager' ? '经理' : '用户'})`,
                            disabled: true
                          },
                          {
                            type: 'divider'
                          },
                          {
                            key: 'logout',
                            icon: <LogoutOutlined />,
                            label: '退出登录',
                            onClick: handleLogout
                          }
                        ]
                      }}
                      placement="bottomRight"
                    >
                      <Space style={{ cursor: 'pointer', padding: '8px', borderRadius: '6px', border: `1px solid ${themeConfig.token.colorBorder}` }}>
                        <Avatar 
                          icon={<UserOutlined />} 
                          style={{ 
                            backgroundColor: currentUser.role === 'admin' ? '#ff4d4f' : currentUser.role === 'manager' ? '#1890ff' : '#52c41a' 
                          }} 
                        />
                        {!collapsed && (
                          <span style={{ color: themeConfig.token.colorText }}>
                            {currentUser.name}
                          </span>
                        )}
                      </Space>
                    </Dropdown>
                  )}
                </div>
              </Header>
            )}

            <Content style={{ 
              display: 'flex', 
              gap: '24px', 
              padding: '24px', 
              overflow: 'hidden',
              backgroundColor: '#f5f7fa'
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
                  background: '#ffffff',
                  borderRadius: themeConfig.token.borderRadius,
                  border: `1px solid ${themeConfig.token.colorBorder}`,
                  overflow: 'auto'
                }}>
                  {!isAuthenticated ? (
                    // 显示登录或注册界面
                    showLogin ? (
                      <Login onLogin={handleLogin} onSwitchToRegister={switchToRegister} />
                    ) : (
                      <Register onRegister={handleRegister} onSwitchToLogin={switchToLogin} />
                    )
                  ) : (
                    // 显示主应用内容
                    filteredSteps[currentStep]?.component
                  )}
                </div>
              </div>

              {/* 右侧引导区域 - 仅在已认证且显示指南时显示 */}
              {isAuthenticated && showGuide && (
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
                      backgroundColor: '#ffffff',
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
                      items={filteredSteps.map((step, index) => ({
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
                        disabled={currentStep === filteredSteps.length - 1}
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

        {/* Linux系统状态栏 */}
        {isLinux && (
          <div className="linux-statusbar" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '24px',
            background: '#f0f0f0',
            borderTop: '1px solid #d9d9d9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            fontSize: '12px',
            zIndex: 1000
          }}>
            <div className="statusbar-left">
              <span>系统：Linux</span>
              <span style={{ marginLeft: '16px' }}>版本：1.0.0</span>
            </div>
            <div className="statusbar-right">
              {isElectron && <span>Electron桌面版</span>}
              {!isElectron && <span>Web版</span>}
            </div>
          </div>
        )}
      </div>
    </ConfigProvider>
  );
}

export default App; 