import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Calendar,
  Badge,
  Typography,
  List,
  Tag,
  Space,
  Divider,
  Alert,
  Timeline,
  Empty,
  Button,
  Tooltip,
  Modal,
  Select,
  message
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  SwapOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DashboardOutlined,
  TrophyOutlined,
  FireOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import hybridStorageService from '../services/hybridStorageService';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const [personnel, setPersonnel] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [positions, setPositions] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [substitutes, setSubstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [substituteModalVisible, setSubstituteModalVisible] = useState(false);
  const [currentConflict, setCurrentConflict] = useState(null);
  const [selectedSubstitute, setSelectedSubstitute] = useState(null);
  const [currentDate, setCurrentDate] = useState(dayjs());

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

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 每30秒刷新一次
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const personnelData = await hybridStorageService.getPersonnel();
      const schedulesData = await hybridStorageService.getDutySchedules();
      const positionsData = await hybridStorageService.getPositions();
      
      // 自动检测冲突
      await hybridStorageService.detectScheduleConflicts();
      const conflictsData = await hybridStorageService.getConflictRecords();
      const substitutesData = await hybridStorageService.getSubstituteRecordsSimple();

      setPersonnel(personnelData);
      setSchedules(schedulesData);
      setPositions(positionsData);
      setConflicts(conflictsData.filter(c => c.status === 'pending'));
      setSubstitutes(substitutesData);
      setLoading(false);
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
      setLoading(false);
    }
  };

  // 获取今日值班信息
  const getTodaySchedules = () => {
    const today = dayjs().format('YYYY-MM-DD');
    return schedules.filter(s => s.date === today);
  };

  // 获取本周值班统计
  const getWeeklyStats = () => {
    const startOfWeek = dayjs().startOf('week');
    const endOfWeek = dayjs().endOf('week');
    
    const weeklySchedules = schedules.filter(s => {
      const scheduleDate = dayjs(s.date);
      return scheduleDate.isBetween(startOfWeek, endOfWeek, 'day', '[]');
    });

    return {
      total: weeklySchedules.length,
      completed: weeklySchedules.filter(s => dayjs(s.date).isBefore(dayjs(), 'day')).length,
      substituted: weeklySchedules.filter(s => s.isSubstituted).length
    };
  };

  // 获取人员状态统计
  const getPersonnelStats = () => {
    const stats = {
      total: personnel.length,
      active: 0,
      unavailable: 0,
      byTag: {},
      byStatus: {}
    };

    personnel.forEach(person => {
      // 标签统计（使用中文显示）
      const displayTag = tagMapping[person.tag] || person.tag;
      stats.byTag[displayTag] = (stats.byTag[displayTag] || 0) + 1;
      
      // 状态统计（使用中文显示）
      const displayStatus = statusMapping[person.status] || person.status;
      stats.byStatus[displayStatus] = (stats.byStatus[displayStatus] || 0) + 1;
      
      // 可用性统计
      if (isPersonCurrentlyAvailable(person)) {
        stats.active++;
      } else {
        stats.unavailable++;
      }
    });

    return stats;
  };

  // 检查人员当前是否可用
  const isPersonCurrentlyAvailable = (person) => {
    if (person.status === '在岗') return true;
    if (!person.statusPeriod) return person.status === '在岗';
    
    const today = dayjs();
    const startDate = dayjs(person.statusPeriod.start);
    const endDate = dayjs(person.statusPeriod.end);
    return !today.isBetween(startDate, endDate, 'day', '[]');
  };

  // 获取最近的替班记录（包含冲突信息）
  const getRecentSubstitutesWithConflicts = () => {
    // 获取所有冲突记录（包括已解决的）
    const allConflicts = hybridStorageService.getConflictRecords();
    
    // 合并替班记录和冲突记录
    const allRecords = [];
    
    // 1. 添加已处理的替班记录
    substitutes.forEach(substitute => {
      const relatedConflict = allConflicts.find(c => 
        c.scheduleId === substitute.scheduleId && 
        c.personId === substitute.originalPersonId
      );
      
      allRecords.push({
        id: substitute.id,
        type: 'substitute',
        originalPersonName: substitute.originalPersonName,
        substitutePersonName: substitute.substitutePersonName,
        scheduleDate: substitute.scheduleDate,
        positionName: substitute.positionName,
        reason: substitute.reason,
        createTime: substitute.createTime,
        isResolved: true,
        hasConflict: !!relatedConflict,
        conflictReason: relatedConflict?.reason || substitute.reason,
        scheduleId: substitute.scheduleId,
        originalPersonId: substitute.originalPersonId
      });
    });
    
    // 2. 添加未处理的冲突记录
    conflicts.forEach(conflict => {
      // 检查是否已有对应的替班记录
      const hasSubstitute = substitutes.some(s => 
        s.scheduleId === conflict.scheduleId && 
        s.originalPersonId === conflict.personId
      );
      
      if (!hasSubstitute) {
        allRecords.push({
          id: conflict.id,
          type: 'conflict',
          originalPersonName: conflict.personName,
          substitutePersonName: null,
          scheduleDate: conflict.date,
          positionName: conflict.positionName,
          reason: conflict.reason,
          createTime: conflict.createTime,
          isResolved: false,
          hasConflict: true,
          conflictReason: conflict.reason,
          scheduleId: conflict.scheduleId,
          originalPersonId: conflict.personId
        });
      }
    });
    
    // 按创建时间排序并取前5条
    return allRecords
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      .slice(0, 5);
  };

  // 获取值班频率统计
  const getDutyFrequency = () => {
    const frequency = {};
    
    schedules.forEach(schedule => {
      if (schedule.isGroup) {
        schedule.assignedPersonIds?.forEach(personId => {
          frequency[personId] = (frequency[personId] || 0) + 1;
        });
      } else {
        const personId = schedule.assignedPersonId;
        frequency[personId] = (frequency[personId] || 0) + 1;
      }
    });

    return Object.entries(frequency)
      .map(([personId, count]) => {
        const person = personnel.find(p => p.id === personId);
        return {
          personId,
          personName: person?.name || '未知',
          personTag: person?.tag || '',
          displayTag: tagMapping[person?.tag] || person?.tag || '',
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const todaySchedules = getTodaySchedules();
  const weeklyStats = getWeeklyStats();
  const personnelStats = getPersonnelStats();
  const recentSubstitutesWithConflicts = getRecentSubstitutesWithConflicts();
  const dutyFrequency = getDutyFrequency();

  // 小日历数据渲染 - 优化显示人员名字
  const dateCellRender = (value) => {
    const dateStr = value.format('YYYY-MM-DD');
    const daySchedules = schedules.filter(s => s.date === dateStr);
    
    if (daySchedules.length === 0) return null;

    return (
      <div style={{ fontSize: '10px', lineHeight: '12px' }}>
        {daySchedules.map((schedule, index) => {
          let names = '';
          if (schedule.isGroup) {
            names = schedule.assignedPersonIds?.map(id => {
              const person = personnel.find(p => p.id === id);
              return person?.name;
            }).filter(Boolean).join('、') || '';
          } else {
            const person = personnel.find(p => p.id === schedule.assignedPersonId);
            names = person?.name || '';
          }
          
          return (
            <div 
              key={index} 
              style={{ 
                color: schedule.isSubstituted ? '#fa8c16' : '#1890ff',
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <Tooltip title={`${positions.find(p => p.id === schedule.positionId)?.name || '值班'}: ${names}`}>
                {names}
              </Tooltip>
            </div>
          );
        })}
      </div>
    );
  };

  const dutyFrequencyColumns = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => (
        <Space>
          {index < 3 && <TrophyOutlined style={{ color: ['#ffd700', '#c0c0c0', '#cd7f32'][index] }} />}
          <span>{index + 1}</span>
        </Space>
      )
    },
    {
      title: '姓名',
      dataIndex: 'personName',
      key: 'personName',
      render: (name, record) => (
        <Space>
          <UserOutlined />
          <span>{name}</span>
          <Tag size="small" color={record.displayTag === '领导' ? 'red' : record.displayTag === '职工' ? 'blue' : record.displayTag === '监督员' ? 'green' : 'orange'}>
            {record.displayTag}
          </Tag>
        </Space>
      )
    },
    {
      title: '值班次数',
      dataIndex: 'count',
      key: 'count',
      render: (count) => (
        <Space>
          <Text strong>{count}</Text>
          <Text type="secondary">次</Text>
        </Space>
      )
    }
  ];

  // 处理日期选择
  const handleDateSelect = (date) => {
    setCurrentDate(date);
    // 可以在这里添加日期选择后的逻辑，比如显示该日期的排班详情
  };

  // 处理替班点击
  const handleSubstituteClick = (record) => {
    if (record.type === 'conflict') {
      // 如果是冲突记录，显示替班选择模态框
      setCurrentConflict(record);
      setSubstituteModalVisible(true);
    }
  };

  // 获取可用的替班人员
  const getAvailableSubstitutes = (conflictRecord) => {
    if (!conflictRecord) return [];
    
    const conflictDate = dayjs(conflictRecord.scheduleDate);
    return personnel.filter(person => {
      // 排除冲突人员自己
      if (person.id === conflictRecord.originalPersonId) return false;
      
      // 检查人员是否可用
      if (person.status !== '在岗') {
        if (!person.statusPeriod) return false;
        
        const startDate = dayjs(person.statusPeriod.start);
        const endDate = dayjs(person.statusPeriod.end);
        if (conflictDate.isBetween(startDate, endDate, 'day', '[]')) return false;
      }
      
      return true;
    });
  };

  // 确认替班
  const handleConfirmSubstitute = () => {
    if (!currentConflict || !selectedSubstitute) {
      message.warning('请选择替班人员');
      return;
    }

    try {
      // 创建替班记录
      const substituteRecord = {
        originalPersonId: currentConflict.originalPersonId,
        originalPersonName: currentConflict.originalPersonName,
        substitutePersonId: selectedSubstitute,
        substitutePersonName: personnel.find(p => p.id === selectedSubstitute)?.name,
        scheduleId: currentConflict.scheduleId,
        scheduleDate: currentConflict.scheduleDate,
        positionName: currentConflict.positionName,
        reason: `${currentConflict.originalPersonName}${currentConflict.conflictReason}，由${personnel.find(p => p.id === selectedSubstitute)?.name}替班`,
        type: 'individual' // 简化处理，都按个人替班处理
      };

      // 保存替班记录
      hybridStorageService.addSubstituteRecordSimple(substituteRecord);

      // 更新排班表
      const schedules = hybridStorageService.getDutySchedules();
      const scheduleIndex = schedules.findIndex(s => s.id === currentConflict.scheduleId);
      
      if (scheduleIndex !== -1) {
        schedules[scheduleIndex].assignedPersonId = selectedSubstitute;
        schedules[scheduleIndex].originalPersonId = currentConflict.originalPersonId;
        schedules[scheduleIndex].isSubstituted = true;
        hybridStorageService.saveDutySchedules(schedules);
      }

      // 标记冲突为已解决
      hybridStorageService.resolveConflict(currentConflict.id, {
        method: 'substitute',
        substitutePersonId: selectedSubstitute,
        substitutePersonName: personnel.find(p => p.id === selectedSubstitute)?.name,
        executeTime: new Date().toISOString()
      });

      message.success('替班安排成功！');
      
      // 重新加载数据
      loadData();
      
      // 关闭模态框
      setSubstituteModalVisible(false);
      setCurrentConflict(null);
      setSelectedSubstitute(null);
      
    } catch (error) {
      console.error('替班操作失败:', error);
      message.error('替班安排失败，请重试');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', height: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <DashboardOutlined /> 排班管理仪表盘
            </Title>
            <Text type="secondary">
              实时统计 • 最后更新：{dayjs().format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          </div>
          
          {/* 演示数据按钮（仅在无数据时显示） */}
          {personnel.length === 0 && (
            <Button 
              type="dashed" 
              onClick={() => {
                hybridStorageService.createDemoDataWithConflicts();
                loadData();
                message.success('演示数据创建成功！包含冲突示例，可以测试替班功能。');
              }}
            >
              创建演示数据
            </Button>
          )}
        </div>
      </div>

      {/* 关键指标卡片 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总人员数"
              value={personnelStats.total}
              prefix={<UserOutlined />}
              suffix="人"
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress 
              percent={Math.round((personnelStats.active / personnelStats.total) * 100)} 
              size="small" 
              format={() => `可用 ${personnelStats.active}人`}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本周排班"
              value={weeklyStats.total}
              prefix={<CalendarOutlined />}
              suffix="次"
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress 
              percent={Math.round((weeklyStats.completed / weeklyStats.total) * 100)} 
              size="small"
              format={() => `已完成 ${weeklyStats.completed}次`}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="排班冲突"
              value={conflicts.length}
              prefix={<ExclamationCircleOutlined />}
              suffix="个"
              valueStyle={{ color: conflicts.length > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            {conflicts.length > 0 && (
              <Text type="danger" style={{ fontSize: '12px' }}>
                需要及时处理
              </Text>
            )}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="替班记录"
              value={substitutes.length}
              prefix={<SwapOutlined />}
              suffix="次"
              valueStyle={{ color: '#722ed1' }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              本月累计
            </Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* 今日值班 - 移除红色角标，统一文字颜色 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <ClockCircleOutlined />
                <span>今日值班安排</span>
              </Space>
            }
            size="small"
          >
            {todaySchedules.length > 0 ? (
              <List
                dataSource={todaySchedules}
                renderItem={(schedule) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Badge 
                          status={schedule.isSubstituted ? 'warning' : 'processing'} 
                          dot
                        />
                      }
                      title={
                        <Space>
                          <Text strong>
                            {positions.find(p => p.id === schedule.positionId)?.name || '值班'}
                          </Text>
                          {schedule.isSubstituted && (
                            <Tag color="orange" size="small">替班</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <div>
                          {schedule.isGroup ? (
                            <div>
                              <Text>
                                {schedule.assignedPersonIds?.map(id => {
                                  const person = personnel.find(p => p.id === id);
                                  return person?.name;
                                }).filter(Boolean).join('、')}
                              </Text>
                            </div>
                          ) : (
                            <div>
                              <Text>
                                {personnel.find(p => p.id === schedule.assignedPersonId)?.name || '未知'}
                              </Text>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="今日无值班安排"
              />
            )}
          </Card>
        </Col>

        {/* 人员状态分布 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <UserOutlined />
                <span>人员状态统计</span>
              </Space>
            }
            size="small"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Title level={5}>按标签</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {Object.entries(personnelStats.byTag).map(([tag, count]) => (
                    <div key={tag} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Tag color={tag === '领导' ? 'red' : tag === '职工' ? 'blue' : tag === '监督员' ? 'green' : 'orange'}>
                        {tag}
                      </Tag>
                      <Text strong>{count}人</Text>
                    </div>
                  ))}
                </Space>
              </Col>
              <Col span={12}>
                <Title level={5}>按状态</Title>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {Object.entries(personnelStats.byStatus).map(([status, count]) => (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Tag color={(() => {
                        const colors = {
                          '在岗': 'green',
                          '请假': 'orange',
                          '出差': 'blue',
                          '公出': 'cyan',
                          '病假': 'red',
                          '调休': 'purple',
                          '离职': 'default'
                        };
                        return colors[status] || 'default';
                      })()}>
                        {status}
                      </Tag>
                      <Text strong>{count}人</Text>
                    </div>
                  ))}
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 排班日历概览 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <CalendarOutlined />
                <span>排班日历概览</span>
              </Space>
            }
            size="small"
          >
            <Calendar
              value={currentDate}
              onSelect={handleDateSelect}
              cellRender={dateCellRender}
              style={{ height: '100%' }}
            />
          </Card>
        </Col>

        {/* 值班频率排行 */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <TrophyOutlined />
                <span>值班频率排行</span>
              </Space>
            }
            size="small"
          >
            <Table
              dataSource={dutyFrequency}
              columns={dutyFrequencyColumns}
              pagination={false}
              size="small"
              rowKey="personId"
            />
          </Card>
        </Col>

        {/* 最近替班记录 - 显示冲突情况和处理状态 */}
        <Col xs={24}>
          <Card 
            title={
              <Space>
                <SwapOutlined />
                <span>最近替班记录</span>
              </Space>
            }
            size="small"
          >
            {recentSubstitutesWithConflicts.length > 0 ? (
              <Timeline>
                {recentSubstitutesWithConflicts.map((record) => (
                  <Timeline.Item
                    key={record.id}
                    dot={
                      record.isResolved ? 
                        <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                        <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
                    }
                  >
                    <div>
                      <div style={{ marginBottom: '4px' }}>
                        <Text strong>{record.originalPersonName}</Text>
                        {record.isResolved ? (
                          <>
                            <Text type="secondary"> → </Text>
                            <Text strong style={{ color: '#52c41a' }}>{record.substitutePersonName}</Text>
                          </>
                        ) : (
                          <Tag color="warning" size="small" style={{ marginLeft: '8px' }}>
                            未替班
                          </Tag>
                        )}
                      </div>
                      
                      <div style={{ marginBottom: '4px' }}>
                        <Text type="secondary">
                          {record.scheduleDate} {record.positionName}
                        </Text>
                      </div>
                      
                      {record.hasConflict && (
                        <div style={{ marginBottom: '4px' }}>
                          <Text type="danger" style={{ fontSize: '12px' }}>
                            冲突原因: {record.conflictReason || record.reason}
                          </Text>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {dayjs(record.createTime).format('MM-DD HH:mm')}
                        </Text>
                        
                        {!record.isResolved && (
                          <Button 
                            type="link" 
                            size="small"
                            onClick={() => handleSubstituteClick(record)}
                          >
                            设置替班
                          </Button>
                        )}
                      </div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无替班记录"
              />
            )}
          </Card>
        </Col>

        {/* 系统提醒 */}
        {(conflicts.length > 0 || personnelStats.unavailable > personnelStats.total * 0.3) && (
          <Col xs={24}>
            <Alert
              message="系统提醒"
              description={
                <div>
                  {conflicts.length > 0 && (
                    <div>
                      <WarningOutlined style={{ color: '#ff4d4f' }} /> 
                      发现 {conflicts.length} 个排班冲突，请及时处理
                    </div>
                  )}
                  {personnelStats.unavailable > personnelStats.total * 0.3 && (
                    <div>
                      <ExclamationCircleOutlined style={{ color: '#fa8c16' }} /> 
                      超过30%的人员当前不可用，可能影响排班安排
                    </div>
                  )}
                </div>
              }
              type="warning"
              showIcon
              style={{ marginTop: '16px' }}
            />
          </Col>
        )}
      </Row>

      {/* 替班选择模态框 */}
      <Modal
        title="安排替班人员"
        open={substituteModalVisible}
        onOk={handleConfirmSubstitute}
        onCancel={() => {
          setSubstituteModalVisible(false);
          setCurrentConflict(null);
          setSelectedSubstitute(null);
        }}
        okText="确认替班"
        cancelText="取消"
      >
        {currentConflict && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <Text strong>冲突情况：</Text>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <Text>{currentConflict.originalPersonName} 在 {currentConflict.scheduleDate} 无法值班</Text>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <Text type="secondary">岗位：{currentConflict.positionName}</Text>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <Text type="danger">原因：{currentConflict.conflictReason}</Text>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <Text strong>选择替班人员：</Text>
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="请选择替班人员"
              value={selectedSubstitute}
              onChange={setSelectedSubstitute}
            >
              {getAvailableSubstitutes(currentConflict).map(person => {
                // 检查是否是相同标签，优先推荐
                const originalPerson = personnel.find(p => p.id === currentConflict.originalPersonId);
                const isSameTag = person.tag === originalPerson?.tag;
                
                return (
                  <Option key={person.id} value={person.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{person.name}</span>
                      <div>
                        <Tag size="small" color={person.tag === '领导' ? 'red' : 'blue'}>
                          {person.tag}
                        </Tag>
                        {isSameTag && (
                          <Tag size="small" color="green">推荐</Tag>
                        )}
                      </div>
                    </div>
                  </Option>
                );
              })}
            </Select>
            
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                提示：优先推荐相同标签的人员替班
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard; 