import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  message,
  Typography,
  Space,
  Tag,
  Alert,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  TimePicker,
  Row,
  Col,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  ClockCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import hybridStorageService from '../services/hybridStorageService';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ScheduleRules = () => {
  const [rules, setRules] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const rulesData = await hybridStorageService.getScheduleRules() || [];
    const positionsData = await hybridStorageService.getPositions() || [];
    
    setRules(rulesData);
    setPositions(positionsData);
  };

  const saveRules = async (data) => {
    await hybridStorageService.saveScheduleRules(data);
    setRules(data);
  };

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      type: 'weekly',
      pattern: {
        monday: { enabled: true, positions: [] },
        tuesday: { enabled: true, positions: [] },
        wednesday: { enabled: true, positions: [] },
        thursday: { enabled: true, positions: [] },
        friday: { enabled: true, positions: [] },
        saturday: { enabled: false, positions: [] },
        sunday: { enabled: false, positions: [] }
      }
    });
    setIsModalVisible(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    
    // 安全地处理workHours字段
    let workHoursValue = null;
    if (rule.workHours && rule.workHours.start && rule.workHours.end) {
      try {
        // 确保start和end是字符串格式
        const startStr = typeof rule.workHours.start === 'string' ? rule.workHours.start : '09:00';
        const endStr = typeof rule.workHours.end === 'string' ? rule.workHours.end : '18:00';
        
        // 创建dayjs对象数组，这是TimePicker.RangePicker期望的格式
        workHoursValue = [
          dayjs(startStr, 'HH:mm'),
          dayjs(endStr, 'HH:mm')
        ];
      } catch (error) {
        console.warn('解析工作时间失败:', error);
        workHoursValue = null;
      }
    }
    
    // 处理pattern字段 - 转换为表单期望的格式
    let patternValue = [];
    if (rule.pattern) {
      if (rule.pattern.everyDay && rule.pattern.everyDay.enabled) {
        // 每日规则，选择所有日期
        patternValue = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      } else {
        // 周规则，提取启用的日期
        Object.entries(rule.pattern).forEach(([day, config]) => {
          if (config && config.enabled) {
            patternValue.push(day);
          }
        });
      }
    }
    
    // 处理positions字段 - 提取所有启用的岗位
    let positionsValue = [];
    if (rule.pattern) {
      if (rule.pattern.everyDay && rule.pattern.everyDay.enabled) {
        positionsValue = rule.pattern.everyDay.positions || [];
      } else {
        // 获取所有启用的日期中的岗位
        Object.values(rule.pattern).forEach(config => {
          if (config && config.enabled && config.positions) {
            positionsValue = [...positionsValue, ...config.positions];
          }
        });
        // 去重
        positionsValue = [...new Set(positionsValue)];
      }
    }
    
    form.setFieldsValue({
      name: rule.name,
      description: rule.description,
      type: rule.type,
      pattern: patternValue,
      positions: positionsValue,
      workHours: workHoursValue,
      enabled: rule.enabled
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    const newRules = rules.filter(rule => rule.id !== id);
    saveRules(newRules);
    message.success('规则删除成功');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理workHours字段 - TimePicker.RangePicker返回的是dayjs对象数组
      let workHoursValue = null;
      if (values.workHours && Array.isArray(values.workHours) && values.workHours.length === 2) {
        workHoursValue = {
          start: values.workHours[0].format('HH:mm'),
          end: values.workHours[1].format('HH:mm')
        };
      }
      
      // 处理pattern字段 - 将多选格式转换为存储格式
      let patternValue = {};
      if (values.pattern && Array.isArray(values.pattern)) {
        if (values.type === 'daily') {
          // 日规则：所有选中的日期都启用
          patternValue = {
            everyDay: {
              enabled: true,
              positions: values.positions || []
            }
          };
        } else {
          // 周规则：为每个选中的日期创建配置
          const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          dayNames.forEach(day => {
            patternValue[day] = {
              enabled: values.pattern.includes(day),
              positions: values.pattern.includes(day) ? (values.positions || []) : []
            };
          });
        }
      }
      
      const ruleData = {
        name: values.name,
        description: values.description,
        type: values.type,
        pattern: patternValue,
        workHours: workHoursValue,
        enabled: values.enabled
      };

      if (editingRule) {
        const newRules = rules.map(rule => 
          rule.id === editingRule.id ? { ...rule, ...ruleData } : rule
        );
        saveRules(newRules);
        message.success('规则更新成功');
      } else {
        const newRule = {
          ...ruleData,
          id: Date.now().toString(),
          createTime: new Date().toISOString()
        };
        saveRules([...rules, newRule]);
        message.success('规则添加成功');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const generateSchedule = () => {
    try {
      // 检查是否有启用的规则
      const enabledRules = rules.filter(rule => rule.enabled);
      if (enabledRules.length === 0) {
        message.warning('请先启用至少一条轮班规则');
        return;
      }

      // 检查是否有岗位数据
      if (positions.length === 0) {
        message.warning('请先设置岗位数据');
        return;
      }

      // 生成未来30天的排班
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const result = hybridStorageService.generateScheduleByRules(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (result.success) {
        message.success(`排班表生成成功！共生成 ${result.scheduleCount} 条排班记录`);
        // 刷新数据
        loadData();
      } else {
        message.error(result.message || '排班表生成失败');
      }
    } catch (error) {
      console.error('生成排班表失败:', error);
      message.error('排班表生成失败，请检查规则配置');
    }
  };

  const getPositionNames = (positionIds) => {
    if (!positionIds || !Array.isArray(positionIds)) return '未设置';
    
    const positionNames = positionIds.map(id => {
      const position = positions.find(p => p.id === id);
      return position ? position.name : '未知岗位';
    });
    
    return positionNames.join('、');
  };

  const getDayNames = (pattern) => {
    if (!pattern) return '未设置';
    
    const dayNames = {
      monday: '周一', tuesday: '周二', wednesday: '周三', 
      thursday: '周四', friday: '周五', saturday: '周六', sunday: '周日'
    };
    
    if (pattern.everyDay && pattern.everyDay.enabled) {
      return '每日';
    }
    
    const enabledDays = [];
    Object.entries(pattern).forEach(([day, config]) => {
      if (config && config.enabled) {
        enabledDays.push(dayNames[day] || day);
      }
    });
    
    return enabledDays.length > 0 ? enabledDays.join('、') : '未设置';
  };

  const columns = [
    {
      title: '规则名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <ClockCircleOutlined />
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: '规则描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => (
        <Text type="secondary">{text || '无描述'}</Text>
      ),
    },
    {
      title: '规则类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeNames = {
          'weekly': '周规则',
          'daily': '日规则'
        };
        return <Tag color="blue">{typeNames[type] || type}</Tag>;
      },
    },
    {
      title: '应用日期',
      dataIndex: 'pattern',
      key: 'pattern',
      render: (pattern) => (
        <Text>{getDayNames(pattern)}</Text>
      ),
    },
    {
      title: '适用岗位',
      dataIndex: 'pattern',
      key: 'positions',
      render: (pattern) => {
        if (!pattern) return <Text type="secondary">未设置</Text>;
        
        let positionIds = [];
        if (pattern.everyDay && pattern.everyDay.enabled) {
          positionIds = pattern.everyDay.positions || [];
        } else {
          // 获取所有启用的日期中的岗位
          Object.values(pattern).forEach(config => {
            if (config && config.enabled && config.positions) {
              positionIds = [...positionIds, ...config.positions];
            }
          });
        }
        
        return <Text>{getPositionNames([...new Set(positionIds)])}</Text>;
      },
    },
    {
      title: '工作时间',
      key: 'workHours',
      render: (_, record) => {
        const workHours = record.workHours;
        if (!workHours) return <Text type="secondary">未设置</Text>;
        
        return (
          <Space direction="vertical" size="small">
            <Text>上班: {workHours.start}</Text>
            <Text>下班: {workHours.end}</Text>
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此规则吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              size="small" 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      {/* 提示信息 */}
      <Alert
        message="轮班规则说明"
        description="系统已预设了标准工作日、周末值班和夜班巡查规则。这些规则会自动应用到排班生成中。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 规则管理 */}
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <span>轮班规则</span>
            <Text type="secondary">({rules.length}条规则)</Text>
          </Space>
        }
        extra={
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加规则
            </Button>
            <Button 
              icon={<PlayCircleOutlined />}
              onClick={generateSchedule}
              disabled={rules.length === 0}
            >
              查看排班效果
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={rules}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>

      <Modal
        title={editingRule ? '编辑规则' : '添加规则'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSubmit}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="规则描述"
          >
            <TextArea />
          </Form.Item>
          <Form.Item
            name="type"
            label="规则类型"
            rules={[{ required: true, message: '请选择规则类型' }]}
          >
            <Select>
              <Option value="weekly">周规则</Option>
              <Option value="daily">日规则</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="pattern"
            label="应用日期"
            rules={[{ required: true, message: '请选择应用日期' }]}
          >
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="请选择应用日期"
            >
              <Option value="monday">周一</Option>
              <Option value="tuesday">周二</Option>
              <Option value="wednesday">周三</Option>
              <Option value="thursday">周四</Option>
              <Option value="friday">周五</Option>
              <Option value="saturday">周六</Option>
              <Option value="sunday">周日</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="positions"
            label="适用岗位"
            rules={[{ required: true, message: '请选择适用岗位' }]}
          >
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="请选择适用岗位"
            >
              {positions.map(position => (
                <Option key={position.id} value={position.id}>{position.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="workHours"
            label="工作时间"
          >
            <TimePicker.RangePicker />
          </Form.Item>
          <Form.Item
            name="enabled"
            label="状态"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScheduleRules; 