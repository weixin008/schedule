import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Select, 
  DatePicker, 
  Input,
  message, 
  Row, 
  Col, 
  Space,
  Tag,
  Alert,
  Divider,
  Descriptions,
  Badge,
  Tooltip,
  Transfer
} from 'antd';
import { 
  PlusOutlined, 
  CalendarOutlined, 
  TeamOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import localStorageService from '../services/localStorageService';

const { Option } = Select;
const { RangePicker } = DatePicker;

const DutyManagement = () => {
  const [dutySchedules, setDutySchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isIntelligentModalVisible, setIsIntelligentModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [form] = Form.useForm();
  const [intelligentForm] = Form.useForm();
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const schedulesData = localStorageService.getDutySchedules();
    const employeesData = localStorageService.getEmployees();
    const settingsData = localStorageService.getSettings();
    
    setDutySchedules(schedulesData);
    setEmployees(employeesData);
    setSettings(settingsData);
  };

  const handleAddDuty = () => {
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleIntelligentSchedule = () => {
    intelligentForm.resetFields();
    setIsIntelligentModalVisible(true);
  };

  const handleAdvancedSchedule = () => {
    intelligentForm.resetFields();
    // 设置高级排班模式
    intelligentForm.setFieldsValue({
      useAdvancedScheduling: true
    });
    setIsIntelligentModalVisible(true);
  };

  const handleViewDetail = (schedule) => {
    setSelectedSchedule(schedule);
    setIsDetailModalVisible(true);
  };

  const handleDeleteSchedule = (scheduleId) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个值班安排吗？',
      onOk: () => {
        // 直接删除值班记录
        const schedules = localStorageService.getDutySchedules();
        const filteredSchedules = schedules.filter(s => s.id !== scheduleId);
        localStorageService.saveDutySchedules(filteredSchedules);
        loadData();
        message.success('值班安排已删除');
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // 转换人员选择为标准格式
      const dutyStaff = values.dutyStaff.map(employeeId => {
        const employee = employees.find(emp => emp.id === employeeId);
        const level = settings?.employeeLevels.find(l => l.id === employee?.level);
        return {
          employeeId,
          role: level?.canLeadDuty ? 'team_leader' : 'duty_officer'
        };
      });

      const schedule = {
        date: values.date.format('YYYY-MM-DD'),
        dutyType: values.dutyType,
        dutyStaff,
        notes: values.notes || ''
      };
      
      localStorageService.addDutySchedule(schedule);
      loadData();
      setIsModalVisible(false);
      form.resetFields();
      message.success('值班安排添加成功');
    } catch (error) {
      if (error.message) {
        message.error(error.message);
      } else {
        console.error('表单验证失败:', error);
      }
    }
  };

  const handleIntelligentOk = async () => {
    try {
      const values = await intelligentForm.validateFields();
      
      // 如果启用高级排班，需要设置高级排班规则
      if (values.useAdvancedScheduling) {
        const currentSettings = localStorageService.getSettings();
        const updatedSettings = {
          ...currentSettings,
          dutyRules: {
            ...currentSettings.dutyRules,
            advancedScheduling: {
              ...currentSettings.dutyRules.advancedScheduling,
              leaderRotation: { enabled: true, pattern: 'daily' },
              staffRotation: {
                enabled: true,
                mondayToThursday: { pattern: 'daily' },
                fridayToSunday: { pattern: 'continuous_three_days' }
              },
              attendanceSupervision: {
                enabled: true,
                workdaysOnly: true,
                rotationPattern: 'weekly'
              }
            }
          }
        };
        localStorageService.saveSettings(updatedSettings);
      }

      const options = {
        dutyTypes: values.dutyTypes || ['advanced_duty'],
        useAdvancedScheduling: values.useAdvancedScheduling
      };

      const schedules = localStorageService.generateIntelligentSchedule(
        values.dateRange[0].format('YYYY-MM-DD'),
        values.dateRange[1].format('YYYY-MM-DD'),
        options
      );

      // 批量添加排班
      for (const schedule of schedules) {
        try {
          localStorageService.addDutySchedule(schedule);
        } catch (error) {
          console.warn('智能排班冲突:', error.message);
        }
      }

      loadData();
      setIsIntelligentModalVisible(false);
      intelligentForm.resetFields();
      message.success(`${values.useAdvancedScheduling ? '高级' : ''}智能排班完成，共生成 ${schedules.length} 个值班安排`);
    } catch (error) {
      message.error(error.message || '智能排班失败');
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.name : '未知员工';
  };

  const getDutyTypeName = (dutyTypeId) => {
    const dutyType = settings?.dutyTypes.find(type => type.id === dutyTypeId);
    return dutyType ? dutyType.name : dutyTypeId;
  };

  const getDutyTypeColor = (dutyTypeId) => {
    const dutyType = settings?.dutyTypes.find(type => type.id === dutyTypeId);
    return dutyType ? dutyType.color : '#1890ff';
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'scheduled': { status: 'processing', text: '已安排' },
      'completed': { status: 'success', text: '已完成' },
      'cancelled': { status: 'error', text: '已取消' }
    };
    const config = statusMap[status] || { status: 'default', text: '未知' };
    return <Badge status={config.status} text={config.text} />;
  };

  // 获取可用员工列表（使用新的状态检查方法）
  const getAvailableEmployees = (selectedDate) => {
    if (!selectedDate) return employees.filter(emp => emp.status === 'active');
    
    const dateStr = selectedDate.format('YYYY-MM-DD');
    return employees.filter(emp => 
      emp.status === 'active' && localStorageService.isEmployeeAvailable(emp.id, dateStr)
    );
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    {
      title: '星期',
      dataIndex: 'date',
      key: 'weekday',
      width: 80,
      render: (date) => dayjs(date).format('dddd'),
    },
    {
      title: '值班类型',
      dataIndex: 'dutyType',
      key: 'dutyType',
      width: 120,
      render: (dutyTypeId) => (
        <Tag color={getDutyTypeColor(dutyTypeId)}>
          {getDutyTypeName(dutyTypeId)}
        </Tag>
      ),
    },
    {
      title: '值班人员',
      dataIndex: 'dutyStaff',
      key: 'dutyStaff',
      width: 200,
      render: (dutyStaff) => (
        <Space size="small" wrap>
          {dutyStaff?.map((staff, index) => {
            const employee = employees.find(emp => emp.id === staff.employeeId);
            const level = settings?.employeeLevels.find(l => l.id === employee?.level);
            return (
              <Tag 
                key={index} 
                color={staff.role === 'team_leader' ? 'gold' : 'blue'}
                icon={staff.role === 'team_leader' ? <TeamOutlined /> : null}
              >
                {getEmployeeName(staff.employeeId)}
                {staff.isSubstitute && <Tooltip title="替班"><SwapOutlined style={{ marginLeft: 4 }} /></Tooltip>}
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusBadge(status),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      width: 150,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            size="small"
          >
            详情
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteSchedule(record.id)}
            size="small"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 操作区域 */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="large">
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddDuty}
              >
                添加值班
              </Button>
              <Button 
                icon={<CalendarOutlined />}
                onClick={handleIntelligentSchedule}
              >
                智能排班
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <span>总值班数: <strong>{dutySchedules.length}</strong></span>
              <span>本周值班: <strong>
                {dutySchedules.filter(s => {
                  const date = dayjs(s.date);
                  const now = dayjs();
                  return date.isAfter(now.startOf('week')) && date.isBefore(now.endOf('week'));
                }).length}
              </strong></span>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 值班表格 */}
      <Table
        columns={columns}
        dataSource={dutySchedules}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          defaultPageSize: 20,
        }}
        size="middle"
        scroll={{ x: 1000 }}
      />

      {/* 添加值班模态框 */}
      <Modal
        title="添加值班安排"
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="date"
            label="值班日期"
            rules={[{ required: true, message: '请选择值班日期' }]}
          >
            <DatePicker 
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="dutyType"
            label="值班类型"
            rules={[{ required: true, message: '请选择值班类型' }]}
          >
            <Select placeholder="请选择值班类型">
              {settings?.dutyTypes.map(type => (
                <Option key={type.id} value={type.id}>
                  <Space>
                    <Tag color={type.color}>{type.name}</Tag>
                    <span>{type.startTime} - {type.endTime}</span>
                    <span style={{ color: '#666' }}>({type.duration}小时)</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dutyStaff"
            label="值班人员"
            rules={[
              { required: true, message: '请选择值班人员' },
              { type: 'array', min: 1, message: '至少选择一名值班人员' }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="请选择值班人员"
              maxTagCount="responsive"
            >
              {employees.filter(emp => emp.status === 'active').map(employee => {
                const level = settings?.employeeLevels.find(l => l.id === employee.level);
                const currentStatus = localStorageService.getEmployeeCurrentStatus(employee.id);
                const statusType = settings?.employeeStatusTypes.find(type => type.id === currentStatus);
                const isAvailable = statusType?.allowDuty;
                
                return (
                  <Option 
                    key={employee.id} 
                    value={employee.id}
                    disabled={!isAvailable}
                  >
                    <Space>
                      <span>{employee.name}</span>
                      <Tag size="small" color={level?.canLeadDuty ? 'gold' : 'blue'}>
                        {level?.name}
                      </Tag>
                      {!isAvailable && (
                        <Tag size="small" color="red">
                          {statusType?.name}
                        </Tag>
                      )}
                      {employee.tags?.map(tag => (
                        <Tag key={tag} size="small" color="processing">{tag}</Tag>
                      ))}
                    </Space>
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          <Form.Item
            name="notes"
            label="备注"
          >
            <Input.TextArea rows={3} placeholder="备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 智能排班模态框 */}
      <Modal
        title="智能排班"
        open={isIntelligentModalVisible}
        onOk={handleIntelligentOk}
        onCancel={() => setIsIntelligentModalVisible(false)}
        okText="开始排班"
        cancelText="取消"
        width={600}
      >
        <Alert
          message="智能排班说明"
          description="系统将根据员工级别、值班次数、休息时间等因素自动安排值班，确保负载均衡和合规性。"
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
        
        <Form form={intelligentForm} layout="vertical">
          <Form.Item
            name="dateRange"
            label="排班时间范围"
            rules={[{ required: true, message: '请选择排班时间范围' }]}
          >
            <RangePicker 
              style={{ width: '100%' }}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item
            name="dutyTypes"
            label="值班类型"
            rules={[{ required: true, message: '请选择值班类型' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择需要排班的值班类型"
            >
              {settings?.dutyTypes.map(type => (
                <Option key={type.id} value={type.id}>
                  <Space>
                    <Tag color={type.color}>{type.name}</Tag>
                    <span>{type.duration}小时</span>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 值班详情模态框 */}
      <Modal
        title="值班详情"
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        {selectedSchedule && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="值班日期" span={2}>
              {dayjs(selectedSchedule.date).format('YYYY年MM月DD日 dddd')}
            </Descriptions.Item>
            <Descriptions.Item label="值班类型">
              <Tag color={getDutyTypeColor(selectedSchedule.dutyType)}>
                {getDutyTypeName(selectedSchedule.dutyType)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {getStatusBadge(selectedSchedule.status)}
            </Descriptions.Item>
            <Descriptions.Item label="值班人员" span={2}>
              <Space size="small" wrap>
                {selectedSchedule.dutyStaff?.map((staff, index) => {
                  const employee = employees.find(emp => emp.id === staff.employeeId);
                  return (
                    <Tag 
                      key={index} 
                      color={staff.role === 'team_leader' ? 'gold' : 'blue'}
                    >
                      {getEmployeeName(staff.employeeId)} 
                      ({staff.role === 'team_leader' ? '组长' : '值班员'})
                      {staff.isSubstitute && ' [替班]'}
                    </Tag>
                  );
                })}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedSchedule.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="是否替班">
              {selectedSchedule.hasSubstitute ? '是' : '否'}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {selectedSchedule.notes || '无'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default DutyManagement; 