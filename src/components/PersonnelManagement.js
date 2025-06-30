import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Divider,
  DatePicker,
  Tabs,
  Badge,
  List,
  Alert,
  Tooltip
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import hybridStorageService from '../services/hybridStorageService';

// 扩展 dayjs 插件
dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PersonnelManagement = () => {
  const [personnel, setPersonnel] = useState([]);
  const [customTags, setCustomTags] = useState(['领导', '职工', '中层']);
  const [statusList] = useState(['在岗', '请假', '出差', '公出', '病假', '调休', '离职']);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();
  const [conflicts, setConflicts] = useState([]);
  const [activeTab, setActiveTab] = useState('personnel');

  // 标签映射（英文到中文）
  const tagMapping = {
    'leader_tag': '领导',
    'staff_tag': '职工',
    'supervisor_tag': '监督员',
    'middle_tag': '中层'
  };

  // 状态映射（英文到中文）
  const statusMapping = {
    'active': '在岗',
    'on_duty': '在岗',
    'leave': '请假',
    'business_trip': '出差',
    'official_business': '公出',
    'sick_leave': '病假',
    'time_off': '调休',
    'resigned': '离职'
  };

  // 状态颜色映射
  const statusColorMapping = {
    '在岗': 'green',
    '请假': 'orange',
    '出差': 'blue',
    '公出': 'cyan',
    '病假': 'red',
    '调休': 'purple',
    '离职': 'default'
  };

  useEffect(() => {
    loadData();
    checkConflicts();
  }, []);

  const loadData = async () => {
    const data = await hybridStorageService.getPersonnel();
    const tags = await hybridStorageService.getCustomTags();
    
    // 检查并修复人员状态问题
    const hasInvalidStatus = data.some(person => 
      !person.status || !['在岗', '请假', '出差', '公出', '病假', '调休', '离职'].includes(person.status)
    );
    
    if (hasInvalidStatus) {
      console.log('发现无效状态，正在修复...');
      const fixedData = data.map(person => {
        // 如果状态为空或无效，设置为"在岗"
        if (!person.status || !['在岗', '请假', '出差', '公出', '病假', '调休', '离职'].includes(person.status)) {
          return { ...person, status: '在岗' };
        }
        return person;
      });
      await hybridStorageService.savePersonnel(fixedData);
      setPersonnel(fixedData);
    } else {
      setPersonnel(data);
    }
    
    setCustomTags(tags);
    
    // 检查并修复标签显示问题
    const hasInvalidTags = data.some(person => 
      person.tag && !tagMapping[person.tag] && !['领导', '职工', '监督员', '中层'].includes(person.tag)
    );
    
    if (hasInvalidTags) {
      console.log('发现无效标签，正在修复...');
      const fixedData = data.map(person => {
        if (person.tag && !tagMapping[person.tag] && !['领导', '职工', '监督员', '中层'].includes(person.tag)) {
          // 将无效标签转换为默认标签
          return { ...person, tag: 'staff_tag' };
        }
        return person;
      });
      await hybridStorageService.savePersonnel(fixedData);
      setPersonnel(fixedData);
    }
  };

  const saveData = async (data) => {
    await hybridStorageService.savePersonnel(data);
    setPersonnel(data);
  };

  // 检查排班冲突
  const checkConflicts = async () => {
    const schedules = await hybridStorageService.getDutySchedules();
    const personnelData = await hybridStorageService.getPersonnel();
    const conflictList = [];

    schedules.forEach(schedule => {
      const scheduleDate = dayjs(schedule.date);
      
      if (schedule.isGroup) {
        // 检查编组成员状态
        schedule.assignedPersonIds?.forEach(personId => {
          const person = personnelData.find(p => p.id === personId);
          if (person && isPersonUnavailable(person, scheduleDate)) {
            conflictList.push({
              id: `${schedule.id}_${personId}`,
              type: 'group',
              date: schedule.date,
              positionName: schedule.positionName,
              personName: person.name,
              personStatus: person.status,
              statusPeriod: person.statusPeriod,
              scheduleId: schedule.id,
              personId: personId
            });
          }
        });
      } else {
        // 检查个人值班状态
        const person = personnelData.find(p => p.id === schedule.assignedPersonId);
        if (person && isPersonUnavailable(person, scheduleDate)) {
          conflictList.push({
            id: `${schedule.id}_${person.id}`,
            type: 'individual',
            date: schedule.date,
            positionName: schedule.positionName,
            personName: person.name,
            personStatus: person.status,
            statusPeriod: person.statusPeriod,
            scheduleId: schedule.id,
            personId: person.id
          });
        }
      }
    });

    setConflicts(conflictList);
  };

  // 判断人员在指定日期是否不可用
  const isPersonUnavailable = (person, date) => {
    if (person.status === '在岗') return false;
    if (!person.statusPeriod) return person.status !== '在岗';
    
    const startDate = dayjs(person.statusPeriod.start);
    const endDate = dayjs(person.statusPeriod.end);
    return date.isBetween(startDate, endDate, 'day', '[]');
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    // 设置默认状态为"在岗"
    form.setFieldsValue({
      status: '在岗'
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id) => {
    const newData = personnel.filter(item => item.id !== id);
    saveData(newData);
    message.success('删除成功');
    checkConflicts();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingId) {
        const newData = personnel.map(item => 
          item.id === editingId ? { ...item, ...values, updateTime: new Date().toISOString() } : item
        );
        saveData(newData);
        message.success('更新成功');
      } else {
        const newPerson = {
          id: Date.now().toString(),
          ...values,
          createTime: new Date().toISOString(),
          updateTime: new Date().toISOString()
        };
        saveData([...personnel, newPerson]);
        message.success('添加成功');
      }
      
      setIsModalVisible(false);
      checkConflicts();
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 状态管理
  const handleManageStatus = (person) => {
    setEditingPersonId(person.id);
    statusForm.setFieldsValue({
      status: person.status,
      statusPeriod: person.statusPeriod ? [
        dayjs(person.statusPeriod.start),
        dayjs(person.statusPeriod.end)
      ] : null,
      statusReason: person.statusReason || ''
    });
    setIsStatusModalVisible(true);
  };

  const handleStatusSubmit = async () => {
    try {
      const values = await statusForm.validateFields();
      
      const updatedPerson = {
        status: values.status,
        statusPeriod: values.statusPeriod ? {
          start: values.statusPeriod[0].format('YYYY-MM-DD'),
          end: values.statusPeriod[1].format('YYYY-MM-DD')
        } : null,
        statusReason: values.statusReason,
        statusUpdateTime: new Date().toISOString()
      };

      const newData = personnel.map(item => 
        item.id === editingPersonId ? { ...item, ...updatedPerson } : item
      );
      
      saveData(newData);
      setIsStatusModalVisible(false);
      message.success('状态更新成功');
      checkConflicts();
    } catch (error) {
      console.error('状态更新失败:', error);
    }
  };

  // 查看人员排班
  const handleViewSchedule = async (person) => {
    const schedules = await hybridStorageService.getDutySchedules();
    const personSchedules = schedules.filter(schedule => 
      schedule.assignedPersonId === person.id || 
      (schedule.assignedPersonIds && schedule.assignedPersonIds.includes(person.id))
    );

    if (personSchedules.length === 0) {
      message.info(`${person.name} 暂无排班安排`);
      return;
    }

    // 按日期排序
    const sortedSchedules = personSchedules.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 显示排班信息
    const scheduleInfo = sortedSchedules.map(schedule => 
      `${schedule.date} (${dayjs(schedule.date).format('dddd')}): ${schedule.positionName || '值班'}`
    ).join('\n');

    Modal.info({
      title: `${person.name} 的排班安排`,
      content: (
        <div>
          <p>共 {personSchedules.length} 次排班：</p>
          <pre style={{ 
            maxHeight: '300px', 
            overflow: 'auto', 
            backgroundColor: '#f5f5f5', 
            padding: '12px',
            borderRadius: '4px'
          }}>
            {scheduleInfo}
          </pre>
        </div>
      ),
      width: 500,
      okText: '确定'
    });
  };

  // 替班处理
  const handleSubstitute = (conflict) => {
    Modal.confirm({
      title: '安排替班',
      content: `${conflict.personName} 在 ${conflict.date} 无法值班（${conflict.personStatus}），需要安排替班人员。`,
      okText: '选择替班人员',
      cancelText: '取消',
      onOk: () => {
        showSubstituteModal(conflict);
      }
    });
  };

  // 显示替班选择模态框
  const showSubstituteModal = (conflict) => {
    // 获取可替班的人员（相同标签且状态正常）
    const originalPerson = personnel.find(p => p.id === conflict.personId);
    const availableSubstitutes = personnel.filter(person => {
      // 排除原值班人员
      if (person.id === conflict.personId) return false;
      
      // 检查状态是否可用
      if (!isPersonAvailable(person, dayjs(conflict.date))) return false;
      
      // 优先选择相同标签的人员
      return person.tag === originalPerson?.tag;
    });

    // 如果没有相同标签的，扩展到所有可用人员
    const allAvailableSubstitutes = availableSubstitutes.length > 0 ? availableSubstitutes : 
      personnel.filter(person => {
        if (person.id === conflict.personId) return false;
        return isPersonAvailable(person, dayjs(conflict.date));
      });

    if (allAvailableSubstitutes.length === 0) {
      Modal.warning({
        title: '无可用替班人员',
        content: `${conflict.date} 没有可用的替班人员。请检查其他人员的状态。`
      });
      return;
    }

    Modal.confirm({
      title: '选择替班人员',
      width: 600,
      content: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Text strong>原值班人员：</Text>{conflict.personName} - {conflict.positionName}
            <br />
            <Text strong>值班日期：</Text>{conflict.date}
            <br />
            <Text strong>无法值班原因：</Text>{conflict.personStatus}
            {conflict.statusPeriod && (
              <>
                <br />
                <Text strong>状态期间：</Text>{conflict.statusPeriod.start} 至 {conflict.statusPeriod.end}
              </>
            )}
          </div>
          
          <Divider />
          
          <div>
            <Text strong>可选替班人员：</Text>
            <List
              size="small"
              dataSource={allAvailableSubstitutes}
              renderItem={(person, index) => (
                <List.Item 
                  key={person.id}
                  style={{ 
                    cursor: 'pointer',
                    padding: '8px 12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    backgroundColor: person.tag === originalPerson?.tag ? '#f6ffed' : '#fafafa'
                  }}
                  onClick={() => confirmSubstitute(conflict, person)}
                >
                  <Space>
                    <UserOutlined />
                    <span>{person.name}</span>
                    <Tag color={person.tag === originalPerson?.tag ? 'green' : 'blue'}>
                      {person.tag}
                    </Tag>
                    {person.tag === originalPerson?.tag && (
                      <Tag color="success">推荐</Tag>
                    )}
                    <Text type="secondary">{person.phone}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </div>
          
          <Alert
            message="替班说明"
            description={
              <div>
                • 绿色背景为推荐人员（相同标签）<br />
                • 点击人员姓名确认替班安排<br />
                • 替班生效后会自动更新排班表
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </div>
      ),
      footer: null, // 不显示默认按钮，通过点击人员来操作
    });
  };

  // 确认替班安排
  const confirmSubstitute = (conflict, substitutePerson) => {
    Modal.confirm({
      title: '确认替班安排',
      content: (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <Text strong>{conflict.personName}</Text> → <Text strong style={{ color: '#52c41a' }}>{substitutePerson.name}</Text>
          </div>
          <div>
            <Text type="secondary">
              {conflict.date} {conflict.positionName} 值班
            </Text>
          </div>
        </div>
      ),
      okText: '确认替班',
      cancelText: '取消',
      onOk: () => {
        executeSubstitute(conflict, substitutePerson);
      }
    });
  };

  // 执行替班操作
  const executeSubstitute = async (conflict, substitutePerson) => {
    try {
      // 创建替班记录
      const substituteRecord = {
        originalPersonId: conflict.personId,
        originalPersonName: conflict.personName,
        substitutePersonId: substitutePerson.id,
        substitutePersonName: substitutePerson.name,
        scheduleId: conflict.scheduleId,
        scheduleDate: conflict.date,
        positionName: conflict.positionName,
        reason: `${conflict.personName}${conflict.personStatus}，由${substitutePerson.name}替班`,
        type: conflict.type, // 'individual' or 'group'
        conflictId: conflict.id
      };

      // 保存替班记录
      const savedRecord = await hybridStorageService.addSubstituteRecordSimple(substituteRecord);

      // 更新排班表
      const schedules = await hybridStorageService.getDutySchedules();
      const scheduleIndex = schedules.findIndex(s => s.id === conflict.scheduleId);
      
      if (scheduleIndex !== -1) {
        if (conflict.type === 'individual') {
          // 个人值班替换
          schedules[scheduleIndex].assignedPersonId = substitutePerson.id;
          schedules[scheduleIndex].originalPersonId = conflict.personId;
          schedules[scheduleIndex].isSubstituted = true;
          schedules[scheduleIndex].substituteRecordId = savedRecord.id;
        } else if (conflict.type === 'group') {
          // 编组值班替换
          const memberIndex = schedules[scheduleIndex].assignedPersonIds.indexOf(conflict.personId);
          if (memberIndex !== -1) {
            schedules[scheduleIndex].assignedPersonIds[memberIndex] = substitutePerson.id;
            schedules[scheduleIndex].substitutedMembers = schedules[scheduleIndex].substitutedMembers || [];
            schedules[scheduleIndex].substitutedMembers.push({
              original: conflict.personId,
              substitute: substitutePerson.id,
              recordId: savedRecord.id
            });
          }
        }

        await hybridStorageService.saveDutySchedules(schedules);
      }

      // 标记冲突为已解决
      await hybridStorageService.resolveConflict(conflict.id, {
        method: 'substitute',
        substitutePersonId: substitutePerson.id,
        substitutePersonName: substitutePerson.name,
        executeTime: new Date().toISOString()
      });

      message.success(`替班安排成功！${substitutePerson.name} 将替换 ${conflict.personName} 在 ${conflict.date} 值班`);
      
      // 重新检查冲突
      await checkConflicts();
      
      // 关闭所有模态框
      Modal.destroyAll();
      
    } catch (error) {
      console.error('替班操作失败:', error);
      message.error('替班安排失败，请重试');
    }
  };

  // 检查人员在指定日期是否可用（简化版本）
  const isPersonAvailable = (person, date) => {
    if (person.status === '在岗') return true;
    if (!person.statusPeriod) return person.status === '在岗';
    
    const startDate = dayjs(person.statusPeriod.start);
    const endDate = dayjs(person.statusPeriod.end);
    return !date.isBetween(startDate, endDate, 'day', '[]');
  };

  const handleAddCustomTag = async () => {
    if (!newTagInput.trim()) {
      message.warning('请输入标签名称');
      return;
    }
    if (customTags.includes(newTagInput.trim())) {
      message.warning('标签已存在');
      return;
    }
    const newTags = [...customTags, newTagInput.trim()];
    setCustomTags(newTags);
    await hybridStorageService.saveCustomTags(newTags);
    setNewTagInput('');
    message.success('标签添加成功');
  };

  const handleDeleteTag = async (tagToDelete) => {
    if (customTags.length <= 1) {
      message.warning('至少需要保留一个标签');
      return;
    }
    
    const isUsed = personnel.some(person => person.tag === tagToDelete);
    if (isUsed) {
      message.warning('该标签正在使用中，无法删除');
      return;
    }
    
    const newTags = customTags.filter(tag => tag !== tagToDelete);
    setCustomTags(newTags);
    await hybridStorageService.saveCustomTags(newTags);
    message.success('标签删除成功');
  };

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (text) => (
        <Space>
          <UserOutlined />
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tag',
      key: 'tag',
      width: 80,
      render: (tag) => {
        // 将英文标签转换为中文显示
        const displayTag = tagMapping[tag] || tag;
        const colors = {
          '领导': 'red',
          '职工': 'blue', 
          '监督员': 'green',
          '中层': 'orange'
        };
        return (
          <Tag color={colors[displayTag] || 'default'}>
            {displayTag}
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        // 将英文状态转换为中文显示
        const displayStatus = statusMapping[status] || status;
        
        const statusInfo = (
          <div>
            <Tag color={statusColorMapping[displayStatus] || 'default'}>
              {displayStatus}
            </Tag>
            {record.statusPeriod && displayStatus !== '在岗' && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                {dayjs(record.statusPeriod.start).format('MM/DD')} - {dayjs(record.statusPeriod.end).format('MM/DD')}
              </div>
            )}
          </div>
        );

        return record.statusReason ? (
          <Tooltip title={`原因：${record.statusReason}`}>
            {statusInfo}
          </Tooltip>
        ) : statusInfo;
      },
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      ellipsis: true,
    },
    {
      title: '备注',
      dataIndex: 'remarks',
      key: 'remarks',
      width: 150,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
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
          <Button 
            type="link" 
            size="small"
            icon={<ClockCircleOutlined />}
            onClick={() => handleManageStatus(record)}
          >
            状态
          </Button>
          <Button 
            type="link" 
            size="small"
            icon={<CalendarOutlined />}
            onClick={() => handleViewSchedule(record)}
          >
            排班
          </Button>
          <Popconfirm
            title="确定删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const getStatistics = () => {
    const tagStats = {};
    const statusStats = {};
    
    personnel.forEach(person => {
      const displayTag = tagMapping[person.tag] || person.tag;
      const displayStatus = statusMapping[person.status] || person.status;
      tagStats[displayTag] = (tagStats[displayTag] || 0) + 1;
      statusStats[displayStatus] = (statusStats[displayStatus] || 0) + 1;
    });
    
    return { tagStats, statusStats };
  };

  const { tagStats, statusStats } = getStatistics();

  return (
    <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card size="small">
            <Title level={5}>人员统计</Title>
            <Space wrap>
              {Object.entries(tagStats).map(([tag, count]) => (
                <Tag key={tag} color={tag === '领导' ? 'red' : tag === '职工' ? 'blue' : tag === '监督员' ? 'green' : 'orange'}>
                  {tag}: {count}人
                </Tag>
              ))}
              <Tag color="purple">总计: {personnel.length}人</Tag>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Title level={5}>状态统计</Title>
            <Space wrap>
              {Object.entries(statusStats).map(([status, count]) => (
                <Tag key={status} color={statusColorMapping[status] || 'default'}>
                  {status}: {count}人
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Title level={5}>
              <Badge count={conflicts.length} offset={[10, 0]}>
                排班冲突
              </Badge>
            </Title>
            {conflicts.length > 0 ? (
              <Text type="danger">
                发现 {conflicts.length} 个排班冲突，需要处理
              </Text>
            ) : (
              <Text type="success">无排班冲突</Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'personnel',
              label: <span><UserOutlined />人员管理</span>,
              children: (
                <>
                  <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                      添加人员
                    </Button>
                  </div>
                  
                  <Table
                    columns={columns}
                    dataSource={personnel}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                    scroll={{ x: 800 }}
                  />
                </>
              )
            },
            {
              key: 'conflicts',
              label: (
                <span>
                  <ExclamationCircleOutlined />
                  排班冲突 
                  {conflicts.length > 0 && <Badge count={conflicts.length} size="small" />}
                </span>
              ),
              children: (
                <>
                  {conflicts.length > 0 ? (
                    <List
                      itemLayout="horizontal"
                      dataSource={conflicts}
                      renderItem={(conflict) => (
                        <List.Item
                          actions={[
                            <Button 
                              type="primary" 
                              size="small"
                              icon={<SwapOutlined />}
                              onClick={() => handleSubstitute(conflict)}
                            >
                              安排替班
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            avatar={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                            title={
                              <Space>
                                <Text strong>{conflict.personName}</Text>
                                <Tag color="blue">{conflict.positionName}</Tag>
                                <Tag color="red">{conflict.date}</Tag>
                              </Space>
                            }
                            description={
                              <div>
                                <div>状态：{conflict.personStatus}</div>
                                {conflict.statusPeriod && (
                                  <div>
                                    期间：{conflict.statusPeriod.start} 至 {conflict.statusPeriod.end}
                                  </div>
                                )}
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Alert
                      message="无排班冲突"
                      description="当前所有排班安排与人员状态无冲突"
                      type="success"
                      showIcon
                    />
                  )}
                </>
              )
            },
            {
              key: 'tags',
              label: <span><TagOutlined />标签管理</span>,
              children: (
                <>
                  <Space wrap style={{ marginBottom: '12px' }}>
                    <Text strong>当前标签：</Text>
                    {Object.entries(tagMapping).map(([key, value]) => (
                      <Tag
                        key={key}
                        color={value === '领导' ? 'red' : value === '职工' ? 'blue' : value === '监督员' ? 'green' : 'orange'}
                      >
                        {value}
                      </Tag>
                    ))}
                  </Space>
                  <Divider />
                  <Alert
                    message="标签说明"
                    description="系统预设了四种人员标签：领导、职工、监督员、中层。这些标签用于区分不同的人员类型和权限。"
                    type="info"
                    showIcon
                  />
                </>
              )
            }
          ]}
        />
      </Card>

      {/* 添加/编辑人员模态框 */}
      <Modal
        title={editingId ? '编辑人员' : '添加人员'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tag"
                label="标签"
                rules={[{ required: true, message: '请选择标签' }]}
              >
                <Select placeholder="请选择标签">
                  {Object.entries(tagMapping).map(([key, value]) => (
                    <Option key={key} value={key}>{value}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="联系电话"
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="初始状态"
                initialValue="在岗"
              >
                <Select>
                  {statusList.map(status => (
                    <Option key={status} value={status}>{status}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="remarks"
            label="备注"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入备注信息（可选）" 
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 状态管理模态框 */}
      <Modal
        title="人员状态管理"
        open={isStatusModalVisible}
        onOk={handleStatusSubmit}
        onCancel={() => setIsStatusModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item
            name="status"
            label="当前状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              {statusList.map(status => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="statusPeriod"
            label="状态时间段"
            help="选择该状态的生效时间段（可选）"
          >
            <RangePicker 
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
            />
          </Form.Item>

          <Form.Item
            name="statusReason"
            label="状态说明"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入状态变更原因或说明" 
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Alert
            message="提示"
            description="状态变更后，系统会自动检查是否存在排班冲突，如有冲突会在冲突页面中显示。"
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default PersonnelManagement; 