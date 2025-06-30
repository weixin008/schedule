import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';
import hybridStorageService from '../services/hybridStorageService';

const { Title, Text } = Typography;

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await hybridStorageService.authenticateUser(values.username, values.password);
      
      if (result.success) {
        // 创建会话
        const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        hybridStorageService.createSession(result.user.id, token);
        
        // 保存登录状态
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        localStorage.setItem('authToken', token);
        
        message.success('登录成功！');
        onLogin(result.user);
      } else {
        message.error(result.message || '登录失败');
      }
    } catch (error) {
      console.error('登录错误:', error);
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    form.setFieldsValue({
      username: 'admin',
      password: 'admin123'
    });
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: '400px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px'
        }}
        styles={{ body: { padding: '40px 30px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            值班排班系统
          </Title>
          <Text type="secondary">请登录您的账户</Text>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={<LoginOutlined />}
              style={{ 
                width: '100%', 
                height: '48px',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <Divider>或</Divider>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="default"
            icon={<UserAddOutlined />}
            onClick={onSwitchToRegister}
            style={{ 
              width: '100%', 
              height: '40px',
              borderRadius: '8px'
            }}
          >
            注册新账户
          </Button>
          
          <Button
            type="link"
            onClick={handleDemoLogin}
            style={{ width: '100%' }}
          >
            使用演示账户
          </Button>
        </Space>

        <Alert
          message="演示账户"
          description="用户名: admin, 密码: admin123"
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </Card>
    </div>
  );
};

export default Login; 