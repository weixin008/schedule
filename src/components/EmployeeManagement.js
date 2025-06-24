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
  DatePicker,
  Tooltip,
  Timeline,
  Typography
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  CrownOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import localStorageService from '../services/localStorageService';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Text } = Typography;

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [statusRecords, setStatusRecords] = useState([]);
  const [settings, setSettings] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const employeesData = localStorageService.getEmployees();
    const statusData = localStorageService.getEmployeeStatusRecords();
    const settingsData = localStorageService.getSettings();
    
    setEmployees(employeesData);
    setStatusRecords(statusData);
    
    // 确保settings包含必要的数据结构
    const safeSettings = {
      employeeStatusTypes: [
        { id: 'active', name: '正常在职', color: 'green', allowDuty: true },
        { id: 'sick_leave', name: '病假', color: 'red', allowDuty: false },
        { id: 'personal_leave', name: '事假', color: 'orange', allowDuty: false },
        { id: 'annual_leave', name: '年假', color: 'blue', allowDuty: false },
        { id: 'business_trip', name: '出差', color: 'purple', allowDuty: false },
        { id: 'training', name: '培训', color: 'cyan', allowDuty: false },
        { id: 'inactive', name: '离职', color: 'default', allowDuty: false }
      ],
      employeeLevels: [],
      employeeTags: [
        { id: 'leader_tag', name: '领导', color: 'red' },
        { id: 'staff_tag', name: '职工', color: 'blue' },
        { id: 'supervisor_tag', name: '考勤监督员', color: 'green' }
      ],
      ...settingsData
    };
    
    setSettings(safeSettings);
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    form.setFieldsValue(employee);
    setIsModalVisible(true);
  };

  const handleDelete = (employeeId) => {
    localStorageService.deleteEmployee(employeeId);
    loadData();
    message.success('员工删除成功');
  };

  const handleStatusChange = (employee) => {
    setSelectedEmployee(employee);
    statusForm.resetFields();
    setIsStatusModalVisible(true);
  };

  const handleViewHistory = (employee) => {
    setSelectedEmployee(employee);
    setIsHistoryModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingEmployee) {
        // 编辑员工
        localStorageService.updateEmployee(editingEmployee.id, values);
        message.success('员工信息更新成功');
      } else {
        // 添加新员工
        localStorageService.addEmployee(values);
        message.success('员工添加成功');
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

  const handleStatusModalOk = async () => {
    try {
      const values = await statusForm.validateFields();
      
      const statusRecord = {
        employeeId: selectedEmployee.id,
        statusType: values.statusType,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        reason: values.reason,
        remarks: values.remarks || ''
      };

      localStorageService.addEmployeeStatusRecord(statusRecord);
      loadData();
      setIsStatusModalVisible(false);
      statusForm.resetFields();
      message.success('员工状态变更成功');
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
    setEditingEmployee(null);
  };

  const getStatusColor = (status) => {
    const statusType = settings?.employeeStatusTypes?.find(type => type.id === status);
    return statusType ? statusType.color : 'default';
  };

  const getStatusText = (status) => {
    const statusType = settings?.employeeStatusTypes?.find(type => type.id === status);
    return statusType ? statusType.name : status;
  };

  const getCurrentStatus = (employeeId) => {
    return localStorageService.getEmployeeCurrentStatus(employeeId);
  };

  const getLevelInfo = (levelId) => {
    if (!levelId) return null;
    return settings?.employeeLevels?.find(level => level.id === levelId);
  };

  const getEmployeeStatusHistory = (employeeId) => {
    return statusRecords
      .filter(record => record.employeeId === employeeId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const getPendingStatusRecords = () => {
    return []; // 无审批流程，始终返回空数组
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: (name, record) => (
        <Space>
          <span>{name}</span>
          {record.level && getLevelInfo(record.level)?.canLeadDuty && (
            <CrownOutlined style={{ color: '#faad14' }} title="可担任值班领导" />
          )}
        </Space>
      ),
    },
    {
      title: '当前状态',
      key: 'currentStatus',
      width: 120,
      render: (_, record) => {
        const currentStatus = getCurrentStatus(record.id);
        return (
          <Badge 
            status={getStatusColor(currentStatus)} 
            text={getStatusText(currentStatus)} 
          />
        );
      },
    },
    {
      title: '角色标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags) => (
        <Space size="small" wrap>
          {tags?.map(tagId => {
            const tagInfo = getEmployeeTags().find(t => t.id === tagId);
            return (
              <Tag key={tagId} size="small" color={tagInfo?.color || 'default'}>
                {tagInfo?.name || tagId}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone) => phone || '-',
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 150,
      render: (remarks) => remarks || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<ClockCircleOutlined />}
            onClick={() => handleStatusChange(record)}
            size="small"
          >
            状态
          </Button>
          <Button
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(record)}
            size="small"
          >
            历史
          </Button>
          <Popconfirm
            title="确定删除这个员工吗？"
            description="删除员工将同时删除其所有值班记录"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计信息 - 更新为基于角色标签的统计
  const stats = {
    totalEmployees: employees?.length || 0,
    activeEmployees: employees?.filter(emp => getCurrentStatus(emp.id) === 'active').length || 0,
    onLeaveEmployees: employees?.filter(emp => {
      const status = getCurrentStatus(emp.id);
      return status !== 'active' && status !== 'inactive';
    }).length || 0,
    leaders: employees?.filter(emp => 
      emp.tags?.includes('leader_tag')
    ).length || 0,
  };

  const getEmployeeTags = () => {
    return settings?.employeeTags || [
      { id: 'leader_tag', name: '领导', color: 'red' },
      { id: 'staff_tag', name: '职工', color: 'blue' },
      { id: 'supervisor_tag', name: '考勤监督员', color: 'green' }
    ];
  };

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总员工数"
              value={stats.totalEmployees}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在职人员"
              value={stats.activeEmployees}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="请假/出差"
              value={stats.onLeaveEmployees}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="值班领导"
              value={stats.leaders}
              prefix={<CrownOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAdd}
        >
          添加员工
        </Button>
      </div>

      {/* 员工表格 */}
      <Table
        columns={columns}
        dataSource={employees || []}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
        }}
        size="middle"
        scroll={{ x: 800 }}
      />

      {/* 添加/编辑员工模态框 */}
      <Modal
        title={editingEmployee ? '编辑员工' : '添加员工'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="确定"
        cancelText="取消"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="姓名"
            name="name"
            rules={[
              { required: true, message: '请输入姓名' }
            ]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            label="角色标签"
            name="tags"
            rules={[
              { required: true, message: '请选择至少一个角色标签' }
            ]}
            tooltip="选择员工角色标签，用于区分领导、职工等不同类型的值班人员"
          >
            <Select
              mode="multiple"
              placeholder="选择角色标签（如：领导、职工、监督员等）"
              maxTagCount="responsive"
            >
              {getEmployeeTags().map(tag => (
                <Option key={tag.id} value={tag.id}>
                  <Tag color={tag.color}>{tag.name}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="员工状态"
            name="status"
            initialValue="active"
            tooltip="设置员工的初始状态"
          >
            <Select placeholder="请选择员工状态">
              {settings?.employeeStatusTypes?.map(type => (
                <Option key={type.id} value={type.id}>
                  <Space>
                    <Tag color={type.color}>{type.name}</Tag>
                    {!type.allowDuty && <Text type="secondary" style={{ fontSize: '12px' }}>(不可值班)</Text>}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="phone"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
            ]}
          >
            <Input placeholder="请输入联系电话（可选）" />
          </Form.Item>

          <Form.Item
            label="备注"
            name="remarks"
          >
            <Input.TextArea rows={2} placeholder="其他备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 状态变更模态框 */}
      <Modal
        title={`员工状态变更 - ${selectedEmployee?.name}`}
        open={isStatusModalVisible}
        onOk={handleStatusModalOk}
        onCancel={() => setIsStatusModalVisible(false)}
        okText="提交申请"
        cancelText="取消"
        width={600}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item
            name="statusType"
            label="状态类型"
            rules={[{ required: true, message: '请选择状态类型' }]}
          >
            <Select placeholder="请选择状态类型">
              {settings?.employeeStatusTypes?.map(type => (
                <Option key={type.id} value={type.id}>
                  <Space>
                    <Tag color={type.color}>{type.name}</Tag>
                    {!type.allowDuty && <Text type="warning">(不可值班)</Text>}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="时间范围"
            rules={[{ required: true, message: '请选择时间范围' }]}
          >
            <RangePicker 
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="变更原因"
            rules={[{ required: true, message: '请输入变更原因' }]}
          >
            <TextArea rows={3} placeholder="请详细说明状态变更原因" maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            name="remarks"
            label="备注"
          >
            <TextArea rows={2} placeholder="其他补充说明（可选）" maxLength={100} showCount />
          </Form.Item>
        </Form>
      </Modal>

      {/* 状态历史模态框 */}
      <Modal
        title={`状态历史 - ${selectedEmployee?.name}`}
        open={isHistoryModalVisible}
        onCancel={() => setIsHistoryModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsHistoryModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedEmployee && (
          <Timeline>
            {getEmployeeStatusHistory(selectedEmployee.id).map((record, index) => (
              <Timeline.Item
                key={record.id}
                color={getStatusColor(record.statusType)}
                dot={record.status === 'pending' ? <ClockCircleOutlined /> : 
                     record.status === 'approved' ? <CheckOutlined /> : <CloseOutlined />}
              >
                <div>
                  <Space>
                    <Tag color={getStatusColor(record.statusType)}>
                      {getStatusText(record.statusType)}
                    </Tag>
                    <Badge 
                      status={record.status === 'approved' ? 'success' : 
                             record.status === 'rejected' ? 'error' : 'processing'} 
                      text={record.status === 'approved' ? '已批准' : 
                            record.status === 'rejected' ? '已拒绝' : '待审批'} 
                    />
                  </Space>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary">
                      {dayjs(record.startDate).format('YYYY-MM-DD')} 至 {dayjs(record.endDate).format('YYYY-MM-DD')}
                    </Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text>{record.reason}</Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      申请时间: {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
                    </Text>
                  </div>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeManagement; 