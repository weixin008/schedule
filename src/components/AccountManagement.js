import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Form, Input, Select, Space, Card, Typography, 
  message, Popconfirm, Tag, Avatar, Tooltip, Badge, Divider, Alert 
} from 'antd';
import { 
  UserOutlined, EditOutlined, DeleteOutlined, PlusOutlined, 
  LockOutlined, UnlockOutlined, EyeOutlined, EyeInvisibleOutlined 
} from '@ant-design/icons';
import hybridStorageService from '../services/hybridStorageService';

const { Title, Text } = Typography;
const { Option } = Select;

const AccountManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      await loadUsers();
      // 初始化默认管理员账户
      hybridStorageService.initializeDefaultAdmin();
    };
    
    initializeData();
  }, []);

  const loadUsers = async () => {
    try {
      const userList = await hybridStorageService.getUsers();
      // 确保返回的是数组
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (error) {
      console.error('加载用户列表失败:', error);
      setUsers([]);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status
    });
    setModalVisible(true);
  };

  const handleDeleteUser = async (userId) => {
    try {
      const success = await hybridStorageService.deleteUser(userId);
      if (success) {
        message.success('用户删除成功');
        loadUsers();
      } else {
        message.error('用户删除失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error('删除用户失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // 更新用户
        const updatedUser = await hybridStorageService.updateUser(editingUser.id, values);
        if (updatedUser) {
          message.success('用户更新成功');
          setModalVisible(false);
          loadUsers();
        } else {
          message.error('用户更新失败');
        }
      } else {
        // 添加新用户
        const newUser = {
          ...values,
          password: values.password || '123456', // 默认密码
          permissions: getDefaultPermissions(values.role)
        };
        
        const createdUser = await hybridStorageService.addUser(newUser);
        if (createdUser) {
          message.success('用户创建成功');
          setModalVisible(false);
          loadUsers();
        } else {
          message.error('用户创建失败');
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const getDefaultPermissions = (role) => {
    switch (role) {
      case 'admin':
        return ['all'];
      case 'manager':
        return ['view', 'edit', 'manage_users'];
      case 'user':
        return ['view', 'edit'];
      default:
        return ['view'];
    }
  };

  const handleStatusChange = async (userId, status) => {
    try {
      const success = await hybridStorageService.updateUser(userId, { status });
      if (success) {
        message.success(`用户状态已${status === 'active' ? '启用' : '禁用'}`);
        loadUsers();
      } else {
        message.error('状态更新失败');
      }
    } catch (error) {
      console.error('状态更新失败:', error);
      message.error('状态更新失败');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const success = await hybridStorageService.updateUser(userId, { password: '123456' });
      if (success) {
        message.success('密码已重置为: 123456');
      } else {
        message.error('密码重置失败');
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      message.error('密码重置失败');
    }
  };

  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: record.status === 'active' ? '#52c41a' : '#d9d9d9' }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <Text type="secondary">@{record.username}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-'
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const roleConfig = {
          admin: { color: 'red', text: '管理员' },
          manager: { color: 'blue', text: '经理' },
          user: { color: 'green', text: '普通用户' }
        };
        const config = roleConfig[role] || { color: 'default', text: role };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'active' ? 'success' : 'default'} 
          text={status === 'active' ? '正常' : '禁用'} 
        />
      )
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      key: 'lastLoginTime',
      render: (time) => time ? new Date(time).toLocaleString() : '从未登录'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑用户">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditUser(record)}
            />
          </Tooltip>
          
          <Tooltip title={record.status === 'active' ? '禁用用户' : '启用用户'}>
            <Button 
              type="text" 
              icon={record.status === 'active' ? <LockOutlined /> : <UnlockOutlined />}
              onClick={() => handleStatusChange(record.id, record.status === 'active' ? 'inactive' : 'active')}
            />
          </Tooltip>
          
          <Tooltip title="重置密码">
            <Popconfirm
              title="确定要重置密码吗？"
              description="密码将重置为: 123456"
              onConfirm={() => handleResetPassword(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" icon={<LockOutlined />} />
            </Popconfirm>
          </Tooltip>
          
          {record.role !== 'admin' && (
            <Tooltip title="删除用户">
              <Popconfirm
                title="确定要删除这个用户吗？"
                description="此操作不可恢复"
                onConfirm={() => handleDeleteUser(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={3} style={{ margin: 0 }}>用户管理</Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddUser}
          >
            添加用户
          </Button>
        </div>

        <Alert
          message="用户管理说明"
          description="管理员可以创建、编辑、删除用户账户，管理用户权限和状态。默认管理员账户不可删除。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个用户`
          }}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText={editingUser ? '更新' : '创建'}
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'user',
            status: 'active'
          }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
            ]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>

          <Form.Item
            name="name"
            label="姓名"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, message: '姓名至少2个字符' }
            ]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱地址" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
            >
              <Input.Password 
                placeholder="请输入密码"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="admin">管理员</Option>
              <Option value="manager">经理</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value="active">正常</Option>
              <Option value="inactive">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountManagement; 