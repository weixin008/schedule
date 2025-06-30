import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Table,
  Modal,
  Select,
  Tag,
  message,
  Typography,
  Row,
  Col,
  List,
  Popconfirm,
  Transfer,
  Alert,
  Switch,
  InputNumber,
  Divider,
  Empty,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
  DragOutlined,
  CloseOutlined
} from '@ant-design/icons';
import hybridStorageService from '../services/hybridStorageService';

const { Option } = Select;
const { Title, Text } = Typography;

const PositionSetup = () => {
  const [positions, setPositions] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [unassignedPersonnel, setUnassignedPersonnel] = useState([]);
  const [form] = Form.useForm();
  
  // 添加临时分配状态
  const [tempAssignedPersonnel, setTempAssignedPersonnel] = useState([]);

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
  }, []);

  const loadData = async () => {
    const positionsData = await hybridStorageService.getPositions() || [];
    const personnelData = await hybridStorageService.getPersonnel() || [];
    const tagsData = await hybridStorageService.getCustomTags() || [];
    
    setPositions(positionsData);
    setPersonnel(personnelData);
    setCustomTags(tagsData);
  };

  const savePositions = async (data) => {
    await hybridStorageService.savePositions(data);
    await loadData();
  };

  // 添加/编辑岗位
  const handleAddPosition = () => {
    setEditingPosition(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditPosition = (position) => {
    setEditingPosition(position);
    form.setFieldsValue(position);
    setIsModalVisible(true);
  };

  const handleSubmitPosition = async () => {
    try {
      const values = await form.validateFields();
      
               if (editingPosition) {
           // 编辑
           const newData = positions.map(item => 
             item.id === editingPosition.id 
               ? { 
                   ...values, 
                   id: editingPosition.id, 
                   assignedPersonnel: editingPosition.assignedPersonnel || [], 
                   requiredTags: values.requiredTags || [],
                   enableGrouping: values.enableGrouping || false,
                   groupSize: values.groupSize || 1,
                   groups: editingPosition.groups || []
                 }
               : item
           );
        savePositions(newData);
        message.success('岗位修改成功');
      } else {
                 // 新增
         const newPosition = {
           ...values,
           id: Date.now().toString(),
           assignedPersonnel: [],
           requiredTags: values.requiredTags || [],
           enableGrouping: values.enableGrouping || false,
           groupSize: values.groupSize || 1,
           groups: []
         };
        savePositions([...positions, newPosition]);
        message.success('岗位添加成功');
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  const handleDeletePosition = (id) => {
    const newData = positions.filter(item => item.id !== id);
    savePositions(newData);
    message.success('岗位删除成功');
  };

  // 分配人员
  const handleAssignPersonnel = (position) => {
    setSelectedPosition(position);
    // 初始化临时分配状态
    setTempAssignedPersonnel(position.assignedPersonnel || []);
    setIsAssignModalVisible(true);
  };

  // 确认分配人员
  const handleConfirmAssign = () => {
    if (!selectedPosition) return;
    
    // 更新岗位的分配人员
    const newData = positions.map(pos => 
      pos.id === selectedPosition.id ? { ...pos, assignedPersonnel: tempAssignedPersonnel } : pos
    );
    savePositions(newData);
    
    // 关闭模态框
    setIsAssignModalVisible(false);
    setSelectedPosition(null);
    setTempAssignedPersonnel([]);
    
    message.success('人员分配成功');
  };

  // 取消分配
  const handleCancelAssign = () => {
    setIsAssignModalVisible(false);
    setSelectedPosition(null);
    setTempAssignedPersonnel([]);
  };

  // 临时添加人员
  const handleTempAddPerson = (personId) => {
    if (!tempAssignedPersonnel.includes(personId)) {
      setTempAssignedPersonnel([...tempAssignedPersonnel, personId]);
    }
  };

  // 临时移除人员
  const handleTempRemovePerson = (personId) => {
    setTempAssignedPersonnel(tempAssignedPersonnel.filter(id => id !== personId));
  };

  // 临时移动人员
  const handleTempMovePerson = (fromIndex, toIndex) => {
    const newAssigned = [...tempAssignedPersonnel];
    const [movedItem] = newAssigned.splice(fromIndex, 1);
    newAssigned.splice(toIndex, 0, movedItem);
    setTempAssignedPersonnel(newAssigned);
  };

  // 编组管理
  const handleManageGroups = (position) => {
    setSelectedPosition(position);
    // 计算未分组的人员
    const assignedInGroups = position.groups?.flatMap(g => g.members) || [];
    const unassigned = position.assignedPersonnel?.filter(p => !assignedInGroups.includes(p)) || [];
    setUnassignedPersonnel(unassigned);
    setIsGroupModalVisible(true);
  };

  // 自动生成编组
  const generateGroups = (position) => {
    if (!position.assignedPersonnel || position.assignedPersonnel.length === 0) {
      message.warning('请先分配人员');
      return;
    }

    const groupSize = position.groupSize || 1;
    const personnel = position.assignedPersonnel;
    const groups = [];

    for (let i = 0; i < personnel.length; i += groupSize) {
      const group = {
        id: `group_${Date.now()}_${i / groupSize + 1}`,
        order: i / groupSize + 1,
        members: personnel.slice(i, i + groupSize)
      };
      groups.push(group);
    }

    const newData = positions.map(pos => 
      pos.id === position.id ? { ...pos, groups } : pos
    );
    savePositions(newData);
    setSelectedPosition({ ...position, groups });
    setUnassignedPersonnel([]);
    message.success(`已生成 ${groups.length} 个编组`);
  };

  // 创建新编组
  const createNewGroup = () => {
    if (unassignedPersonnel.length === 0) {
      message.warning('没有可分配的人员');
      return;
    }

    const newGroup = {
      id: `group_${Date.now()}`,
      order: (selectedPosition.groups?.length || 0) + 1,
      members: []
    };

    const newGroups = [...(selectedPosition.groups || []), newGroup];
    const newData = positions.map(pos => 
      pos.id === selectedPosition.id ? { ...pos, groups: newGroups } : pos
    );
    savePositions(newData);
    setSelectedPosition({ ...selectedPosition, groups: newGroups });
  };

  // 删除编组
  const deleteGroup = (groupId) => {
    const group = selectedPosition.groups.find(g => g.id === groupId);
    if (!group) return;

    // 将组员回到未分配列表
    const newUnassigned = [...unassignedPersonnel, ...group.members];
    setUnassignedPersonnel(newUnassigned);

    // 删除编组并重新排序
    const newGroups = selectedPosition.groups
      .filter(g => g.id !== groupId)
      .map((g, index) => ({ ...g, order: index + 1 }));

    const newData = positions.map(pos => 
      pos.id === selectedPosition.id ? { ...pos, groups: newGroups } : pos
    );
    savePositions(newData);
    setSelectedPosition({ ...selectedPosition, groups: newGroups });
  };

  // 添加人员到编组
  const addPersonToGroup = (groupId, personId) => {
    const group = selectedPosition.groups.find(g => g.id === groupId);
    if (group.members.length >= selectedPosition.groupSize) {
      message.warning(`每组最多${selectedPosition.groupSize}人`);
      return;
    }

    const newGroups = selectedPosition.groups.map(g => 
      g.id === groupId ? { ...g, members: [...g.members, personId] } : g
    );
    
    setUnassignedPersonnel(unassignedPersonnel.filter(p => p !== personId));
    
    const newData = positions.map(pos => 
      pos.id === selectedPosition.id ? { ...pos, groups: newGroups } : pos
    );
    savePositions(newData);
    setSelectedPosition({ ...selectedPosition, groups: newGroups });
  };

  // 从编组移除人员
  const removePersonFromGroup = (groupId, personId) => {
    const newGroups = selectedPosition.groups.map(g => 
      g.id === groupId ? { ...g, members: g.members.filter(m => m !== personId) } : g
    );
    
    setUnassignedPersonnel([...unassignedPersonnel, personId]);
    
    const newData = positions.map(pos => 
      pos.id === selectedPosition.id ? { ...pos, groups: newGroups } : pos
    );
    savePositions(newData);
    setSelectedPosition({ ...selectedPosition, groups: newGroups });
  };

  // 调整编组顺序
  const moveGroup = (fromIndex, toIndex) => {
    const newGroups = [...selectedPosition.groups];
    const [movedGroup] = newGroups.splice(fromIndex, 1);
    newGroups.splice(toIndex, 0, movedGroup);
    
    // 重新分配order
    const reorderedGroups = newGroups.map((g, index) => ({ ...g, order: index + 1 }));
    
    const newData = positions.map(pos => 
      pos.id === selectedPosition.id ? { ...pos, groups: reorderedGroups } : pos
    );
    savePositions(newData);
    setSelectedPosition({ ...selectedPosition, groups: reorderedGroups });
  };

  // 调整人员顺序
  const movePersonnel = (positionId, fromIndex, toIndex) => {
    const newData = positions.map(position => {
      if (position.id === positionId) {
        const newAssigned = [...position.assignedPersonnel];
        const [removed] = newAssigned.splice(fromIndex, 1);
        newAssigned.splice(toIndex, 0, removed);
        return { ...position, assignedPersonnel: newAssigned };
      }
      return position;
    });
    savePositions(newData);
  };

  // 获取人员姓名
  const getPersonnelName = (id) => {
    const person = personnel.find(p => p.id === id);
    return person ? person.name : '未知';
  };

  // 获取人员标签
  const getPersonnelTag = (id) => {
    const person = personnel.find(p => p.id === id);
    return person ? person.tag : '';
  };

  // 获取人员状态
  const getPersonnelStatus = (id) => {
    const person = personnel.find(p => p.id === id);
    return person ? person.status : '';
  };

  // 过滤可用人员（根据岗位要求的标签）
  const getAvailablePersonnel = (requiredTags) => {
    return personnel.filter(person => {
      const personDisplayTag = tagMapping[person.tag] || person.tag;
      
      // 显示所有对应标签的人员，不限制状态
      return requiredTags.includes('全部') || 
             requiredTags.includes(person.tag) || 
             requiredTags.includes(personDisplayTag);
    });
  };

  const positionColumns = [
    {
      title: '岗位名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <TeamOutlined />
          <strong>{text}</strong>
        </Space>
      ),
    },
         {
       title: '要求标签',
       dataIndex: 'requiredTags',
       key: 'requiredTags',
       render: (tags) => (
         <Space wrap>
           {tags && tags.map(tag => {
             const displayTag = tagMapping[tag] || tag;
             const colors = {
               '领导': 'red',
               '职工': 'blue',
               '监督员': 'green',
               '中层': 'orange',
               '全部': 'purple'
             };
             return (
               <Tag key={tag} color={colors[displayTag] || 'default'}>
                 {displayTag}
               </Tag>
             );
           })}
         </Space>
       ),
     },
         {
       title: '已分配人员',
       dataIndex: 'assignedPersonnel',
       key: 'assignedPersonnel',
       render: (assigned, record) => (
         <div>
           <Space wrap style={{ marginBottom: '8px' }}>
             {assigned && assigned.length > 0 ? (
               assigned.map((personId, index) => (
                 <Tag key={personId} color="processing">
                   {index + 1}. {getPersonnelName(personId)}
                 </Tag>
               ))
             ) : (
               <Text type="secondary">未分配</Text>
             )}
           </Space>
           {record.enableGrouping && (
             <div style={{ marginTop: '4px' }}>
               <Tag color="purple" size="small">
                 {record.groups?.length || 0} 个编组 (每组{record.groupSize}人)
               </Tag>
             </div>
           )}
         </div>
       ),
     },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
             title: '操作',
       key: 'action',
       width: 280,
       render: (_, record) => (
         <Space size="small" wrap>
           <Button 
             type="link" 
             icon={<SettingOutlined />}
             onClick={() => handleAssignPersonnel(record)}
           >
             分配人员
           </Button>
           {record.enableGrouping && (
             <Button 
               type="link" 
               icon={<TeamOutlined />}
               onClick={() => handleManageGroups(record)}
             >
               编组管理
             </Button>
           )}
           <Button 
             type="link" 
             icon={<EditOutlined />}
             onClick={() => handleEditPosition(record)}
           >
             编辑
           </Button>
           <Popconfirm
             title="确定删除此岗位吗？"
             onConfirm={() => handleDeletePosition(record.id)}
             okText="确定"
             cancelText="取消"
           >
             <Button type="link" danger icon={<DeleteOutlined />}>
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
        message="岗位设置说明"
        description="1. 先设置岗位（如：带班领导、值班员等）；2. 为每个岗位分配人员；3. 调整人员顺序，系统将按此顺序进行排班轮换。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 岗位管理 */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>岗位管理</span>
            <Text type="secondary">({positions.length}个岗位)</Text>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPosition}>
            添加岗位
          </Button>
        }
      >
        <Table
          columns={positionColumns}
          dataSource={positions}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>

      {/* 人员排班顺序 */}
      {positions.length > 0 && (
        <Card title="人员排班顺序" style={{ marginTop: '24px' }}>
          <Row gutter={[16, 16]}>
            {positions.map(position => (
              <Col key={position.id} span={12}>
                <Card 
                  size="small" 
                  title={position.name}
                  extra={
                    <Button 
                      size="small" 
                      type="link" 
                      onClick={() => handleAssignPersonnel(position)}
                    >
                      调整
                    </Button>
                  }
                >
                  <List
                    size="small"
                    dataSource={position.assignedPersonnel || []}
                    renderItem={(personId, index) => (
                      <List.Item
                        actions={[
                          <Button
                            size="small"
                            type="text"
                            icon={<ArrowUpOutlined />}
                            disabled={index === 0}
                            onClick={() => movePersonnel(position.id, index, index - 1)}
                          />,
                          <Button
                            size="small"
                            type="text"
                            icon={<ArrowDownOutlined />}
                            disabled={index === (position.assignedPersonnel || []).length - 1}
                            onClick={() => movePersonnel(position.id, index, index + 1)}
                          />
                        ]}
                      >
                        <Space>
                          <Text strong>{index + 1}.</Text>
                          <span>{getPersonnelName(personId)}</span>
                          <Tag size="small" color={(() => {
                            const tag = getPersonnelTag(personId);
                            const displayTag = tagMapping[tag] || tag;
                            const colors = {
                              '领导': 'red',
                              '职工': 'blue',
                              '监督员': 'green',
                              '中层': 'orange'
                            };
                            return colors[displayTag] || 'default';
                          })()}>
                            {tagMapping[getPersonnelTag(personId)] || getPersonnelTag(personId)}
                          </Tag>
                          <Tag size="small" color={(() => {
                            const displayStatus = statusMapping[getPersonnelStatus(personId)] || getPersonnelStatus(personId);
                            const colors = {
                              '在岗': 'green',
                              '请假': 'orange',
                              '出差': 'blue',
                              '公出': 'cyan',
                              '病假': 'red',
                              '调休': 'purple',
                              '离职': 'default'
                            };
                            return colors[displayStatus] || 'default';
                          })()}>
                            {statusMapping[getPersonnelStatus(personId)] || getPersonnelStatus(personId)}
                          </Tag>
                        </Space>
                      </List.Item>
                    )}
                    locale={{ emptyText: '暂无分配人员' }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* 添加/编辑岗位模态框 */}
      <Modal
        title={editingPosition ? '编辑岗位' : '添加岗位'}
        open={isModalVisible}
        onOk={handleSubmitPosition}
        onCancel={() => setIsModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="岗位名称"
            rules={[{ required: true, message: '请输入岗位名称' }]}
          >
            <Input placeholder="如：带班领导、值班员、巡逻员等" />
          </Form.Item>
          
                     <Form.Item
             name="requiredTags"
             label="要求标签"
             rules={[{ required: true, message: '请选择要求标签' }]}
           >
             <Select 
               mode="multiple"
               placeholder="选择此岗位要求的人员标签（可多选）"
               maxTagCount="responsive"
             >
               <Option value="全部">全部</Option>
               {Object.entries(tagMapping).map(([key, value]) => (
                 <Option key={key} value={key}>{value}</Option>
               ))}
             </Select>
           </Form.Item>
          
                     <Divider>编组设置</Divider>
           
           <Form.Item
             name="enableGrouping"
             label="启用编组"
             valuePropName="checked"
           >
             <Switch 
               checkedChildren="启用" 
               unCheckedChildren="禁用"
               onChange={(checked) => {
                 if (!checked) {
                   form.setFieldsValue({ groupSize: 1 });
                 }
               }}
             />
           </Form.Item>

           <Form.Item
             noStyle
             shouldUpdate={(prevValues, currentValues) =>
               prevValues.enableGrouping !== currentValues.enableGrouping
             }
           >
             {({ getFieldValue }) =>
               getFieldValue('enableGrouping') ? (
                 <Form.Item
                   name="groupSize"
                   label="每组人数"
                   rules={[{ required: true, message: '请设置每组人数' }]}
                 >
                   <InputNumber 
                     min={1} 
                     max={10} 
                     placeholder="每组人数"
                     addonAfter="人"
                   />
                 </Form.Item>
               ) : null
             }
           </Form.Item>

           <Form.Item
             name="description"
             label="岗位描述"
           >
             <Input.TextArea 
               rows={3} 
               placeholder="描述岗位职责和要求（可选）"
               maxLength={200}
               showCount
             />
           </Form.Item>
        </Form>
      </Modal>

      {/* 分配人员模态框 */}
      <Modal
        title={`分配人员 - ${selectedPosition?.name}`}
        open={isAssignModalVisible}
        onCancel={handleCancelAssign}
        footer={[
          <Button key="confirm" type="primary" onClick={handleConfirmAssign}>
            确认分配
          </Button>,
          <Button key="cancel" onClick={handleCancelAssign}>
            取消
          </Button>
        ]}
        width={1000}
      >
        {selectedPosition && (
          <div>
            <Alert
              message="人员分配"
              description={`为岗位"${selectedPosition.name}"分配人员。系统会根据岗位要求的标签筛选可用人员。`}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Row gutter={[16, 16]}>
              {/* 可选人员 */}
              <Col span={12}>
                <Card 
                  size="small" 
                  title={
                    <Space>
                      <span>可选人员</span>
                      <Text type="secondary">
                        ({getAvailablePersonnel(selectedPosition.requiredTags || []).length}人)
                      </Text>
                    </Space>
                  }
                  style={{ height: '500px', overflow: 'auto' }}
                >
                  {getAvailablePersonnel(selectedPosition.requiredTags || []).map(person => (
                    <Card
                      key={person.id}
                      size="small"
                      style={{ 
                        marginBottom: '8px',
                        cursor: 'pointer',
                        border: tempAssignedPersonnel.includes(person.id) ? '2px solid #1890ff' : '1px solid #d9d9d9'
                      }}
                      onClick={() => {
                        if (tempAssignedPersonnel.includes(person.id)) {
                          // 移除
                          handleTempRemovePerson(person.id);
                        } else {
                          // 添加
                          handleTempAddPerson(person.id);
                        }
                      }}
                    >
                      <Row gutter={[8, 8]}>
                        <Col span={24}>
                          <Space>
                            <Text strong>{person.name}</Text>
                            <Tag size="small" color={(() => {
                              const displayTag = tagMapping[person.tag] || person.tag;
                              const colors = {
                                '领导': 'red',
                                '职工': 'blue',
                                '监督员': 'green',
                                '中层': 'orange'
                              };
                              return colors[displayTag] || 'default';
                            })()}>
                              {tagMapping[person.tag] || person.tag}
                            </Tag>
                            <Tag size="small" color={(() => {
                              const displayStatus = statusMapping[person.status] || person.status;
                              const colors = {
                                '在岗': 'green',
                                '请假': 'orange',
                                '出差': 'blue',
                                '公出': 'cyan',
                                '病假': 'red',
                                '调休': 'purple',
                                '离职': 'default'
                              };
                              return colors[displayStatus] || 'default';
                            })()}>
                              {statusMapping[person.status] || person.status}
                            </Tag>
                          </Space>
                        </Col>
                        <Col span={24}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            电话: {person.phone || '未设置'}
                          </Text>
                        </Col>
                        {person.remarks && (
                          <Col span={24}>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              备注: {person.remarks}
                            </Text>
                          </Col>
                        )}
                        {tempAssignedPersonnel.includes(person.id) && (
                          <Col span={24}>
                            <Tag color="blue" size="small">已分配</Tag>
                          </Col>
                        )}
                      </Row>
                    </Card>
                  ))}
                  {getAvailablePersonnel(selectedPosition.requiredTags || []).length === 0 && (
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="没有符合条件的人员"
                      style={{ marginTop: '100px' }}
                    />
                  )}
                </Card>
              </Col>

              {/* 已分配人员 */}
              <Col span={12}>
                <Card 
                  size="small" 
                  title={
                    <Space>
                      <span>已分配人员</span>
                      <Text type="secondary">
                        ({tempAssignedPersonnel.length}人)
                      </Text>
                    </Space>
                  }
                  style={{ height: '500px', overflow: 'auto' }}
                >
                  {tempAssignedPersonnel.length > 0 ? (
                    tempAssignedPersonnel.map((personId, index) => {
                      const person = personnel.find(p => p.id === personId);
                      if (!person) return null;
                      
                      return (
                        <Card
                          key={personId}
                          size="small"
                          style={{ 
                            marginBottom: '8px',
                            border: '2px solid #1890ff',
                            backgroundColor: '#f0f8ff'
                          }}
                        >
                          <Row gutter={[8, 8]}>
                            <Col span={24}>
                              <Space>
                                <Text strong>{index + 1}. {person.name}</Text>
                                <Tag size="small" color={(() => {
                                  const displayTag = tagMapping[person.tag] || person.tag;
                                  const colors = {
                                    '领导': 'red',
                                    '职工': 'blue',
                                    '监督员': 'green',
                                    '中层': 'orange'
                                  };
                                  return colors[displayTag] || 'default';
                                })()}>
                                  {tagMapping[person.tag] || person.tag}
                                </Tag>
                                <Tag size="small" color={(() => {
                                  const displayStatus = statusMapping[person.status] || person.status;
                                  const colors = {
                                    '在岗': 'green',
                                    '请假': 'orange',
                                    '出差': 'blue',
                                    '公出': 'cyan',
                                    '病假': 'red',
                                    '调休': 'purple',
                                    '离职': 'default'
                                  };
                                  return colors[displayStatus] || 'default';
                                })()}>
                                  {statusMapping[person.status] || person.status}
                                </Tag>
                              </Space>
                            </Col>
                            <Col span={24}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                电话: {person.phone || '未设置'}
                              </Text>
                            </Col>
                            {person.remarks && (
                              <Col span={24}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  备注: {person.remarks}
                                </Text>
                              </Col>
                            )}
                            <Col span={24}>
                              <Space>
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<ArrowUpOutlined />}
                                  disabled={index === 0}
                                  onClick={() => handleTempMovePerson(index, index - 1)}
                                >
                                  上移
                                </Button>
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<ArrowDownOutlined />}
                                  disabled={index === tempAssignedPersonnel.length - 1}
                                  onClick={() => handleTempMovePerson(index, index + 1)}
                                >
                                  下移
                                </Button>
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleTempRemovePerson(personId)}
                                >
                                  移除
                                </Button>
                              </Space>
                            </Col>
                          </Row>
                        </Card>
                      );
                    })
                  ) : (
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无分配人员"
                      style={{ marginTop: '100px' }}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* 编组管理模态框 */}
      <Modal
        title={`编组管理 - ${selectedPosition?.name}`}
        open={isGroupModalVisible}
        onCancel={() => setIsGroupModalVisible(false)}
        footer={[
          <Button key="create" type="primary" onClick={createNewGroup}>
            添加编组
          </Button>,
          <Button key="auto" onClick={() => generateGroups(selectedPosition)}>
            自动生成
          </Button>,
          <Button key="close" onClick={() => setIsGroupModalVisible(false)}>
            完成
          </Button>
        ]}
        width={800}
      >
        {selectedPosition && (
          <div>
            <Alert
              message="编组管理"
              description={`每组最多${selectedPosition.groupSize}人。拖拽人员到编组中，或点击人员/编组进行操作。编组顺序决定轮班顺序。`}
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <Row gutter={[16, 16]}>
              {/* 未分配人员区域 */}
              <Col span={8}>
                <Card 
                  size="small" 
                  title="未分配人员"
                  style={{ minHeight: '300px' }}
                >
                  {unassignedPersonnel.length > 0 ? (
                    unassignedPersonnel.map(personId => (
                      <Tag
                        key={personId}
                        color="default"
                        style={{ 
                          margin: '4px',
                          cursor: 'pointer',
                          display: 'block',
                          marginBottom: '8px',
                          padding: '4px 8px'
                        }}
                        onClick={() => {
                          // 可以点击快速分配到第一个有空位的组
                          const availableGroup = selectedPosition.groups?.find(g => 
                            g.members.length < selectedPosition.groupSize
                          );
                          if (availableGroup) {
                            addPersonToGroup(availableGroup.id, personId);
                          } else {
                            message.info('请先创建编组或现有编组已满');
                          }
                        }}
                      >
                        <Space>
                          <span>{getPersonnelName(personId)}</span>
                          <Tag size="small" color={(() => {
                            const tag = getPersonnelTag(personId);
                            const displayTag = tagMapping[tag] || tag;
                            const colors = {
                              '领导': 'red',
                              '职工': 'blue',
                              '监督员': 'green',
                              '中层': 'orange'
                            };
                            return colors[displayTag] || 'default';
                          })()}>
                            {tagMapping[getPersonnelTag(personId)] || getPersonnelTag(personId)}
                          </Tag>
                        </Space>
                      </Tag>
                    ))
                  ) : (
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无未分配人员"
                      style={{ marginTop: '40px' }}
                    />
                  )}
                </Card>
              </Col>

              {/* 编组区域 */}
              <Col span={16}>
                {selectedPosition.groups && selectedPosition.groups.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {selectedPosition.groups
                      .sort((a, b) => a.order - b.order)
                      .map((group, index) => (
                        <Col key={group.id} span={12}>
                          <Card 
                            size="small" 
                            title={
                              <Space>
                                <span>第{group.order}组</span>
                                <Text type="secondary">({group.members.length}/{selectedPosition.groupSize})</Text>
                              </Space>
                            }
                            extra={
                              <Space>
                                {index > 0 && (
                                  <Tooltip title="向前移动">
                                    <Button 
                                      type="text" 
                                      size="small"
                                      icon={<ArrowUpOutlined />}
                                      onClick={() => moveGroup(index, index - 1)}
                                    />
                                  </Tooltip>
                                )}
                                {index < selectedPosition.groups.length - 1 && (
                                  <Tooltip title="向后移动">
                                    <Button 
                                      type="text" 
                                      size="small"
                                      icon={<ArrowDownOutlined />}
                                      onClick={() => moveGroup(index, index + 1)}
                                    />
                                  </Tooltip>
                                )}
                                <Tooltip title="删除编组">
                                  <Button 
                                    type="text" 
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => deleteGroup(group.id)}
                                  />
                                </Tooltip>
                              </Space>
                            }
                            style={{ minHeight: '200px' }}
                          >
                            {group.members.length > 0 ? (
                              group.members.map((personId, memberIndex) => (
                                <Tag
                                  key={personId}
                                  color="processing"
                                  closable
                                  onClose={() => removePersonFromGroup(group.id, personId)}
                                  style={{ 
                                    margin: '4px',
                                    display: 'block',
                                    marginBottom: '8px',
                                    padding: '4px 8px'
                                  }}
                                >
                                  <Space>
                                    <span>{memberIndex + 1}. {getPersonnelName(personId)}</span>
                                    <Tag size="small" color={(() => {
                                      const tag = getPersonnelTag(personId);
                                      const displayTag = tagMapping[tag] || tag;
                                      const colors = {
                                        '领导': 'red',
                                        '职工': 'blue',
                                        '监督员': 'green',
                                        '中层': 'orange'
                                      };
                                      return colors[displayTag] || 'default';
                                    })()}>
                                      {tagMapping[getPersonnelTag(personId)] || getPersonnelTag(personId)}
                                    </Tag>
                                  </Space>
                                </Tag>
                              ))
                            ) : (
                              <div style={{ 
                                textAlign: 'center', 
                                color: '#999', 
                                padding: '40px 0',
                                border: '2px dashed #d9d9d9',
                                borderRadius: '6px'
                              }}>
                                点击左侧人员<br />添加到此组
                              </div>
                            )}
                            
                            {/* 添加人员按钮 */}
                            {group.members.length < selectedPosition.groupSize && unassignedPersonnel.length > 0 && (
                              <div style={{ marginTop: '8px', textAlign: 'center' }}>
                                <Button 
                                  type="dashed" 
                                  size="small"
                                  icon={<PlusOutlined />}
                                  onClick={() => {
                                    if (unassignedPersonnel.length > 0) {
                                      addPersonToGroup(group.id, unassignedPersonnel[0]);
                                    }
                                  }}
                                >
                                  添加人员
                                </Button>
                              </div>
                            )}
                          </Card>
                        </Col>
                      ))}
                  </Row>
                ) : (
                  <Card style={{ textAlign: 'center', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div>
                      <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="暂无编组"
                      />
                      <Space style={{ marginTop: '16px' }}>
                        <Button type="primary" onClick={createNewGroup}>
                          创建编组
                        </Button>
                        <Button onClick={() => generateGroups(selectedPosition)}>
                          自动生成
                        </Button>
                      </Space>
                    </div>
                  </Card>
                )}
              </Col>
            </Row>
          </div>
        )}
      </Modal>


     </div>
   );
 };
 
 export default PositionSetup; 