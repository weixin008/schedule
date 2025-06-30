import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, KeyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import hybridStorageService from '../services/hybridStorageService';

const { Title, Text } = Typography;

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 邀请码验证 - 简化版本，确保稳定性
  const validateInviteCode = (inviteCode) => {
    // 使用简单的验证方式，确保稳定性
    const validCode = 'zhineng2025';
    
    // 直接比较，避免复杂的哈希算法可能导致的错误
    return inviteCode === validCode;
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      console.log('开始注册流程，表单数据:', values);
      
      // 验证邀请码
      console.log('验证邀请码:', values.inviteCode);
      if (!validateInviteCode(values.inviteCode)) {
        console.log('邀请码验证失败');
        message.error('邀请码错误，请联系管理员获取正确的邀请码');
        return;
      }
      console.log('邀请码验证成功');

      // 检查用户名是否已存在
      console.log('检查用户名是否存在:', values.username);
      const existingUser = await hybridStorageService.getUserByUsername(values.username);
      if (existingUser) {
        console.log('用户名已存在');
        message.error('用户名已存在，请选择其他用户名');
        return;
      }
      console.log('用户名可用');

      // 创建新用户
      const newUser = {
        username: values.username,
        password: values.password,
        name: values.username, // 使用用户名作为默认姓名
        email: '', // 留空，用户可以在后续设置中修改
        phone: '', // 留空，用户可以在后续设置中修改
        role: 'user', // 默认普通用户角色
        permissions: ['view', 'edit'], // 默认权限
        status: 'active'
      };

      console.log('准备创建用户:', newUser);
      const createdUser = await hybridStorageService.addUser(newUser);
      
      if (createdUser) {
        console.log('用户创建成功:', createdUser);
        message.success('注册成功！请登录');
        onSwitchToLogin();
      } else {
        console.log('用户创建失败');
        message.error('注册失败，请重试');
      }
    } catch (error) {
      console.error('注册过程中发生错误:', error);
      message.error('注册失败，请重试');
    } finally {
      setLoading(false);
    }
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
          maxWidth: '420px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          borderRadius: '16px',
          border: 'none'
        }}
        styles={{ body: { padding: '48px 40px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
          }}>
            <UserOutlined style={{ fontSize: '32px', color: 'white' }} />
          </div>
          <Title level={2} style={{ margin: 0, color: '#1890ff', fontWeight: 600 }}>
            创建账户
          </Title>
          <Text type="secondary" style={{ fontSize: '16px', marginTop: '8px' }}>
            加入我们的排班管理系统
          </Text>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleRegister}
          autoComplete="off"
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label={<span style={{ fontWeight: 500, color: '#262626' }}>用户名</span>}
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入用户名"
              style={{ 
                borderRadius: '12px',
                height: '48px',
                fontSize: '16px',
                border: '2px solid #f0f0f0',
                transition: 'all 0.3s ease',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1890ff';
                e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#f0f0f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ fontWeight: 500, color: '#262626' }}>密码</span>}
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
              { max: 20, message: '密码最多20个字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入密码"
              style={{ 
                borderRadius: '12px',
                height: '48px',
                fontSize: '16px',
                border: '2px solid #f0f0f0',
                transition: 'all 0.3s ease',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1890ff';
                e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#f0f0f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span style={{ fontWeight: 500, color: '#262626' }}>确认密码</span>}
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请再次输入密码"
              style={{ 
                borderRadius: '12px',
                height: '48px',
                fontSize: '16px',
                border: '2px solid #f0f0f0',
                transition: 'all 0.3s ease',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1890ff';
                e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#f0f0f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </Form.Item>

          <Form.Item
            name="inviteCode"
            label={<span style={{ fontWeight: 500, color: '#262626' }}>邀请码</span>}
            rules={[
              { required: true, message: '请输入邀请码' },
              { min: 2, message: '邀请码至少2个字符' }
            ]}
          >
            <Input
              prefix={<KeyOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入邀请码"
              style={{ 
                borderRadius: '12px',
                height: '48px',
                fontSize: '16px',
                border: '2px solid #f0f0f0',
                transition: 'all 0.3s ease',
                boxShadow: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1890ff';
                e.target.style.boxShadow = '0 0 0 2px rgba(24, 144, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#f0f0f0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: '32px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ 
                width: '100%', 
                height: '52px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.3)';
              }}
            >
              {loading ? '注册中...' : '立即注册'}
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '32px 0', color: '#bfbfbf' }}>或</Divider>

        <Button
          type="default"
          icon={<ArrowLeftOutlined />}
          onClick={onSwitchToLogin}
          style={{ 
            width: '100%', 
            height: '48px',
            borderRadius: '12px',
            fontSize: '16px',
            border: '2px solid #f0f0f0',
            color: '#666',
            background: '#fff',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#1890ff';
            e.target.style.color = '#1890ff';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#f0f0f0';
            e.target.style.color = '#666';
          }}
        >
          返回登录
        </Button>

        <Alert
          message="注册说明"
          description="注册成功后，您将获得基本的查看和编辑权限。如需更高权限，请联系管理员。"
          type="info"
          showIcon
          style={{ 
            marginTop: '24px',
            borderRadius: '8px',
            border: '1px solid #e6f7ff',
            background: '#f6ffed'
          }}
        />
      </Card>
    </div>
  );
};

export default Register; 