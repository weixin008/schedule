import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Select, 
  Button, 
  message, 
  Row, 
  Col, 
  Space,
  Divider,
  Typography,
  Switch,
  InputNumber,
  Transfer,
  Tag,
  Alert,
  Steps,
  Tabs
} from 'antd';
import { 
  SaveOutlined,
  SettingOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import localStorageService from '../services/localStorageService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const ScheduleRulesManagement = () => {
  const [form] = Form.useForm();
  const [employees, setEmployees] = useState([]);
  const [currentRules, setCurrentRules] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const employeesData = localStorageService.getEmployees();
    const settings = localStorageService.getSettings();
    
    setEmployees(employeesData);
    setCurrentRules(settings?.scheduleRules || getDefaultRules());
    
    // 设置表单初始值
    if (settings?.scheduleRules) {
      form.setFieldsValue(settings.scheduleRules);
    }
  };

  const getDefaultRules = () => ({
    // 基础设置
    enabled: true,
    
    // 领导轮换规则
    leaderRotation: {
      enabled: true,
      mode: 'daily', // daily, weekly, fixed
      personnel: [], // 按顺序排班的领导ID列表
      workdays: true, // 工作日值班
      weekends: true, // 周末值班
    },
    
    // 职工轮换规则  
    staffRotation: {
      enabled: true,
      weekdayMode: 'daily', // 周一到周四：每日轮换
      weekendMode: 'continuous_three', // 周五到周日：连班三天
      personnel: [], // 按顺序排班的职工ID列表
    },
    
    // 考勤监督员规则
    supervisionRules: {
      enabled: true,
      workdaysOnly: true, // 仅工作日
      rotationMode: 'weekly', // 每周轮换编组
      groups: [], // 编组列表，每组包含2人
    },
    
    // 全局约束
    constraints: {
      maxContinuousDays: 7,
      minRestDays: 1,
      respectLeaveStatus: true, // 尊重请假/出差状态
      allowManualOverride: true, // 允许手动调整
    }
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // 验证规则完整性
      const validation = validateRules(values);
      if (!validation.valid) {
        message.error(validation.message);
        return;
      }

      // 保存到设置中
      const settings = localStorageService.getSettings();
      const updatedSettings = {
        ...settings,
        scheduleRules: values
      };
      
      localStorageService.saveSettings(updatedSettings);
      setCurrentRules(values);
      message.success('排班规则保存成功！');
      
    } catch (error) {
      message.error('保存失败，请检查配置');
    } finally {
      setLoading(false);
    }
  };

  const validateRules = (rules) => {
    // 检查领导人员配置
    if (rules.leaderRotation.enabled && rules.leaderRotation.personnel.length === 0) {
      return { valid: false, message: '请配置领导轮换人员' };
    }
    
    // 检查职工人员配置
    if (rules.staffRotation.enabled && rules.staffRotation.personnel.length === 0) {
      return { valid: false, message: '请配置职工轮换人员' };
    }
    
    // 检查监督员编组配置
    if (rules.supervisionRules.enabled) {
      if (rules.supervisionRules.groups.length === 0) {
        return { valid: false, message: '请配置考勤监督员编组' };
      }
      
      // 检查每个编组是否有2人
      for (let group of rules.supervisionRules.groups) {
        if (group.members.length !== 2) {
          return { valid: false, message: `编组"${group.name}"必须包含2名成员` };
        }
      }
    }
    
    return { valid: true };
  };

  // 获取不同角色的员工
  const getEmployeesByRole = (role) => {
    return employees.filter(emp => 
      emp.status === 'active' && 
      emp.tags && 
      emp.tags.includes(`${role}_tag`)
    );
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? emp.name : '未知员工';
  };

  // 转换员工数据为Transfer组件格式
  const getTransferData = (roleEmployees) => {
    return roleEmployees.map(emp => ({
      key: emp.id,
      title: `${emp.name} (${emp.employeeId})`,
      description: emp.department
    }));
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>
            <SettingOutlined /> 排班规则配置
          </Title>
          <Text type="secondary">
            一次配置，长期使用。设置完成后可通过"排班计划"一键生成具体排班表。
          </Text>
        </div>

        <Alert
          message="配置说明"
          description="本页面配置的是排班的规则和逻辑，包括人员轮换方式、时间安排等。配置完成后，系统将根据这些规则自动生成排班计划。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          initialValues={getDefaultRules()}
        >
          <Tabs defaultActiveKey="leader">
            {/* 领导值班规则 */}
            <TabPane 
              tab={<span><TeamOutlined />领导值班规则</span>} 
              key="leader"
            >
              <Card size="small" title="领导轮换配置">
                <Form.Item name={['leaderRotation', 'enabled']} valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  <span style={{ marginLeft: 8 }}>启用领导值班轮换</span>
                </Form.Item>

                <Form.Item
                  label="轮换模式"
                  name={['leaderRotation', 'mode']}
                >
                  <Select>
                    <Option value="daily">每日轮换</Option>
                    <Option value="weekly">每周轮换</Option>
                    <Option value="fixed">固定安排</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  label="参与人员"
                  name={['leaderRotation', 'personnel']}
                  tooltip="按列表顺序轮换值班，可拖拽调整顺序"
                >
                  <Select
                    mode="multiple"
                    placeholder="选择参与轮换的领导"
                    style={{ width: '100%' }}
                  >
                    {getEmployeesByRole('leader').map(emp => (
                      <Option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name={['leaderRotation', 'workdays']} valuePropName="checked">
                      <Switch />
                      <span style={{ marginLeft: 8 }}>工作日值班</span>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['leaderRotation', 'weekends']} valuePropName="checked">
                      <Switch />
                      <span style={{ marginLeft: 8 }}>周末值班</span>
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </TabPane>

            {/* 职工值班规则 */}
            <TabPane 
              tab={<span><ClockCircleOutlined />职工值班规则</span>} 
              key="staff"
            >
              <Card size="small" title="职工轮换配置">
                <Form.Item name={['staffRotation', 'enabled']} valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  <span style={{ marginLeft: 8 }}>启用职工值班轮换</span>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="周一至周四模式"
                      name={['staffRotation', 'weekdayMode']}
                    >
                      <Select>
                        <Option value="daily">每日轮换（一人一天）</Option>
                        <Option value="weekly">每周轮换</Option>
                        <Option value="fixed">固定安排</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="周五至周日模式"
                      name={['staffRotation', 'weekendMode']}
                    >
                      <Select>
                        <Option value="continuous_three">连班三天</Option>
                        <Option value="daily">每日轮换</Option>
                        <Option value="weekly">每周轮换</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="参与人员"
                  name={['staffRotation', 'personnel']}
                  tooltip="按列表顺序轮换值班"
                >
                  <Select
                    mode="multiple"
                    placeholder="选择参与轮换的职工"
                    style={{ width: '100%' }}
                  >
                    {getEmployeesByRole('staff').map(emp => (
                      <Option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Card>
            </TabPane>

            {/* 考勤监督员规则 */}
            <TabPane 
              tab={<span><CalendarOutlined />监督员规则</span>} 
              key="supervision"
            >
              <Card size="small" title="考勤监督员配置">
                <Form.Item name={['supervisionRules', 'enabled']} valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
                  <span style={{ marginLeft: 8 }}>启用考勤监督员</span>
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name={['supervisionRules', 'workdaysOnly']} valuePropName="checked">
                      <Switch defaultChecked />
                      <span style={{ marginLeft: 8 }}>仅工作日安排</span>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="轮换模式"
                      name={['supervisionRules', 'rotationMode']}
                    >
                      <Select>
                        <Option value="weekly">每周轮换编组</Option>
                        <Option value="monthly">每月轮换编组</Option>
                        <Option value="fixed">固定编组</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="监督员编组"
                  name={['supervisionRules', 'groups']}
                  tooltip="每个编组固定2人，按编组顺序轮换"
                >
                  <SupervisorGroupSelector 
                    employees={getEmployeesByRole('supervisor')}
                    value={form.getFieldValue(['supervisionRules', 'groups']) || []}
                    onChange={(groups) => {
                      form.setFieldsValue({
                        supervisionRules: {
                          ...form.getFieldValue('supervisionRules'),
                          groups
                        }
                      });
                    }}
                  />
                </Form.Item>
              </Card>
            </TabPane>
          </Tabs>

          <Divider />

          <Row justify="center">
            <Space size="large">
              <Button 
                type="primary" 
                size="large"
                icon={<SaveOutlined />}
                loading={loading}
                onClick={handleSave}
              >
                保存排班规则
              </Button>
              <Button 
                size="large"
                onClick={() => form.resetFields()}
              >
                重置配置
              </Button>
            </Space>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

// 监督员编组选择器组件
const SupervisorGroupSelector = ({ employees, value = [], onChange }) => {
  const [groups, setGroups] = useState(value);

  const addGroup = () => {
    const newGroup = {
      id: Date.now().toString(),
      name: `编组${groups.length + 1}`,
      members: []
    };
    const newGroups = [...groups, newGroup];
    setGroups(newGroups);
    onChange(newGroups);
  };

  const updateGroup = (groupId, field, val) => {
    const newGroups = groups.map(g => 
      g.id === groupId ? { ...g, [field]: val } : g
    );
    setGroups(newGroups);
    onChange(newGroups);
  };

  const removeGroup = (groupId) => {
    const newGroups = groups.filter(g => g.id !== groupId);
    setGroups(newGroups);
    onChange(newGroups);
  };

  return (
    <div>
      {groups.map((group, index) => (
        <Card 
          key={group.id} 
          size="small" 
          title={`编组 ${index + 1}`}
          style={{ marginBottom: 8 }}
          extra={
            <Button 
              type="text" 
              danger 
              size="small"
              onClick={() => removeGroup(group.id)}
            >
              删除
            </Button>
          }
        >
          <Select
            mode="multiple"
            placeholder="选择2名监督员"
            style={{ width: '100%' }}
            value={group.members}
            onChange={(members) => updateGroup(group.id, 'members', members)}
            maxTagCount={2}
          >
            {employees.map(emp => (
              <Option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeId})
              </Option>
            ))}
          </Select>
          {group.members.length !== 2 && (
            <Text type="warning" style={{ fontSize: 12 }}>
              请选择固定2名成员
            </Text>
          )}
        </Card>
      ))}
      
      <Button 
        type="dashed" 
        onClick={addGroup}
        style={{ width: '100%' }}
        disabled={employees.length < 2}
      >
        + 添加编组
      </Button>
      
      {employees.length < 2 && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          需要至少2名具有监督员标签的员工才能创建编组
        </Text>
      )}
    </div>
  );
};

export default ScheduleRulesManagement; 