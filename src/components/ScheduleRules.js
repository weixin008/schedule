import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Select,
  Radio,
  DatePicker,
  Table,
  Modal,
  message,
  Typography,
  Row,
  Col,
  Alert,
  Tag,
  Checkbox
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import localStorageService from '../services/localStorageService';

const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ScheduleRules = () => {
  const [rules, setRules] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form] = Form.useForm();

  const weekDays = [
    { label: '周一', value: 1 },
    { label: '周二', value: 2 },
    { label: '周三', value: 3 },
    { label: '周四', value: 4 },
    { label: '周五', value: 5 },
    { label: '周六', value: 6 },
    { label: '周日', value: 0 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const rulesData = localStorageService.getScheduleRules() || [];
    const positionsData = localStorageService.getPositions() || [];
    
    setRules(rulesData);
    setPositions(positionsData);
  };

  const saveRules = (data) => {
    localStorageService.saveScheduleRules(data);
    loadData();
  };

  const handleAddRule = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      rotationType: 'daily',
      workDays: [1, 2, 3, 4, 5] // 默认工作日
    });
    setIsModalVisible(true);
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    form.setFieldsValue({
      ...rule,
      dateRange: [dayjs(rule.startDate), dayjs(rule.endDate)]
    });
    setIsModalVisible(true);
  };

  const handleSubmitRule = async () => {
    try {
      const values = await form.validateFields();
      const { dateRange, ...otherValues } = values;
      
      const ruleData = {
        ...otherValues,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD')
      };
      
      if (editingRule) {
        // 编辑
        const newData = rules.map(item => 
          item.id === editingRule.id 
            ? { ...ruleData, id: editingRule.id }
            : item
        );
        saveRules(newData);
        message.success('规则修改成功');
      } else {
        // 新增
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

  const handleDeleteRule = (id) => {
    const newData = rules.filter(item => item.id !== id);
    saveRules(newData);
    message.success('规则删除成功');
  };

  const generateSchedule = () => {
    Modal.confirm({
      title: '生成排班表',
      content: '确定要根据当前规则生成排班表吗？这将覆盖已有的排班数据。',
      okText: '确定生成',
      cancelText: '取消',
      onOk: () => {
        const schedules = generateScheduleData();
        localStorageService.saveDutySchedules(schedules);
        message.success(`排班表生成成功，共生成 ${schedules.length} 条记录`);
      }
    });
  };

  const generateScheduleData = () => {
    const schedules = [];
    
    console.log('开始生成排班数据:', {
      规则数量: rules.length,
      岗位数量: positions.length,
      规则详情: rules,
      岗位详情: positions
    });
    
    rules.forEach(rule => {
      const position = positions.find(p => p.id === rule.positionId);
      console.log(`处理规则 ${rule.name}:`, {
        规则: rule,
        找到岗位: position,
        岗位人员: position?.assignedPersonnel
      });
      
      if (!position || !position.assignedPersonnel || position.assignedPersonnel.length === 0) {
        console.log(`跳过规则 ${rule.name}: 岗位不存在或无分配人员`);
        return;
      }

      const startDate = dayjs(rule.startDate);
      const endDate = dayjs(rule.endDate);
      
      // 处理编组或普通人员排班
      let assignmentData;
      if (position.enableGrouping && position.groups && position.groups.length > 0) {
        // 使用编组
        assignmentData = position.groups;
      } else {
        // 使用普通人员列表
        assignmentData = position.assignedPersonnel;
      }
      
      let currentIndex = 0;

      for (let date = startDate; date.isBefore(endDate) || date.isSame(endDate); date = date.add(1, 'day')) {
        const dayOfWeek = date.day();
        
        // 检查是否是工作日
        if (!rule.workDays.includes(dayOfWeek)) {
          continue;
        }

        let assignedData;
        
        switch (rule.rotationType) {
          case 'daily':
            // 每日轮换
            assignedData = assignmentData[currentIndex % assignmentData.length];
            currentIndex++;
            break;
            
          case 'weekly':
            // 每周轮换
            const weekNumber = Math.floor(date.diff(startDate, 'day') / 7);
            assignedData = assignmentData[weekNumber % assignmentData.length];
            break;
            
          default:
            assignedData = assignmentData[0];
        }

        // 根据是否编组创建排班记录
        if (position.enableGrouping && position.groups && position.groups.length > 0) {
          // 编组排班：一条记录包含整个组
          schedules.push({
            id: `${rule.id}_${date.format('YYYY-MM-DD')}`,
            date: date.format('YYYY-MM-DD'),
            positionId: rule.positionId,
            positionName: position.name,
            assignedGroupId: assignedData.id,
            assignedGroupName: assignedData.name,
            assignedPersonIds: assignedData.members,
            ruleId: rule.id,
            rotationType: rule.rotationType,
            isGroup: true,
            createTime: new Date().toISOString()
          });
        } else {
          // 普通排班：一条记录一个人
          schedules.push({
            id: `${rule.id}_${date.format('YYYY-MM-DD')}`,
            date: date.format('YYYY-MM-DD'),
            positionId: rule.positionId,
            positionName: position.name,
            assignedPersonId: assignedData,
            ruleId: rule.id,
            rotationType: rule.rotationType,
            isGroup: false,
            createTime: new Date().toISOString()
          });
        }
      }
    });

    console.log('生成排班数据完成:', {
      生成数量: schedules.length,
      排班详情: schedules.slice(0, 5)
    });

    return schedules;
  };

  const getPositionName = (id) => {
    const position = positions.find(p => p.id === id);
    return position ? position.name : '未知岗位';
  };

  const getRotationTypeName = (type) => {
    const types = {
      'daily': '每日轮换',
      'weekly': '每周轮换'
    };
    return types[type] || type;
  };

  const getWorkDaysText = (workDays) => {
    return workDays.map(day => weekDays.find(w => w.value === day)?.label).join('、');
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
      title: '适用岗位',
      dataIndex: 'positionId',
      key: 'positionId',
      render: (positionId) => (
        <Tag color="blue">{getPositionName(positionId)}</Tag>
      ),
    },
    {
      title: '轮班方式',
      dataIndex: 'rotationType',
      key: 'rotationType',
      render: (type) => (
        <Tag color="green">{getRotationTypeName(type)}</Tag>
      ),
    },
    {
      title: '工作日',
      dataIndex: 'workDays',
      key: 'workDays',
      render: (workDays) => (
        <Text>{getWorkDaysText(workDays)}</Text>
      ),
    },
    {
      title: '时间范围',
      key: 'dateRange',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text>{record.startDate}</Text>
          <Text>{record.endDate}</Text>
        </Space>
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
            icon={<EditOutlined />}
            onClick={() => handleEditRule(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteRule(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      {/* 提示信息 */}
      <Alert
        message="轮班规则说明"
        description="1. 每日轮换：每天换一个人值班；2. 每周轮换：一周内同一个人值班，下周换下一个人。"
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
              icon={<PlayCircleOutlined />}
              onClick={generateSchedule}
              disabled={rules.length === 0}
            >
              生成排班表
            </Button>
            <Button 
              type="default" 
              icon={<PlusOutlined />} 
              onClick={handleAddRule}
            >
              添加规则
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

      {/* 添加/编辑规则模态框 */}
      <Modal
        title={editingRule ? '编辑轮班规则' : '添加轮班规则'}
        open={isModalVisible}
        onOk={handleSubmitRule}
        onCancel={() => setIsModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="规则名称"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="如：工作日值班规则、周末值班规则等" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="positionId"
                label="适用岗位"
                rules={[{ required: true, message: '请选择适用岗位' }]}
              >
                <Select placeholder="选择岗位">
                  {positions.map(position => (
                    <Option key={position.id} value={position.id}>
                      {position.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="rotationType"
                label="轮班方式"
                rules={[{ required: true, message: '请选择轮班方式' }]}
              >
                <Radio.Group>
                  <Radio value="daily">每日轮换</Radio>
                  <Radio value="weekly">每周轮换</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>



          <Form.Item
            name="workDays"
            label="工作日"
            rules={[{ required: true, message: '请选择工作日' }]}
          >
            <Checkbox.Group options={weekDays} />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="时间范围"
            rules={[{ required: true, message: '请选择时间范围' }]}
          >
            <RangePicker 
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="规则描述"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="描述此规则的特殊说明（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScheduleRules; 