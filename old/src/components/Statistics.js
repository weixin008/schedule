import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Space,
  Select,
  DatePicker,
  Tag,
  Progress,
  Typography,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined,
  TeamOutlined,
  TrophyOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import hybridStorageService from '../services/hybridStorageService';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Statistics = () => {
  const [employees, setEmployees] = useState([]);
  const [dutySchedules, setDutySchedules] = useState([]);
  const [statusRecords, setStatusRecords] = useState([]);
  const [settings, setSettings] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(30, 'day'),
    dayjs()
  ]);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const schedulesData = await hybridStorageService.getDutySchedules();
    const employeesData = await hybridStorageService.getEmployees();
    const statusRecordsData = await hybridStorageService.getEmployeeStatusRecords();
    const settingsData = await hybridStorageService.getSettings();
    
    setDutySchedules(schedulesData);
    setEmployees(employeesData);
    setStatusRecords(statusRecordsData);
    setSettings(settingsData);
  };

  // 过滤数据
  const filteredSchedules = dutySchedules.filter(schedule => {
    const scheduleDate = dayjs(schedule.date);
    const inDateRange = scheduleDate.isAfter(dateRange[0]) && scheduleDate.isBefore(dateRange[1]);
    
    if (!inDateRange) return false;
    
    if (selectedDepartment === 'all') return true;
    
    // 检查值班人员是否属于选定部门
    return schedule.dutyStaff?.some(staff => {
      const employee = employees.find(emp => emp.id === staff.employeeId);
      return employee?.department === selectedDepartment;
    });
  });

  // 基础统计
  const basicStats = {
    totalDuties: filteredSchedules.length,
    totalEmployees: employees.length,
    activeEmployees: employees.filter(emp => emp.status === 'active').length,
    departments: [...new Set(employees.map(emp => emp.department))].length,
  };

  // 值班类型统计
  const dutyTypeStats = settings?.dutyTypes.map(dutyType => {
    const count = filteredSchedules.filter(s => s.dutyType === dutyType.id).length;
    const percentage = basicStats.totalDuties > 0 ? (count / basicStats.totalDuties * 100).toFixed(1) : 0;
    
    return {
      id: dutyType.id,
      name: dutyType.name,
      color: dutyType.color,
      count,
      percentage: parseFloat(percentage)
    };
  }) || [];

  // 员工值班统计
  const employeeStats = employees.map(employee => {
    const employeeDuties = filteredSchedules.filter(schedule =>
      schedule.dutyStaff?.some(staff => staff.employeeId === employee.id)
    );
    
    const dutyTypeCounts = {};
    settings?.dutyTypes.forEach(type => {
      dutyTypeCounts[type.id] = employeeDuties.filter(s => s.dutyType === type.id).length;
    });

    const totalHours = employeeDuties.reduce((total, schedule) => {
      const dutyType = settings?.dutyTypes.find(type => type.id === schedule.dutyType);
      return total + (dutyType?.duration || 8);
    }, 0);

    const leaderDuties = employeeDuties.filter(schedule =>
      schedule.dutyStaff?.some(staff => 
        staff.employeeId === employee.id && staff.role === 'team_leader'
      )
    ).length;

    return {
      id: employee.id,
      name: employee.name,
      department: employee.department,
      level: employee.level,
      totalDuties: employeeDuties.length,
      totalHours,
      leaderDuties,
      dutyTypeCounts,
      tags: employee.tags || []
    };
  }).sort((a, b) => b.totalDuties - a.totalDuties);

  // 部门统计
  const departmentStats = [...new Set(employees.map(emp => emp.department))].map(dept => {
    const deptEmployees = employees.filter(emp => emp.department === dept);
    const deptDuties = filteredSchedules.filter(schedule =>
      schedule.dutyStaff?.some(staff => {
        const employee = employees.find(emp => emp.id === staff.employeeId);
        return employee?.department === dept;
      })
    );

    return {
      department: dept,
      employeeCount: deptEmployees.length,
      dutyCount: deptDuties.length,
      avgDutiesPerEmployee: deptEmployees.length > 0 ? (deptDuties.length / deptEmployees.length).toFixed(1) : 0
    };
  }).sort((a, b) => b.dutyCount - a.dutyCount);

  // 获取员工级别名称
  const getLevelName = (levelId) => {
    const level = settings?.employeeLevels.find(l => l.id === levelId);
    return level ? level.name : levelId;
  };

  // 员工统计表格列
  const employeeColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      render: (name, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {getLevelName(record.level)}
          </Text>
        </Space>
      ),
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
    },
    {
      title: '值班次数',
      dataIndex: 'totalDuties',
      key: 'totalDuties',
      width: 80,
      sorter: (a, b) => a.totalDuties - b.totalDuties,
      render: (count) => (
        <Text strong style={{ color: '#1890ff' }}>{count}</Text>
      ),
    },
    {
      title: '值班时长',
      dataIndex: 'totalHours',
      key: 'totalHours',
      width: 80,
      render: (hours) => `${hours}h`,
    },
    {
      title: '担任组长',
      dataIndex: 'leaderDuties',
      key: 'leaderDuties',
      width: 80,
      render: (count) => (
        <Tag color={count > 0 ? 'gold' : 'default'}>
          {count}次
        </Tag>
      ),
    },
    {
      title: '值班类型分布',
      key: 'dutyTypes',
      render: (_, record) => (
        <Space size="small" wrap>
          {settings?.dutyTypes.map(type => {
            const count = record.dutyTypeCounts[type.id] || 0;
            return count > 0 ? (
              <Tag key={type.id} color={type.color} size="small">
                {type.name}: {count}
              </Tag>
            ) : null;
          })}
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags) => (
        <Space size="small" wrap>
          {tags?.slice(0, 3).map(tag => (
            <Tag key={tag} size="small" color="processing">
              {tag}
            </Tag>
          ))}
          {tags?.length > 3 && (
            <Tag size="small" color="default">+{tags.length - 3}</Tag>
          )}
        </Space>
      ),
    },
  ];

  // 部门统计表格列
  const departmentColumns = [
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '员工数',
      dataIndex: 'employeeCount',
      key: 'employeeCount',
      render: (count) => (
        <Text><UserOutlined style={{ marginRight: 4 }} />{count}</Text>
      ),
    },
    {
      title: '值班总数',
      dataIndex: 'dutyCount',
      key: 'dutyCount',
      sorter: (a, b) => a.dutyCount - b.dutyCount,
    },
    {
      title: '人均值班',
      dataIndex: 'avgDutiesPerEmployee',
      key: 'avgDutiesPerEmployee',
      render: (avg) => `${avg}次`,
    },
    {
      title: '工作负载',
      key: 'workload',
      render: (_, record) => {
        const maxDuties = Math.max(...departmentStats.map(d => d.dutyCount));
        const percentage = maxDuties > 0 ? (record.dutyCount / maxDuties * 100) : 0;
        return (
          <Progress 
            percent={percentage} 
            size="small" 
            showInfo={false}
            strokeColor="#1890ff"
          />
        );
      },
    },
  ];

  return (
    <div>
      {/* 筛选器 */}
      <Card style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <Text strong>时间范围:</Text>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="YYYY-MM-DD"
              />
            </Space>
          </Col>
          <Col span={6}>
            <Space>
              <Text strong>部门:</Text>
              <Select
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                style={{ width: 120 }}
              >
                <Option value="all">全部部门</Option>
                {[...new Set(employees.map(emp => emp.department))].map(dept => (
                  <Option key={dept} value={dept}>{dept}</Option>
                ))}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 基础统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总值班数"
              value={basicStats.totalDuties}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="参与员工"
              value={basicStats.activeEmployees}
              suffix={`/ ${basicStats.totalEmployees}`}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="涉及部门"
              value={basicStats.departments}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均每日值班"
              value={dateRange[1].diff(dateRange[0], 'day') > 0 ? 
                (basicStats.totalDuties / dateRange[1].diff(dateRange[0], 'day')).toFixed(1) : 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
              suffix="次"
            />
          </Card>
        </Col>
      </Row>

      {/* 值班类型分布 */}
      <Card title="值班类型分布" style={{ marginBottom: 20 }}>
        <Row gutter={16}>
          {dutyTypeStats.map(stat => (
            <Col span={6} key={stat.id}>
              <Card size="small">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: stat.color }}>
                    {stat.count}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Tag color={stat.color}>{stat.name}</Tag>
                  </div>
                  <Progress 
                    percent={stat.percentage} 
                    size="small"
                    strokeColor={stat.color}
                    format={(percent) => `${percent}%`}
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={16}>
        {/* 员工值班统计 */}
        <Col span={16}>
          <Card
            title={
              <Space>
                <TrophyOutlined />
                <span>员工值班统计</span>
              </Space>
            }
          >
            <Table
              columns={employeeColumns}
              dataSource={employeeStats}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
              size="small"
              scroll={{ x: 800 }}
            />
          </Card>
        </Col>

        {/* 部门统计 */}
        <Col span={8}>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                <span>部门统计</span>
              </Space>
            }
          >
            <Table
              columns={departmentColumns}
              dataSource={departmentStats}
              rowKey="department"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Statistics; 