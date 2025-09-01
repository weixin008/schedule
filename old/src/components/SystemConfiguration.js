import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Form, 
  Input, 
  Select, 
  Button, 
  Table, 
  Modal, 
  InputNumber, 
  Switch, 
  Space, 
  Tag, 
  Popconfirm,
  message,
  Row,
  Col,
  Typography,
  Alert,
  Divider,
  Checkbox
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined,
  SettingOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import hybridStorageService from '../services/hybridStorageService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SystemConfiguration = () => {
  const [activeTab, setActiveTab] = useState('roles');
  const [configuration, setConfiguration] = useState({
    roles: [],
    dutyModes: [],
    groupSettings: {},
    timeRules: { workingDays: [1, 2, 3, 4, 5], workingHours: { start: '09:00', end: '18:00' } },
    constraints: { global: {} }
  });

  const [modalState, setModalState] = useState({
    visible: false,
    type: '',
    editData: null
  });

  const [form] = Form.useForm();

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = () => {
    const settings = hybridStorageService.getSettings();
    const loadedConfig = settings?.systemConfiguration || {};
    const defaultConfig = getDefaultConfiguration();

    // 深度合并加载的配置和默认配置，确保所有字段都存在
    const mergedConfig = {
      ...defaultConfig,
      ...loadedConfig,
      roles: loadedConfig.roles || defaultConfig.roles,
      dutyModes: loadedConfig.dutyModes || defaultConfig.dutyModes,
      groupSettings: { ...defaultConfig.groupSettings, ...loadedConfig.groupSettings },
      timeRules: { ...defaultConfig.timeRules, ...loadedConfig.timeRules },
      constraints: { ...defaultConfig.constraints, ...loadedConfig.constraints }
    };

    setConfiguration(mergedConfig);
  };

  const getDefaultConfiguration = () => ({
    roles: [
      {
        id: 'manager',
        name: '管理人员',
        color: '#ff4d4f',
        description: '负责管理和决策',
        constraints: {
          maxContinuousDays: 7,
          minRestDays: 1,
          canWorkAlone: true
        }
      },
      {
        id: 'staff',
        name: '普通员工',
        color: '#1890ff',
        description: '执行日常工作',
        constraints: {
          maxContinuousDays: 5,
          minRestDays: 1,
          canWorkAlone: false
        }
      }
    ],
    // 值班模式配置
    dutyModes: [
      {
        id: '24hour',
        name: '24小时值班',
        description: '全天候24小时值班制',
        type: 'continuous',
        shifts: [
          { name: '全天值班', start: '00:00', end: '23:59', duration: 24 }
        ],
        rotationType: 'daily', // daily, weekly, monthly
        groupMode: 'individual' // individual, group
      },
      {
        id: 'day_night',
        name: '白班夜班倒班',
        description: '白天夜晚两班倒',
        type: 'shift',
        shifts: [
          { name: '白班', start: '08:00', end: '20:00', duration: 12 },
          { name: '夜班', start: '20:00', end: '08:00', duration: 12 }
        ],
        rotationType: 'weekly',
        groupMode: 'individual'
      },
      {
        id: 'three_shift',
        name: '三班倒',
        description: '早中晚三班轮换',
        type: 'shift', 
        shifts: [
          { name: '早班', start: '06:00', end: '14:00', duration: 8 },
          { name: '中班', start: '14:00', end: '22:00', duration: 8 },
          { name: '晚班', start: '22:00', end: '06:00', duration: 8 }
        ],
        rotationType: 'weekly',
        groupMode: 'individual'
      },
      {
        id: 'weekday_only',
        name: '仅工作日值班',
        description: '周一至周五工作时间值班',
        type: 'workday',
        shifts: [
          { name: '工作日值班', start: '09:00', end: '18:00', duration: 9 }
        ],
        rotationType: 'daily',
        groupMode: 'individual'
      },
      {
        id: 'custom',
        name: '自定义模式',
        description: '根据需要自定义值班安排',
        type: 'custom',
        shifts: [],
        rotationType: 'custom',
        groupMode: 'individual'
      }
    ],
    // 编组配置
    groupSettings: {
      enableGrouping: false,
      groupTypes: [
        {
          id: 'pair',
          name: '双人编组',
          description: '每组2人',
          minMembers: 2,
          maxMembers: 2
        },
        {
          id: 'team',
          name: '小组编组', 
          description: '每组3-5人',
          minMembers: 3,
          maxMembers: 5
        }
      ],
      rotationLevel: 'individual' // individual: 个人轮换, group: 编组轮换
    },
    timeRules: {
      workingDays: [1, 2, 3, 4, 5],
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      specialDates: [],
      timeZone: 'Asia/Shanghai'
    },
    constraints: {
      global: {
        minStaffPerShift: 1,
        maxStaffPerShift: 10,
        allowEmptyShift: false,
        requireApproval: false
      },
      leave: {
        allowLeaveConflict: false,
        autoExcludeOnLeave: true,
        leaveTypes: ['sick', 'annual', 'personal', 'business']
      }
    }
  });

  const saveConfiguration = () => {
    const settings = hybridStorageService.getSettings();
    const updatedSettings = {
      ...settings,
      systemConfiguration: configuration
    };
    hybridStorageService.saveSettings(updatedSettings);
    message.success('系统配置保存成功！');
  };

  const openModal = (type, data = null) => {
    setModalState({
      visible: true,
      type,
      editData: data
    });
    
    if (data) {
      form.setFieldsValue(data);
    } else {
      form.resetFields();
    }
  };

  const closeModal = () => {
    setModalState({
      visible: false,
      type: '',
      editData: null
    });
    form.resetFields();
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { type, editData } = modalState;

      if (type === 'role') {
        const newRole = {
          id: editData ? editData.id : `role_${Date.now()}`,
          ...values,
          createdAt: editData?.createdAt || new Date().toISOString()
        };

        const updatedRoles = editData 
          ? configuration.roles.map(r => r.id === editData.id ? newRole : r)
          : [...configuration.roles, newRole];

        setConfiguration(prev => ({
          ...prev,
          roles: updatedRoles
        }));
      } else if (type === 'dutyMode') {
        const newDutyMode = {
          id: editData ? editData.id : `dutyMode_${Date.now()}`,
          ...values,
          createdAt: editData?.createdAt || new Date().toISOString()
        };

        const updatedDutyModes = editData
          ? configuration.dutyModes.map(r => r.id === editData.id ? newDutyMode : r)
          : [...configuration.dutyModes, newDutyMode];

        setConfiguration(prev => ({
          ...prev,
          dutyModes: updatedDutyModes
        }));
      }

      closeModal();
      message.success(editData ? '更新成功' : '添加成功');
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const deleteItem = (type, id) => {
    if (type === 'role') {
      setConfiguration(prev => ({
        ...prev,
        roles: prev.roles.filter(r => r.id !== id)
      }));
    } else if (type === 'dutyMode') {
      setConfiguration(prev => ({
        ...prev,
        dutyModes: prev.dutyModes.filter(r => r.id !== id)
      }));
    }
    message.success('删除成功');
  };

  const roleColumns = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: record.color,
              borderRadius: '50%'
            }}
          />
          {name}
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '约束条件',
      key: 'constraints',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text type="secondary" style={{ fontSize: 12 }}>
            最大连续: {record.constraints?.maxContinuousDays || 0}天
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            独立值班: {record.constraints?.canWorkAlone ? '允许' : '不允许'}
          </Text>
        </Space>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openModal('role', record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个角色吗？"
            onConfirm={() => deleteItem('role', record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const dutyModeColumns = [
    {
      title: '模式名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '模式类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeMap = {
          continuous: '24小时值班',
          shift: '两班倒/三班倒',
          workday: '工作日值班',
          custom: '自定义模式'
        };
        return <Tag color="green">{typeMap[type] || type}</Tag>;
      }
    },
    {
      title: '班次信息',
      key: 'shifts',
      render: (_, record) => {
        if (record.shifts && record.shifts.length > 0) {
          return record.shifts.map((shift, index) => (
            <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
              {shift.name}: {shift.start}-{shift.end}
            </Tag>
          ));
        }
        return '-';
      }
    },
    {
      title: '轮换方式',
      dataIndex: 'rotationType',
      key: 'rotationType',
      render: (rotationType) => {
        const rotationMap = {
          daily: '每日轮换',
          weekly: '每周轮换',
          monthly: '每月轮换',
          custom: '自定义'
        };
        return rotationMap[rotationType] || rotationType;
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openModal('dutyMode', record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个值班模式吗？"
            onConfirm={() => deleteItem('dutyMode', record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>
            <SettingOutlined /> 系统配置
          </Title>
          <Paragraph type="secondary">
            配置适合您企业的角色体系、轮换模式、时间规则等基础设置。这些配置将作为排班规则的基础。
          </Paragraph>
        </div>

        <Alert
          message="重要提示"
          description="系统配置是排班系统的基础，建议在开始使用前完成配置。修改配置可能影响现有的排班规则和计划。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'roles',
              label: <span><TeamOutlined />角色体系</span>,
              children: (
                <Card
                  title="角色定义"
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => openModal('role')}
                    >
                      添加角色
                    </Button>
                  }
                >
                  <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                    定义您企业中需要参与排班的角色类型，如：管理人员、技术人员、客服人员等。
                  </Paragraph>
                  
                  <Table
                    columns={roleColumns}
                    dataSource={configuration.roles}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                  />
                </Card>
              )
            },
            {
              key: 'dutyModes',
              label: <span><ClockCircleOutlined />值班模式</span>,
              children: (
                <Card
                  title="值班模式定义"
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => openModal('dutyMode')}
                    >
                      添加模式
                    </Button>
                  }
                >
                  <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                    定义不同的值班模式，如：每日轮换、每周轮换、连班模式等。可以为不同角色设置不同的值班模式。
                  </Paragraph>
                  
                  <Table
                    columns={dutyModeColumns}
                    dataSource={configuration.dutyModes}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                  />
                </Card>
              )
            },
            {
              key: 'time',
              label: <span><CalendarOutlined />时间规则</span>,
              children: (
                <Card title="工作时间配置">
                  <Form layout="vertical">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="工作日设置">
                          <Checkbox.Group
                            options={[
                              { label: '周一', value: 1 },
                              { label: '周二', value: 2 },
                              { label: '周三', value: 3 },
                              { label: '周四', value: 4 },
                              { label: '周五', value: 5 },
                              { label: '周六', value: 6 },
                              { label: '周日', value: 0 }
                            ]}
                            value={configuration.timeRules.workingDays}
                            onChange={(days) => {
                              setConfiguration(prev => ({
                                ...prev,
                                timeRules: {
                                  ...prev.timeRules,
                                  workingDays: days
                                }
                              }));
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="工作时间">
                          <Space>
                            <Input
                              placeholder="09:00"
                              value={configuration.timeRules.workingHours?.start}
                              onChange={(e) => {
                                setConfiguration(prev => ({
                                  ...prev,
                                  timeRules: {
                                    ...prev.timeRules,
                                    workingHours: {
                                      ...prev.timeRules.workingHours,
                                      start: e.target.value
                                    }
                                  }
                                }));
                              }}
                            />
                            <Text>至</Text>
                            <Input
                              placeholder="18:00"
                              value={configuration.timeRules.workingHours?.end}
                              onChange={(e) => {
                                setConfiguration(prev => ({
                                  ...prev,
                                  timeRules: {
                                    ...prev.timeRules,
                                    workingHours: {
                                      ...prev.timeRules.workingHours,
                                      end: e.target.value
                                    }
                                  }
                                }));
                              }}
                            />
                          </Space>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              )
            },
            {
              key: 'groupSettings',
              label: <span><TeamOutlined />编组设置</span>,
              children: (
                <Card title="值班编组配置">
                  <Alert
                    message="编组说明"
                    description="可以选择个人值班或编组值班。编组值班时，将按照编组轮换，而不是个人轮换。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                  
                  <Form layout="vertical">
                    <Form.Item label="轮换方式">
                      <Select
                        value={configuration.groupSettings?.rotationLevel}
                        onChange={(value) => {
                          setConfiguration(prev => ({
                            ...prev,
                            groupSettings: {
                              ...prev.groupSettings,
                              rotationLevel: value,
                              enableGrouping: value === 'group'
                            }
                          }));
                        }}
                        style={{ width: 200 }}
                      >
                        <Option value="individual">个人轮换</Option>
                        <Option value="group">编组轮换</Option>
                      </Select>
                    </Form.Item>

                    {configuration.groupSettings?.rotationLevel === 'group' && (
                      <>
                        <Divider>编组类型配置</Divider>
                        <Row gutter={16}>
                          {configuration.groupSettings?.groupTypes?.map((groupType, index) => (
                            <Col span={8} key={groupType.id}>
                              <Card size="small" title={groupType.name}>
                                <p>{groupType.description}</p>
                                <p>成员数量：{groupType.minMembers}-{groupType.maxMembers}人</p>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </>
                    )}
                  </Form>
                </Card>
              )
            },
            {
              key: 'constraints',
              label: <span><CheckCircleOutlined />约束条件</span>,
              children: (
                <Card title="全局约束设置">
                  <Alert
                    message="约束说明"
                    description="设置全局的排班约束条件，这些条件将影响所有排班规则的生成。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                  
                  <Form layout="vertical">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="最大连续值班天数">
                          <Input
                            type="number"
                            min={1}
                            max={7}
                            value={configuration.constraints?.maxConsecutiveDays}
                            onChange={(e) => {
                              setConfiguration(prev => ({
                                ...prev,
                                constraints: {
                                  ...prev.constraints,
                                  maxConsecutiveDays: parseInt(e.target.value) || 3
                                }
                              }));
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="最小休息天数">
                          <Input
                            type="number"
                            min={1}
                            max={7}
                            value={configuration.constraints?.minRestDays}
                            onChange={(e) => {
                              setConfiguration(prev => ({
                                ...prev,
                                constraints: {
                                  ...prev.constraints,
                                  minRestDays: parseInt(e.target.value) || 1
                                }
                              }));
                            }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>
              )
            }
          ]}
        />

        <Divider />

        <Row justify="center">
          <Space size="large">
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={saveConfiguration}
            >
              保存系统配置
            </Button>
            <Button
              size="large"
              onClick={() => setConfiguration(getDefaultConfiguration())}
            >
              恢复默认配置
            </Button>
          </Space>
        </Row>
      </Card>

      <Modal
        title={
          modalState.type === 'role'
            ? (modalState.editData ? '编辑角色' : '添加角色')
            : (modalState.editData ? '编辑值班模式' : '添加值班模式')
        }
        open={modalState.visible}
        onOk={handleModalSubmit}
        onCancel={closeModal}
        width={600}
      >
        <Form form={form} layout="vertical">
          {modalState.type === 'role' && (
            <>
              <Form.Item
                name="name"
                label="角色名称"
                rules={[{ required: true, message: '请输入角色名称' }]}
              >
                <Input placeholder="如：管理人员、技术人员" />
              </Form.Item>

              <Form.Item
                name="color"
                label="显示颜色"
                rules={[{ required: true, message: '请选择显示颜色' }]}
              >
                <Input type="color" />
              </Form.Item>

              <Form.Item name="description" label="角色描述">
                <TextArea rows={3} placeholder="描述这个角色的职责和特点" />
              </Form.Item>

              <Form.Item label="约束条件">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name={['constraints', 'maxContinuousDays']} label="最大连续天数">
                      <InputNumber min={1} placeholder="天" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['constraints', 'minRestDays']} label="最小休息天数">
                      <InputNumber min={0} placeholder="天" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name={['constraints', 'canWorkAlone']} valuePropName="checked">
                  <Switch /> 允许独立值班
                </Form.Item>
              </Form.Item>
            </>
          )}

          {modalState.type === 'dutyMode' && (
            <>
              <Form.Item
                name="name"
                label="模式名称"
                rules={[{ required: true, message: '请输入模式名称' }]}
              >
                <Input placeholder="如：24小时值班、白班夜班倒班" />
              </Form.Item>

              <Form.Item
                name="type"
                label="值班类型"
                rules={[{ required: true, message: '请选择值班类型' }]}
              >
                <Select placeholder="选择值班类型">
                  <Option value="continuous">24小时值班</Option>
                  <Option value="shift">两班倒/三班倒</Option>
                  <Option value="workday">工作日值班</Option>
                  <Option value="custom">自定义模式</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="rotationType"
                label="轮换方式"
                rules={[{ required: true, message: '请选择轮换方式' }]}
              >
                <Select placeholder="选择轮换方式">
                  <Option value="daily">每日轮换</Option>
                  <Option value="weekly">每周轮换</Option>
                  <Option value="monthly">每月轮换</Option>
                  <Option value="custom">自定义轮换</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="groupMode"
                label="参与方式"
                rules={[{ required: true, message: '请选择参与方式' }]}
              >
                <Select placeholder="选择参与方式">
                  <Option value="individual">个人值班</Option>
                  <Option value="group">编组值班</Option>
                </Select>
              </Form.Item>

              <Form.Item name="description" label="模式描述">
                <TextArea rows={3} placeholder="描述这种值班模式的特点和用途" />
              </Form.Item>

              <Alert
                message="提示"
                description="具体的班次时间设置可以在'时间规则'中配置，或在'排班规则配置'中为具体角色设定。"
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default SystemConfiguration; 