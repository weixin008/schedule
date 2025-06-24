import React, { useState, useEffect } from 'react';
import {
  Card,
  Calendar,
  Badge,
  Typography,
  Space,
  Modal,
  List,
  Tag,
  Descriptions,
  message,
  Button,
  Empty,
  Radio,
  Row,
  Col,
  Divider,
  Table,
  Tooltip
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  EyeOutlined,
  TableOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import localStorageService from '../services/localStorageService';

// 设置dayjs插件和语言
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

const ScheduleCalendar = () => {
  const [dutySchedules, setDutySchedules] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(dayjs());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const schedulesData = localStorageService.getDutySchedules();
    const personnelData = localStorageService.getPersonnel();
    const positionsData = localStorageService.getPositions();
    
    console.log('ScheduleCalendar 加载数据:', {
      排班记录数量: schedulesData.length,
      人员数量: personnelData.length,
      岗位数量: positionsData.length
    });
    
    setDutySchedules(schedulesData);
    setPersonnel(personnelData);
    setPositions(positionsData);
  };

  // 获取人员姓名
  const getPersonnelName = (id) => {
    const person = personnel.find(p => p.id === id);
    return person ? person.name : '未知人员';
  };

  // 获取岗位名称
  const getPositionName = (id) => {
    const position = positions.find(p => p.id === id);
    return position ? position.name : '未知岗位';
  };

  // 获取指定日期的值班安排
  const getDaySchedules = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    return dutySchedules.filter(schedule => schedule.date === dateStr);
  };

  // 月视图日历单元格渲染
  const dateCellRender = (value) => {
    const daySchedules = getDaySchedules(value);
    
    if (daySchedules.length === 0) return null;

    return (
      <div style={{ 
        padding: '1px', 
        fontSize: '10px',
        lineHeight: '1.1',
        height: '100%',
        overflow: 'hidden'
      }}>
        {daySchedules.map((schedule, index) => {
          const maxPersonDisplay = 3; // 最多显示3个人
          const personnelList = schedule.isGroup ? 
            (schedule.assignedPersonIds || []) : 
            [schedule.assignedPersonId];
          
          return (
            <Tooltip
              key={schedule.id || index}
              title={
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {getPositionName(schedule.positionId)}
                  </div>
                  {schedule.isGroup ? (
                    <div>
                      <div style={{ color: '#d9b3ff', marginBottom: '2px' }}>
                        {schedule.assignedGroupName}
                      </div>
                      {schedule.assignedPersonIds?.map((id, idx) => (
                        <div key={id}>{idx + 1}. {getPersonnelName(id)}</div>
                      ))}
                    </div>
                  ) : (
                    <div>{getPersonnelName(schedule.assignedPersonId)}</div>
                  )}
                </div>
              }
              placement="topLeft"
            >
              <div style={{ 
                background: schedule.isGroup ? '#f6ffed' : '#fff7e6',
                border: `1px solid ${schedule.isGroup ? '#b7eb8f' : '#ffd591'}`,
                borderRadius: '2px',
                padding: '1px 2px',
                marginBottom: '1px',
                cursor: 'pointer'
              }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  color: schedule.isGroup ? '#52c41a' : '#fa8c16',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {getPositionName(schedule.positionId)}
                </div>
                <div style={{ color: '#666' }}>
                  {schedule.isGroup ? (
                    <div>
                      <div style={{ color: '#722ed1', fontWeight: 'bold' }}>
                        {schedule.assignedGroupName}
                      </div>
                      <div style={{ fontSize: '9px' }}>
                        {personnelList.slice(0, maxPersonDisplay).map(id => getPersonnelName(id)).join('、')}
                        {personnelList.length > maxPersonDisplay && `等${personnelList.length}人`}
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      color: '#1890ff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {getPersonnelName(schedule.assignedPersonId)}
                    </div>
                  )}
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  // 获取当前周的日期范围（从周一开始）
  const getWeekDateRange = (date) => {
    const startOfWeek = date.startOf('isoWeek'); // ISO周从周一开始
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      dates.push(startOfWeek.add(i, 'day'));
    }
    
    return dates;
  };

  // 渲染周视图
  const renderWeekView = () => {
    const weekDates = getWeekDateRange(currentDate);
    
    return (
      <div>
        <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
          <Col span={24}>
            <Space>
              <Button 
                onClick={() => setCurrentDate(currentDate.subtract(1, 'week'))}
              >
                上一周
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                {weekDates[0].format('YYYY年MM月DD日')} - {weekDates[6].format('MM月DD日')}
              </Title>
              <Button 
                onClick={() => setCurrentDate(currentDate.add(1, 'week'))}
              >
                下一周
              </Button>
              <Button onClick={() => setCurrentDate(dayjs())}>
                本周
              </Button>
            </Space>
          </Col>
        </Row>
        
        <Row gutter={[4, 4]}>
          {weekDates.map((date, index) => {
            const daySchedules = getDaySchedules(date);
            const isToday = date.isSame(dayjs(), 'day');
                         const isWeekend = index === 5 || index === 6; // 周六、周日是周末
            
            return (
                             <Col key={date.format('YYYY-MM-DD')} span={24/7} style={{ height: '350px' }}>
                <Card
                  size="small"
                  title={
                    <div style={{ 
                      textAlign: 'center',
                      color: isToday ? '#1890ff' : isWeekend ? '#ff4d4f' : '#333',
                      fontWeight: isToday ? 'bold' : 'normal'
                    }}>
                                             <div>{['周一', '周二', '周三', '周四', '周五', '周六', '周日'][index]}</div>
                      <div style={{ fontSize: '16px' }}>{date.format('MM/DD')}</div>
                    </div>
                  }
                  style={{ 
                    height: '100%',
                    border: isToday ? '2px solid #1890ff' : '1px solid #d9d9d9'
                  }}
                                     bodyStyle={{ padding: '8px', height: 'calc(100% - 46px)', overflow: 'auto' }}
                >
                  {daySchedules.length > 0 ? (
                    daySchedules.map((schedule, idx) => (
                                             <div key={schedule.id || idx} style={{ 
                         background: '#f6ffed',
                         border: '1px solid #b7eb8f',
                         borderRadius: '3px',
                         padding: '4px',
                         marginBottom: '4px',
                         fontSize: '11px',
                         lineHeight: '1.2'
                       }}>
                         <div style={{ fontWeight: 'bold', color: '#389e0d', marginBottom: '1px' }}>
                           {getPositionName(schedule.positionId)}
                         </div>
                         {schedule.isGroup ? (
                           <div>
                             <div style={{ color: '#722ed1', fontWeight: 'bold', marginBottom: '1px' }}>
                               {schedule.assignedGroupName}
                             </div>
                             <div style={{ color: '#666', fontSize: '10px' }}>
                               {schedule.assignedPersonIds?.slice(0, 3).map((id, pidx) => (
                                 <span key={id}>
                                   {pidx > 0 && '、'}{getPersonnelName(id)}
                                 </span>
                               ))}
                               {schedule.assignedPersonIds?.length > 3 && `等${schedule.assignedPersonIds.length}人`}
                             </div>
                           </div>
                         ) : (
                           <div style={{ color: '#1890ff', fontWeight: 'bold' }}>
                             {getPersonnelName(schedule.assignedPersonId)}
                           </div>
                         )}
                       </div>
                    ))
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      color: '#999', 
                      padding: '20px 0',
                      fontSize: '12px'
                    }}>
                      无值班
                    </div>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  // 渲染日视图
  const renderDayView = () => {
    const daySchedules = getDaySchedules(currentDate);
    
    return (
      <div>
        <Row gutter={[8, 8]} style={{ marginBottom: '16px' }}>
          <Col span={24}>
            <Space>
              <Button 
                onClick={() => setCurrentDate(currentDate.subtract(1, 'day'))}
              >
                前一天
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                {currentDate.format('YYYY年MM月DD日 dddd')}
              </Title>
              <Button 
                onClick={() => setCurrentDate(currentDate.add(1, 'day'))}
              >
                后一天
              </Button>
              <Button onClick={() => setCurrentDate(dayjs())}>
                今天
              </Button>
            </Space>
          </Col>
        </Row>

                 {daySchedules.length > 0 ? (
           <Row gutter={[16, 16]} style={{ maxHeight: '500px', overflow: 'auto' }}>
             {daySchedules.map((schedule, index) => (
               <Col key={schedule.id || index} span={daySchedules.length === 1 ? 24 : 12}>
                <Card
                  title={
                    <Space>
                      <TeamOutlined />
                      <span>{getPositionName(schedule.positionId)}</span>
                      <Tag color="blue">
                        {schedule.rotationType === 'daily' ? '每日轮换' : 
                         schedule.rotationType === 'weekly' ? '每周轮换' : 
                         schedule.rotationType === 'continuous' ? '连班' : ''}
                      </Tag>
                    </Space>
                  }
                  size="small"
                >
                  {schedule.isGroup ? (
                    <div>
                      <div style={{ marginBottom: '12px' }}>
                        <Space>
                          <TeamOutlined style={{ color: '#722ed1' }} />
                          <Text strong style={{ color: '#722ed1' }}>
                            {schedule.assignedGroupName}
                          </Text>
                          <Tag color="purple">编组值班</Tag>
                        </Space>
                      </div>
                      <List
                        size="small"
                        dataSource={schedule.assignedPersonIds || []}
                        renderItem={(personId, idx) => (
                          <List.Item style={{ padding: '4px 0' }}>
                            <Space>
                              <UserOutlined style={{ color: '#1890ff' }} />
                              <Text>{idx + 1}. {getPersonnelName(personId)}</Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  ) : (
                    <div>
                      <Space size="large">
                        <UserOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#52c41a' }}>
                            {getPersonnelName(schedule.assignedPersonId)}
                          </div>
                          <Text type="secondary">个人值班</Text>
                        </div>
                      </Space>
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当天无值班安排"
          />
        )}
      </div>
    );
  };

  // 日期选择处理
  const handleDateSelect = (date) => {
    const daySchedules = getDaySchedules(date);
    setSelectedDate(date);
    setCurrentDate(date);
    
    if (daySchedules.length > 0) {
      setIsDetailModalVisible(true);
    } else {
      message.info('当天无值班安排');
    }
  };

  const daySchedules = selectedDate ? getDaySchedules(selectedDate) : [];

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Card
        title={
          <Space>
            <CalendarOutlined />
            <span>排班日历</span>
            <Text type="secondary">
              (共 {dutySchedules.length} 条排班记录)
            </Text>
          </Space>
        }
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: '16px', overflow: 'hidden' }}
        extra={
          <Space>
            <Radio.Group 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              size="small"
            >
              <Radio.Button value="day">
                <UnorderedListOutlined /> 日视图
              </Radio.Button>
              <Radio.Button value="week">
                <TableOutlined /> 周视图
              </Radio.Button>
              <Radio.Button value="month">
                <CalendarOutlined /> 月视图
              </Radio.Button>
            </Radio.Group>
            <Button onClick={loadData}>
              刷新数据
            </Button>
          </Space>
        }
      >
        {dutySchedules.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text type="secondary">暂无排班数据</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  请先在"轮班规则"中设置规则并生成排班表
                </Text>
              </div>
            }
          />
        ) : (
          <>
            {viewMode === 'month' && (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                <Calendar 
                  onSelect={handleDateSelect}
                  dateCellRender={dateCellRender}
                  value={currentDate}
                  onChange={setCurrentDate}
                  style={{ height: '100%' }}
                />
              </div>
            )}
            {viewMode === 'week' && (
              <div style={{ height: '100%', overflow: 'hidden' }}>
                {renderWeekView()}
              </div>
            )}
            {viewMode === 'day' && (
              <div style={{ height: '100%', overflow: 'auto' }}>
                {renderDayView()}
              </div>
            )}
          </>
        )}
      </Card>

      {/* 日期详情模态框 */}
      <Modal
        title={`值班详情 - ${selectedDate?.format('YYYY年MM月DD日 dddd')}`}
        open={isDetailModalVisible}
        onCancel={() => setIsDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={700}
      >
        <List
          itemLayout="vertical"
          dataSource={daySchedules}
          renderItem={(schedule) => (
            <List.Item
              key={schedule.id}
              style={{ 
                border: '1px solid #f0f0f0', 
                borderRadius: '6px', 
                marginBottom: '16px',
                padding: '16px'
              }}
            >
              <Descriptions
                title={
                  <Space>
                    <Tag color="blue" icon={<TeamOutlined />}>
                      {getPositionName(schedule.positionId)}
                    </Tag>
                    <Tag color="green">
                      {schedule.rotationType === 'daily' ? '每日轮换' : 
                       schedule.rotationType === 'weekly' ? '每周轮换' : 
                       schedule.rotationType === 'continuous' ? '连班' : ''}
                    </Tag>
                  </Space>
                }
                size="small"
                column={1}
              >
                <Descriptions.Item label="值班人员">
                  {schedule.isGroup ? (
                    <div>
                      <Space style={{ marginBottom: '8px' }}>
                        <TeamOutlined />
                        <strong>{schedule.assignedGroupName}</strong>
                        <Tag color="purple">编组</Tag>
                      </Space>
                      <div style={{ marginLeft: '20px' }}>
                        {schedule.assignedPersonIds?.map((personId, index) => (
                          <div key={personId} style={{ marginBottom: '4px' }}>
                            <Space>
                              <UserOutlined style={{ fontSize: '12px' }} />
                              <span>{index + 1}. {getPersonnelName(personId)}</span>
                            </Space>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Space>
                      <UserOutlined />
                      <strong>{getPersonnelName(schedule.assignedPersonId)}</strong>
                    </Space>
                  )}
                </Descriptions.Item>
                
                {schedule.createTime && (
                  <Descriptions.Item label="排班时间">
                    {dayjs(schedule.createTime).format('YYYY-MM-DD HH:mm')}
                  </Descriptions.Item>
                )}
                
                {schedule.ruleId && (
                  <Descriptions.Item label="规则ID">
                    {schedule.ruleId}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default ScheduleCalendar; 