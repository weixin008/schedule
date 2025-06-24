import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  TimePicker, 
  Button, 
  message, 
  Row, 
  Col, 
  Space,
  Table,
  Modal,
  InputNumber,
  Popconfirm,
  Select
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SaveOutlined,
  ReloadOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import localStorageService from '../services/localStorageService';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [isShiftModalVisible, setIsShiftModalVisible] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm] = Form.useForm();
  const [settingsForm] = Form.useForm();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const settingsData = localStorageService.getSettings();
    setSettings(settingsData);
    if (settingsData) {
      settingsForm.setFieldsValue({
        workDays: settingsData.workDays,
        restDays: settingsData.restDays,
        minStaffPerShift: settingsData.minStaffPerShift
      });
    }
  };

  const handleSettingsSave = async () => {
    try {
      const values = await settingsForm.validateFields();
      const updatedSettings = {
        ...settings,
        ...values
      };
      localStorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      message.success('设置保存成功');
    } catch (error) {
      console.error('设置保存失败:', error);
    }
  };

  const handleAddShift = () => {
    setEditingShift(null);
    shiftForm.resetFields();
    setIsShiftModalVisible(true);
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    shiftForm.setFieldsValue({
      id: shift.id,
      name: shift.name,
      time: [dayjs(shift.startTime, 'HH:mm'), dayjs(shift.endTime, 'HH:mm')],
      color: shift.color
    });
    setIsShiftModalVisible(true);
  };

  const handleDeleteShift = (shiftId) => {
    const updatedSettings = {
      ...settings,
      shifts: settings.shifts.filter(shift => shift.id !== shiftId)
    };
    localStorageService.saveSettings(updatedSettings);
    setSettings(updatedSettings);
    message.success('班次删除成功');
  };

  const handleShiftModalOk = async () => {
    try {
      const values = await shiftForm.validateFields();
      const [startTime, endTime] = values.time;
      
      const shiftData = {
        id: editingShift ? editingShift.id : `shift_${Date.now()}`,
        name: values.name,
        startTime: startTime.format('HH:mm'),
        endTime: endTime.format('HH:mm'),
        color: values.color
      };

      let updatedShifts;
      if (editingShift) {
        updatedShifts = settings.shifts.map(shift => 
          shift.id === editingShift.id ? shiftData : shift
        );
      } else {
        updatedShifts = [...settings.shifts, shiftData];
      }

      const updatedSettings = {
        ...settings,
        shifts: updatedShifts
      };

      localStorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      setIsShiftModalVisible(false);
      shiftForm.resetFields();
      message.success(editingShift ? '班次更新成功' : '班次添加成功');
    } catch (error) {
      console.error('班次保存失败:', error);
    }
  };

  const handleResetData = () => {
    Modal.confirm({
      title: '重置数据',
      content: '确定要重置所有数据吗？这将删除所有员工和排班记录，并恢复默认设置。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        localStorageService.clearAllData();
        loadSettings();
        message.success('数据重置成功');
        window.location.reload();
      }
    });
  };

  const shiftColumns = [
    {
      title: '班次名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 100,
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 100,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 80,
      render: (color) => (
        <div style={{
          width: 20,
          height: 20,
          backgroundColor: color,
          borderRadius: 4,
          border: '1px solid #d9d9d9'
        }} />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditShift(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个班次吗？"
            onConfirm={() => handleDeleteShift(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!settings) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      {/* 基础设置 */}
      <Card title="基础设置" style={{ marginBottom: 20 }}>
        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={handleSettingsSave}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="连续工作天数"
                name="workDays"
                rules={[{ required: true, message: '请输入连续工作天数' }]}
              >
                <InputNumber
                  min={1}
                  max={10}
                  style={{ width: '100%' }}
                  placeholder="例如：5"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="连续休息天数"
                name="restDays"
                rules={[{ required: true, message: '请输入连续休息天数' }]}
              >
                <InputNumber
                  min={1}
                  max={7}
                  style={{ width: '100%' }}
                  placeholder="例如：2"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="每班最少人数"
                name="minStaffPerShift"
                rules={[{ required: true, message: '请输入每班最少人数' }]}
              >
                <InputNumber
                  min={1}
                  max={10}
                  style={{ width: '100%' }}
                  placeholder="例如：2"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit"
              icon={<SaveOutlined />}
            >
              保存设置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 班次管理 */}
      <Card 
        title="班次管理" 
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddShift}
          >
            添加班次
          </Button>
        }
        style={{ marginBottom: 20 }}
      >
        <Table
          columns={shiftColumns}
          dataSource={settings.shifts}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Card>

      {/* 数据管理 */}
      <Card title="数据管理">
        <Space size="large">
          <div>
            <Button 
              danger
              icon={<ReloadOutlined />}
              onClick={handleResetData}
            >
              重置所有数据
            </Button>
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              将删除所有员工和排班记录
            </div>
          </div>
        </Space>
      </Card>

      {/* 添加/编辑班次模态框 */}
      <Modal
        title={editingShift ? '编辑班次' : '添加班次'}
        open={isShiftModalVisible}
        onOk={handleShiftModalOk}
        onCancel={() => {
          setIsShiftModalVisible(false);
          shiftForm.resetFields();
        }}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form
          form={shiftForm}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="班次名称"
            name="name"
            rules={[
              { required: true, message: '请输入班次名称' },
              { min: 2, message: '班次名称至少2个字符' }
            ]}
          >
            <Input placeholder="例如：白班、夜班" />
          </Form.Item>

          <Form.Item
            label="工作时间"
            name="time"
            rules={[{ required: true, message: '请选择工作时间' }]}
          >
            <TimePicker.RangePicker
              format="HH:mm"
              style={{ width: '100%' }}
              placeholder={['开始时间', '结束时间']}
            />
          </Form.Item>

          <Form.Item
            label="颜色标识"
            name="color"
            rules={[{ required: true, message: '请选择颜色' }]}
          >
            <Select placeholder="选择颜色">
              <Select.Option value="#1890ff">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, backgroundColor: '#1890ff', borderRadius: 2 }} />
                  蓝色
                </div>
              </Select.Option>
              <Select.Option value="#52c41a">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, backgroundColor: '#52c41a', borderRadius: 2 }} />
                  绿色
                </div>
              </Select.Option>
              <Select.Option value="#722ed1">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, backgroundColor: '#722ed1', borderRadius: 2 }} />
                  紫色
                </div>
              </Select.Option>
              <Select.Option value="#fa8c16">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, backgroundColor: '#fa8c16', borderRadius: 2 }} />
                  橙色
                </div>
              </Select.Option>
              <Select.Option value="#f5222d">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, backgroundColor: '#f5222d', borderRadius: 2 }} />
                  红色
                </div>
              </Select.Option>
              <Select.Option value="#13c2c2">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, backgroundColor: '#13c2c2', borderRadius: 2 }} />
                  青色
                </div>
              </Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Settings; 