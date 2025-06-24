import React, { useState } from 'react';
import { 
  Card, 
  Steps, 
  Button, 
  Row, 
  Col, 
  Typography,
  Alert,
  Space,
  Divider,
  message,
  Tag,
  Collapse,
  List,
  Progress,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Checkbox,
  Modal,
  Popconfirm
} from 'antd';
import { 
  StarOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  RocketOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import localStorageService from '../services/localStorageService';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;
const { Step } = Steps;
const { Option } = Select;

const ScheduleTemplateManager = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customConfig, setCustomConfig] = useState({});
  const [modalState, setModalState] = useState({
    visible: false,
    type: '', // 'role', 'schedule', 'time'
    editData: null
  });
  const [form] = Form.useForm();

  // 行业模板定义
  const industryTemplates = [
    {
      id: 'government',
      name: '政府机关',
      icon: '🏛️',
      description: '适用于政府部门、事业单位等',
      popularity: 95,
      features: ['领导值班', '职工轮换', '监督检查', '应急响应'],
      roles: [
        { name: '领导', priority: 1, color: '#ff4d4f', canWorkAlone: true, maxContinuous: 7 },
        { name: '职工', priority: 2, color: '#1890ff', canWorkAlone: false, maxContinuous: 5 },
        { name: '监督员', priority: 3, color: '#52c41a', canWorkAlone: false, maxContinuous: 5 }
      ]
    },
    {
      id: 'healthcare',
      name: '医疗机构',
      icon: '🏥',
      description: '适用于医院、诊所等医疗机构',
      popularity: 90,
      features: ['医生排班', '护士三班倒', '急诊24小时', '专科轮转'],
      roles: [
        { name: '主治医生', priority: 1, color: '#ff4d4f', canWorkAlone: true, maxContinuous: 3 },
        { name: '住院医生', priority: 2, color: '#fa8c16', canWorkAlone: false, maxContinuous: 5 },
        { name: '护士长', priority: 3, color: '#52c41a', canWorkAlone: true, maxContinuous: 4 },
        { name: '护士', priority: 4, color: '#1890ff', canWorkAlone: false, maxContinuous: 4 }
      ]
    },
    {
      id: 'manufacturing',
      name: '制造企业',
      icon: '🏭',
      description: '适用于工厂、车间等制造业',
      popularity: 85,
      features: ['车间主任', '技术工人', '质检员', '安全员'],
      roles: [
        { name: '车间主任', priority: 1, color: '#ff4d4f', canWorkAlone: true, maxContinuous: 6 },
        { name: '技术工人', priority: 2, color: '#1890ff', canWorkAlone: false, maxContinuous: 6 },
        { name: '质检员', priority: 3, color: '#52c41a', canWorkAlone: false, maxContinuous: 5 },
        { name: '安全员', priority: 4, color: '#fa8c16', canWorkAlone: true, maxContinuous: 5 }
      ]
    },
    {
      id: 'retail',
      name: '零售服务',
      icon: '🛍️',
      description: '适用于商场、超市、连锁店等',
      popularity: 80,
      features: ['店长管理', '收银员', '导购员', '保安值班'],
      roles: [
        { name: '店长', priority: 1, color: '#ff4d4f', canWorkAlone: true, maxContinuous: 6 },
        { name: '收银员', priority: 2, color: '#1890ff', canWorkAlone: false, maxContinuous: 5 },
        { name: '导购员', priority: 3, color: '#52c41a', canWorkAlone: false, maxContinuous: 5 },
        { name: '保安', priority: 4, color: '#722ed1', canWorkAlone: true, maxContinuous: 4 }
      ]
    },
    {
      id: 'education',
      name: '教育培训',
      icon: '🎓',
      description: '适用于学校、培训机构等',
      popularity: 75,
      features: ['教务管理', '任课教师', '班主任', '值周教师'],
      roles: [
        { name: '教务主任', priority: 1, color: '#ff4d4f', canWorkAlone: true, maxContinuous: 5 },
        { name: '任课教师', priority: 2, color: '#1890ff', canWorkAlone: true, maxContinuous: 5 },
        { name: '班主任', priority: 3, color: '#52c41a', canWorkAlone: true, maxContinuous: 7 },
        { name: '值周教师', priority: 4, color: '#fa8c16', canWorkAlone: false, maxContinuous: 5 }
      ]
    },
    {
      id: 'security',
      name: '安保服务',
      icon: '🛡️',
      description: '适用于安保公司、物业管理等',
      popularity: 85,
      features: ['保安队长', '门岗保安', '巡逻保安', '监控员'],
      roles: [
        { name: '保安队长', priority: 1, color: '#ff4d4f', canWorkAlone: true, maxContinuous: 7 },
        { name: '门岗保安', priority: 2, color: '#1890ff', canWorkAlone: true, maxContinuous: 5 },
        { name: '巡逻保安', priority: 3, color: '#52c41a', canWorkAlone: false, maxContinuous: 4 },
        { name: '监控员', priority: 4, color: '#722ed1', canWorkAlone: true, maxContinuous: 6 }
      ]
    },
    {
      id: 'custom',
      name: '自定义配置',
      icon: '🎨',
      description: '完全自定义，适应任何行业需求',
      popularity: 100,
      features: ['角色自定义', '规则自定义', '时间自定义', '约束自定义'],
      isCustom: true
    }
  ];

  const steps = [
    { title: '选择模板', description: '选择适合您行业的模板', icon: <StarOutlined /> },
    { title: '配置参数', description: '调整具体的配置参数', icon: <SettingOutlined /> },
    { title: '预览确认', description: '预览配置效果并确认', icon: <CheckCircleOutlined /> },
    { title: '完成设置', description: '保存配置并开始使用', icon: <RocketOutlined /> }
  ];

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    if (template.isCustom) {
      setCustomConfig({
        roles: [],
        scheduleRules: {},
        timeRules: { workdays: [1, 2, 3, 4, 5], workHours: { start: '09:00', end: '18:00' } },
        constraints: { global: { minStaffPerShift: 1, maxStaffPerShift: 10, allowEmptyShift: false } }
      });
    } else {
      setCustomConfig({
        roles: template.roles || [],
        scheduleRules: template.schedule || {},
        timeRules: { workdays: [1, 2, 3, 4, 5], workHours: { start: '09:00', end: '18:00' } },
        constraints: { global: { minStaffPerShift: 1, maxStaffPerShift: 10, allowEmptyShift: false } }
      });
    }
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

  const handleSaveConfiguration = () => {
    try {
      const settings = localStorageService.getSettings();
      const updatedSettings = {
        ...settings,
        systemConfiguration: {
          selectedTemplate: selectedTemplate.id,
          customConfig: customConfig,
          createdAt: new Date().toISOString()
        }
      };
      localStorageService.saveSettings(updatedSettings);
      message.success('配置保存成功！您可以开始使用排班系统了。');
      setCurrentStep(3);
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败，请重试。');
    }
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
          ...values,
          id: editData ? editData.id : `role_${Date.now()}`,
          createdAt: editData?.createdAt || new Date().toISOString()
        };

        const updatedRoles = editData 
          ? customConfig.roles.map(r => r.id === editData.id ? newRole : r)
          : [...(customConfig.roles || []), newRole];

        setCustomConfig(prev => ({
          ...prev,
          roles: updatedRoles
        }));
      } else if (type === 'time') {
        setCustomConfig(prev => ({
          ...prev,
          timeRules: {
            ...prev.timeRules,
            ...values
          }
        }));
      } else if (type === 'constraint') {
        setCustomConfig(prev => ({
          ...prev,
          constraints: {
            ...prev.constraints,
            global: values
          }
        }));
      }

      closeModal();
      message.success(editData ? '更新成功' : '添加成功');
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const deleteRole = (roleId) => {
    setCustomConfig(prev => ({
      ...prev,
      roles: prev.roles.filter(r => r.id !== roleId)
    }));
    message.success('删除成功');
  };

  const renderTemplateSelection = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>选择适合您行业的排班模板</Title>
        <Paragraph type="secondary">
          我们为不同行业准备了专业的排班模板，您也可以选择完全自定义配置。
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        {industryTemplates.map(template => (
          <Col xs={24} sm={12} lg={8} key={template.id}>
            <Card
              hoverable
              onClick={() => handleTemplateSelect(template)}
              style={{
                border: selectedTemplate?.id === template.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                cursor: 'pointer'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{template.icon}</div>
                <Title level={5} style={{ margin: 0 }}>{template.name}</Title>
              </div>
              
              <Paragraph type="secondary" style={{ fontSize: 12, textAlign: 'center', margin: '8px 0' }}>
                {template.description}
              </Paragraph>
              
              <div style={{ marginBottom: 12 }}>
                <Text strong>受欢迎度:</Text>
                <Progress percent={template.popularity} size="small" showInfo={false} style={{ marginLeft: 8 }} />
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{template.popularity}%</Text>
              </div>

              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 12 }}>特色功能:</Text>
                <div style={{ marginTop: 4 }}>
                  {template.features.map(feature => (
                    <Tag key={feature} size="small" style={{ marginBottom: 4 }}>{feature}</Tag>
                  ))}
                </div>
              </div>

              {selectedTemplate?.id === template.id && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <Text style={{ marginLeft: 4, color: '#52c41a' }}>已选择</Text>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  const renderConfigurationPanel = () => {
    if (!selectedTemplate) return null;

    return (
      <div>
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>配置 "{selectedTemplate.name}" 模板参数</Title>
          <Paragraph type="secondary">
            根据您的具体需求调整配置参数。您可以添加、编辑或删除角色，调整时间规则和约束条件。
          </Paragraph>
        </div>

        <Collapse defaultActiveKey={['roles', 'time', 'constraints']}>
          <Panel 
            header="角色定义配置" 
            key="roles" 
            extra={
              <Button 
                type="primary" 
                size="small" 
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('role');
                }}
              >
                添加角色
              </Button>
            }
          >
            <List
              dataSource={customConfig.roles || []}
              locale={{ emptyText: '暂无角色，请添加角色' }}
              renderItem={(role) => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      icon={<EditOutlined />}
                      onClick={() => openModal('role', role)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      title="确定删除这个角色吗？"
                      onConfirm={() => deleteRole(role.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="link" danger icon={<DeleteOutlined />}>
                        删除
                      </Button>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div 
                        style={{ 
                          width: 20, 
                          height: 20, 
                          backgroundColor: role.color, 
                          borderRadius: '50%' 
                        }} 
                      />
                    }
                    title={
                      <Space>
                        <Text strong>{role.name}</Text>
                        <Tag color="blue">优先级: {role.priority}</Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <Tag color={role.canWorkAlone ? 'green' : 'orange'}>
                          {role.canWorkAlone ? '可独立值班' : '需搭档值班'}
                        </Tag>
                        <Text type="secondary">最大连续: {role.maxContinuous}天</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Panel>

          <Panel 
            header="时间规则配置" 
            key="time" 
            extra={
              <Button 
                type="primary" 
                size="small" 
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('time', customConfig.timeRules);
                }}
              >
                编辑
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title="工作日设置">
                  <Text>
                    {(customConfig.timeRules?.workdays || [1, 2, 3, 4, 5]).map(day => {
                      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                      return dayNames[day];
                    }).join(', ')}
                  </Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="工作时间">
                  <Text>
                    {customConfig.timeRules?.workHours?.start || '09:00'} - {customConfig.timeRules?.workHours?.end || '18:00'}
                  </Text>
                </Card>
              </Col>
            </Row>
          </Panel>

          <Panel 
            header="约束条件配置" 
            key="constraints" 
            extra={
              <Button 
                type="primary" 
                size="small" 
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openModal('constraint', customConfig.constraints?.global);
                }}
              >
                编辑
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card size="small" title="最少人数">
                  <Text strong style={{ fontSize: 18 }}>
                    {customConfig.constraints?.global?.minStaffPerShift || 1}
                  </Text>
                  <Text type="secondary"> 人/班次</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="最多人数">
                  <Text strong style={{ fontSize: 18 }}>
                    {customConfig.constraints?.global?.maxStaffPerShift || 10}
                  </Text>
                  <Text type="secondary"> 人/班次</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" title="允许空班">
                  <Text strong style={{ fontSize: 18, color: customConfig.constraints?.global?.allowEmptyShift ? '#52c41a' : '#ff4d4f' }}>
                    {customConfig.constraints?.global?.allowEmptyShift ? '是' : '否'}
                  </Text>
                </Card>
              </Col>
            </Row>
          </Panel>
        </Collapse>
      </div>
    );
  };

  const renderPreview = () => (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>配置预览</Title>
        <Alert
          message="配置即将完成"
          description="请仔细检查以下配置，确认无误后点击保存。"
          type="info"
          showIcon
        />
      </div>

      <Card title="模板信息" style={{ marginBottom: 16 }}>
        <Space>
          <span style={{ fontSize: 24 }}>{selectedTemplate.icon}</span>
          <div>
            <Text strong style={{ fontSize: 16 }}>{selectedTemplate.name}</Text>
            <br />
            <Text type="secondary">{selectedTemplate.description}</Text>
          </div>
        </Space>
      </Card>

      <Card title="角色配置">
        <Text>共配置 {customConfig.roles?.length || 0} 个角色</Text>
        <div style={{ marginTop: 8 }}>
          {(customConfig.roles || []).map(role => (
            <Tag key={role.name} color={role.color} style={{ marginBottom: 4 }}>{role.name}</Tag>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderCompletion = () => (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div style={{ fontSize: 64, color: '#52c41a', marginBottom: 24 }}>
        <CheckCircleOutlined />
      </div>
      <Title level={2} style={{ color: '#52c41a' }}>配置完成！</Title>
      <Paragraph style={{ fontSize: 16, marginBottom: 32 }}>
        恭喜您！排班系统配置已完成，您现在可以开始使用了。
      </Paragraph>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderTemplateSelection();
      case 1: return renderConfigurationPanel();
      case 2: return renderPreview();
      case 3: return renderCompletion();
      default: return renderTemplateSelection();
    }
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 32 }}>
          <Title level={3}>
            <RocketOutlined /> 排班系统快速配置向导
          </Title>
          <Paragraph type="secondary">
            欢迎使用通用排班管理系统！我们将引导您快速完成系统配置。
          </Paragraph>
        </div>

        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map(item => (
            <Step key={item.title} title={item.title} description={item.description} icon={item.icon} />
          ))}
        </Steps>

        <div style={{ minHeight: 400 }}>
          {renderStepContent()}
        </div>

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            {currentStep > 0 && currentStep < 3 && (
              <Button onClick={handlePrev}>上一步</Button>
            )}
            
            {currentStep === 0 && selectedTemplate && (
              <Button type="primary" onClick={handleNext}>下一步</Button>
            )}
            
            {currentStep === 1 && (
              <Button type="primary" onClick={handleNext}>下一步</Button>
            )}
            
            {currentStep === 2 && (
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveConfiguration}>
                保存配置
              </Button>
            )}
            
            {currentStep === 3 && (
              <Button type="primary" size="large" icon={<PlayCircleOutlined />} 
                onClick={() => window.location.reload()}>
                开始使用系统
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* 配置编辑模态框 */}
      <Modal
        title={
          modalState.type === 'role' 
            ? (modalState.editData ? '编辑角色' : '添加角色')
            : modalState.type === 'time'
            ? '编辑时间规则'
            : modalState.type === 'constraint'
            ? '编辑约束条件'
            : '编辑配置'
        }
        open={modalState.visible}
        onOk={handleModalSubmit}
        onCancel={closeModal}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          {modalState.type === 'role' && (
            <>
              <Form.Item
                name="name"
                label="角色名称"
                rules={[{ required: true, message: '请输入角色名称' }]}
              >
                <Input placeholder="如：管理人员、技术人员、客服人员等" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="priority"
                    label="优先级"
                    rules={[{ required: true, message: '请设置优先级' }]}
                  >
                    <InputNumber 
                      min={1} 
                      max={10}
                      placeholder="数字越小优先级越高" 
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="color"
                    label="显示颜色"
                    rules={[{ required: true, message: '请选择显示颜色' }]}
                  >
                    <Select placeholder="选择颜色">
                      <Option value="#ff4d4f">红色</Option>
                      <Option value="#1890ff">蓝色</Option>
                      <Option value="#52c41a">绿色</Option>
                      <Option value="#fa8c16">橙色</Option>
                      <Option value="#722ed1">紫色</Option>
                      <Option value="#13c2c2">青色</Option>
                      <Option value="#eb2f96">粉色</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="maxContinuous"
                    label="最大连续天数"
                    rules={[{ required: true, message: '请设置最大连续天数' }]}
                  >
                    <InputNumber 
                      min={1} 
                      max={30}
                      addonAfter="天"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="canWorkAlone"
                    label="允许独立值班"
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {modalState.type === 'time' && (
            <>
              <Form.Item
                name="workdays"
                label="工作日设置"
                rules={[{ required: true, message: '请选择工作日' }]}
              >
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
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name={['workHours', 'start']}
                    label="开始时间"
                    rules={[{ required: true, message: '请设置开始时间' }]}
                  >
                    <Input placeholder="09:00" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={['workHours', 'end']}
                    label="结束时间"
                    rules={[{ required: true, message: '请设置结束时间' }]}
                  >
                    <Input placeholder="18:00" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {modalState.type === 'constraint' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="minStaffPerShift"
                    label="每班次最少人数"
                    rules={[{ required: true, message: '请设置最少人数' }]}
                  >
                    <InputNumber 
                      min={0} 
                      max={50}
                      addonAfter="人"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="maxStaffPerShift"
                    label="每班次最多人数"
                    rules={[{ required: true, message: '请设置最多人数' }]}
                  >
                    <InputNumber 
                      min={1} 
                      max={100}
                      addonAfter="人"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="allowEmptyShift"
                label="允许空班"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default ScheduleTemplateManager; 