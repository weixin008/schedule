import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Select, 
  Input, 
  message, 
  Row, 
  Col, 
  Space,
  Tag,
  Badge,
  Popconfirm,
  Statistic,
  Divider,
  Typography,
  Alert,
  Transfer
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import localStorageService from '../services/localStorageService';

const { Option } = Select;
const { TextArea } = Input;
const { Title } = Typography;

const AttendanceSupervisorGroupManagement = () => {
  const [groups, setGroups] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const groupsData = localStorageService.getAttendanceSupervisorGroups();
    const employeesData = localStorageService.getEmployees();
    setGroups(groupsData);
    setEmployees(employeesData);
  };

  const handleAdd = () => {
    setEditingGroup(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    form.setFieldsValue({
      name: group.name,
      members: group.members,
      description: group.description
    });
    setIsModalVisible(true);
  };

  const handleDelete = (groupId) => {
    localStorageService.deleteAttendanceSupervisorGroup(groupId);
    loadData();
    message.success('编组删除成功');
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingGroup) {
        // 编辑编组
        localStorageService.updateAttendanceSupervisorGroup(editingGroup.id, values);
        message.success('编组信息更新成功');
      } else {
        // 添加新编组
        localStorageService.addAttendanceSupervisorGroup(values);
        message.success('编组添加成功');
      }
      
      loadData();
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      if (error.message) {
        message.error(error.message);
      } else {
        console.error('表单验证失败:', error);
      }
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingGroup(null);
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : '未知员工';
  };

  // 获取具有考勤监督员标签的员工
  const getAttendanceSupervisorEmployees = () => {
    return employees.filter(emp => 
      emp.status === 'active' && 
      emp.tags && 
      emp.tags.includes('supervisor_tag')
    );
  };

  const columns = [
    {
      title: '编组名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '成员',
      dataIndex: 'members',
      key: 'members',
      render: (members) => (
        <Space wrap>
          {members.map(memberId => (
            <Tag key={memberId} color="blue">
              {getEmployeeName(memberId)}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '轮换顺序',
      dataIndex: 'rotationOrder',
      key: 'rotationOrder',
      width: 100,
      render: (order) => <Badge count={order + 1} style={{ backgroundColor: '#52c41a' }} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (createdAt) => new Date(createdAt).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个编组吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              icon={<DeleteOutlined />}
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const supervisorEmployees = getAttendanceSupervisorEmployees();

  return (
    <div>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic 
              title="编组总数" 
              value={groups.length} 
              prefix={<TeamOutlined />} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="活跃编组" 
              value={groups.filter(g => g.status === 'active').length} 
              prefix={<CheckOutlined />} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="可用监督员" 
              value={supervisorEmployees.length} 
              prefix={<UserOutlined />} 
            />
          </Col>
          <Col span={6}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAdd}
              disabled={supervisorEmployees.length < 2}
            >
              新增编组
            </Button>
          </Col>
        </Row>

        <Divider />

        {supervisorEmployees.length < 2 && (
          <Alert
            message="注意"
            description="至少需要2名具有'考勤监督员'标签的员工才能创建编组。请先在员工管理中添加相应标签。"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          columns={columns}
          dataSource={groups}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

      <Modal
        title={editingGroup ? '编辑考勤监督员编组' : '新增考勤监督员编组'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active'
          }}
        >
          <Form.Item
            name="name"
            label="编组名称"
            rules={[{ required: true, message: '请输入编组名称' }]}
          >
            <Input placeholder="请输入编组名称" />
          </Form.Item>

          <Form.Item
            name="members"
            label="编组成员"
            rules={[
              { required: true, message: '请选择编组成员' },
              { 
                validator: (_, value) => {
                  if (!value || value.length !== 2) {
                    return Promise.reject(new Error('考勤监督员编组必须包含固定2名成员'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="请选择2名考勤监督员"
              maxTagCount={2}
            >
              {supervisorEmployees.map(emp => (
                <Option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employeeId})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="编组描述"
          >
            <TextArea 
              rows={3} 
              placeholder="请输入编组描述（可选）"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AttendanceSupervisorGroupManagement; 