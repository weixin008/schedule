import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  DatePicker, 
  Select, 
  Table, 
  message, 
  Row, 
  Col, 
  Space,
  Typography,
  Tag,
  Modal,
  Alert,
  Steps,
  Statistic,
  Divider
} from 'antd';
import { 
  CalendarOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import hybridStorageService from '../services/hybridStorageService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Step } = Steps;

const SchedulePlanManagement = () => {
  const [plans, setPlans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [scheduleRules, setScheduleRules] = useState(null);
  const [isGenerateModalVisible, setIsGenerateModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [generateForm, setGenerateForm] = useState({
    dateRange: null,
    planType: 'weekly',
    planName: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const employeesData = hybridStorageService.getEmployees();
    const settings = hybridStorageService.getSettings();
    const plansData = hybridStorageService.getSchedulePlans() || [];
    
    setEmployees(employeesData);
    setScheduleRules(settings?.scheduleRules);
    setPlans(plansData);
  };

  const handleGeneratePlan = async () => {
    if (!scheduleRules || !scheduleRules.enabled) {
      message.error('请先在"排班规则"中配置排班规则');
      return;
    }

    if (!generateForm.dateRange) {
      message.error('请选择计划时间范围');
      return;
    }

    try {
      setLoading(true);
      
      const startDate = generateForm.dateRange[0].format('YYYY-MM-DD');
      const endDate = generateForm.dateRange[1].format('YYYY-MM-DD');
      
      // 基于规则生成排班计划
      const generatedSchedules = generateScheduleByRules(startDate, endDate, scheduleRules);
      
      // 显示预览
      setPreviewData(generatedSchedules);
      setIsPreviewModalVisible(true);
      setIsGenerateModalVisible(false);
      
    } catch (error) {
      message.error(error.message || '生成排班计划失败');
    } finally {
      setLoading(false);
    }
  };

  const generateScheduleByRules = (startDate, endDate, rules) => {
    const schedules = [];
    const leaders = employees.filter(emp => 
      rules.leaderRotation.personnel.includes(emp.id) && 
      hybridStorageService.isEmployeeAvailable(emp.id, startDate)
    );
    const staff = employees.filter(emp => 
      rules.staffRotation.personnel.includes(emp.id) && 
      hybridStorageService.isEmployeeAvailable(emp.id, startDate)
    );

    if (leaders.length === 0) {
      throw new Error('没有可用的领导人员');
    }
    if (staff.length === 0) {
      throw new Error('没有可用的职工人员');
    }

    let leaderIndex = 0;
    let staffWeekdayIndex = 0;
    let staffWeekendIndex = 0;
    let supervisorGroupIndex = 0;

    let currentDate = new Date(startDate);
    const endDateTime = new Date(endDate);

    while (currentDate <= endDateTime) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0=周日, 1=周一, ..., 6=周六
      const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;

      const daySchedule = {
        date: dateStr,
        dayOfWeek,
        isWorkday,
        assignments: []
      };

      // 1. 安排领导
      if (rules.leaderRotation.enabled) {
        if ((isWorkday && rules.leaderRotation.workdays) || (!isWorkday && rules.leaderRotation.weekends)) {
          const leader = leaders[leaderIndex % leaders.length];
          if (hybridStorageService.isEmployeeAvailable(leader.id, dateStr)) {
            daySchedule.assignments.push({
              employeeId: leader.id,
              employeeName: leader.name,
              role: 'leader',
              roleDisplay: '领导值班'
            });
          }
          if (rules.leaderRotation.mode === 'daily') {
            leaderIndex++;
          }
        }
      }

      // 2. 安排职工值班员
      if (rules.staffRotation.enabled) {
        let currentStaff = null;
        let isContinuous = false;

        if (dayOfWeek >= 1 && dayOfWeek <= 4) {
          // 周一到周四
          if (rules.staffRotation.weekdayMode === 'daily') {
            currentStaff = staff[staffWeekdayIndex % staff.length];
            staffWeekdayIndex++;
          }
        } else if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
          // 周五到周日
          if (rules.staffRotation.weekendMode === 'continuous_three') {
            currentStaff = staff[staffWeekendIndex % staff.length];
            isContinuous = true;
            if (dayOfWeek === 0) { // 周日结束，切换下一人
              staffWeekendIndex++;
            }
          } else if (rules.staffRotation.weekendMode === 'daily') {
            currentStaff = staff[staffWeekdayIndex % staff.length];
            staffWeekdayIndex++;
          }
        }

        if (currentStaff && hybridStorageService.isEmployeeAvailable(currentStaff.id, dateStr)) {
          daySchedule.assignments.push({
            employeeId: currentStaff.id,
            employeeName: currentStaff.name,
            role: 'staff',
            roleDisplay: `值班员${isContinuous ? '(连班)' : ''}`,
            isContinuous
          });
        }
      }

      // 3. 安排考勤监督员
      if (rules.supervisionRules.enabled && isWorkday && rules.supervisionRules.groups.length > 0) {
        const currentGroup = rules.supervisionRules.groups[supervisorGroupIndex % rules.supervisionRules.groups.length];
        
        currentGroup.members.forEach(memberId => {
          const supervisor = employees.find(emp => emp.id === memberId);
          if (supervisor && hybridStorageService.isEmployeeAvailable(supervisor.id, dateStr)) {
            daySchedule.assignments.push({
              employeeId: supervisor.id,
              employeeName: supervisor.name,
              role: 'supervisor',
              roleDisplay: '考勤监督员',
              groupName: currentGroup.name || `编组${supervisorGroupIndex + 1}`
            });
          }
        });

        // 周末结束时切换编组
        if (dayOfWeek === 5 && rules.supervisionRules.rotationMode === 'weekly') {
          supervisorGroupIndex++;
        }
      }

      schedules.push(daySchedule);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedules;
  };

  const confirmGeneratePlan = () => {
    try {
      const planData = {
        id: Date.now().toString(),
        name: generateForm.planName || `排班计划_${dayjs().format('YYYY-MM-DD')}`,
        startDate: generateForm.dateRange[0].format('YYYY-MM-DD'),
        endDate: generateForm.dateRange[1].format('YYYY-MM-DD'),
        planType: generateForm.planType,
        schedules: previewData,
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      // 保存计划
      const existingPlans = hybridStorageService.getSchedulePlans() || [];
      existingPlans.push(planData);
      hybridStorageService.saveSchedulePlans(existingPlans);

      // 将计划中的排班添加到值班日历
      previewData.forEach(daySchedule => {
        if (daySchedule.assignments.length > 0) {
          const dutyStaff = daySchedule.assignments.map(assignment => ({
            employeeId: assignment.employeeId,
            role: assignment.role,
            dutyType: assignment.role === 'leader' ? 'leader_duty' : 
                     assignment.role === 'staff' ? 'staff_duty' : 'attendance_supervision',
            isContinuousDuty: assignment.isContinuous || false
          }));

          const schedule = {
            date: daySchedule.date,
            dutyType: 'advanced_duty',
            dutyStaff,
            notes: `来自计划: ${planData.name}`,
            isAutoGenerated: true,
            planId: planData.id,
            advancedSchedule: {
              hasLeader: daySchedule.assignments.some(a => a.role === 'leader'),
              hasStaff: daySchedule.assignments.some(a => a.role === 'staff'),
              hasAttendanceSupervisors: daySchedule.assignments.some(a => a.role === 'supervisor'),
              dayOfWeek: daySchedule.dayOfWeek
            }
          };

          try {
            hybridStorageService.addDutySchedule(schedule);
          } catch (error) {
            console.warn('排班冲突:', error.message);
          }
        }
      });

      loadData();
      setIsPreviewModalVisible(false);
      message.success(`排班计划"${planData.name}"生成成功！`);
      
    } catch (error) {
      message.error('保存排班计划失败');
    }
  };

  const deletePlan = (planId) => {
    Modal.confirm({
      title: '确认删除计划',
      content: '删除计划将同时删除相关的值班安排，确定继续吗？',
      onOk: () => {
        // 删除计划
        const existingPlans = hybridStorageService.getSchedulePlans() || [];
        const filteredPlans = existingPlans.filter(p => p.id !== planId);
        hybridStorageService.saveSchedulePlans(filteredPlans);

        // 删除相关的值班安排
        const schedules = hybridStorageService.getDutySchedules();
        const filteredSchedules = schedules.filter(s => s.planId !== planId);
        hybridStorageService.saveDutySchedules(filteredSchedules);

        loadData();
        message.success('计划删除成功');
      }
    });
  };

  const planColumns = [
    {
      title: '计划名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '计划类型',
      dataIndex: 'planType',
      key: 'planType',
      render: (type) => {
        const typeMap = {
          'weekly': '周计划',
          'monthly': '月计划',
          'custom': '自定义'
        };
        return <Tag color="blue">{typeMap[type] || type}</Tag>;
      }
    },
    {
      title: '时间范围',
      key: 'dateRange',
      render: (_, record) => `${record.startDate} 至 ${record.endDate}`
    },
    {
      title: '排班天数',
      key: 'days',
      render: (_, record) => {
        const start = new Date(record.startDate);
        const end = new Date(record.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return `${days}天`;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status === 'active' ? '生效中' : '已停用'}
        </Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setPreviewData(record.schedules);
              setIsPreviewModalVisible(true);
            }}
          >
            查看
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => deletePlan(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  const previewColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date, record) => (
        <div>
          <div>{date}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][record.dayOfWeek]}
            {record.isWorkday ? '' : ' (周末)'}
          </Text>
        </div>
      )
    },
    {
      title: '值班安排',
      dataIndex: 'assignments',
      key: 'assignments',
      render: (assignments) => (
        <Space direction="vertical" size="small">
          {assignments.map((assignment, index) => (
            <Tag 
              key={index}
              color={
                assignment.role === 'leader' ? 'red' :
                assignment.role === 'staff' ? 'blue' : 'green'
              }
            >
              {assignment.roleDisplay}: {assignment.employeeName}
            </Tag>
          ))}
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Title level={3}>
            <CalendarOutlined /> 排班计划管理
          </Title>
          <Text type="secondary">
            基于预设规则生成排班计划，支持周计划、月计划等多种周期
          </Text>
        </div>

        {!scheduleRules?.enabled && (
                   <Alert
           message="提示"
           description="请先在排班规则页面配置排班规则，然后再生成排班计划。"
           type="warning"
           showIcon
           style={{ marginBottom: 16 }}
           action={
             <Button size="small" type="primary">
               去配置规则
             </Button>
           }
         />
        )}

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Statistic 
              title="总计划数" 
              value={plans.length} 
              prefix={<CalendarOutlined />} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="生效中" 
              value={plans.filter(p => p.status === 'active').length} 
              prefix={<CheckCircleOutlined />} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="本月计划" 
              value={plans.filter(p => dayjs(p.createdAt).isSame(dayjs(), 'month')).length} 
              prefix={<ClockCircleOutlined />} 
            />
          </Col>
          <Col span={6}>
            <Button 
              type="primary" 
              size="large"
              icon={<ThunderboltOutlined />}
              disabled={!scheduleRules?.enabled}
              onClick={() => setIsGenerateModalVisible(true)}
            >
              生成新计划
            </Button>
          </Col>
        </Row>

        <Table
          columns={planColumns}
          dataSource={plans}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* 生成计划模态框 */}
      <Modal
        title="生成排班计划"
        open={isGenerateModalVisible}
        onOk={handleGeneratePlan}
        onCancel={() => setIsGenerateModalVisible(false)}
        confirmLoading={loading}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>选择计划周期：</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              value={generateForm.planType}
              onChange={(value) => setGenerateForm({...generateForm, planType: value})}
            >
              <Option value="weekly">一周计划</Option>
              <Option value="monthly">一月计划</Option>
              <Option value="custom">自定义周期</Option>
            </Select>
          </div>

          <div>
            <Text strong>选择时间范围：</Text>
            <RangePicker
              style={{ width: '100%', marginTop: 8 }}
              value={generateForm.dateRange}
              onChange={(dates) => setGenerateForm({...generateForm, dateRange: dates})}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </div>
        </Space>
      </Modal>

      {/* 预览模态框 */}
      <Modal
        title="排班计划预览"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setIsPreviewModalVisible(false)}>
            取消
          </Button>,
          <Button key="confirm" type="primary" onClick={confirmGeneratePlan}>
            确认生成
          </Button>
        ]}
      >
        <Table
          columns={previewColumns}
          dataSource={previewData}
          rowKey="date"
          pagination={false}
          scroll={{ y: 400 }}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default SchedulePlanManagement; 