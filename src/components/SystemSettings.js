import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Divider,
  Typography,
  Row,
  Col,
  Select,
  InputNumber,
  Switch,
  message,
  Alert,
  Tag,
  Upload,
  Avatar,
  Tooltip,
  Modal,
  Table
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  UndoOutlined,
  BankOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ExportOutlined,
  ImportOutlined,
  UploadOutlined,
  InfoCircleOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  TableOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import localStorageService from '../services/localStorageService';


const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const SystemSettings = ({ onSettingsChange }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);


  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const systemSettings = localStorageService.getSystemSettings();
      setSettings(systemSettings);
      form.setFieldsValue(systemSettings);
    } catch (error) {
      console.error('加载系统设置失败:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const updatedSettings = {
        ...settings,
        ...values,
        updateTime: new Date().toISOString()
      };
      
      localStorageService.saveSystemSettings(updatedSettings);
      setSettings(updatedSettings);
      
      message.success('系统设置保存成功');
      
      // 如果机构名称发生变化，通知父组件更新
      if (values.organizationName !== settings.organizationName) {
        message.info('机构名称已更新，左上角标题已生效', 3);
        // 通知父组件重新加载系统设置
        if (onSettingsChange) {
          onSettingsChange();
        }
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      message.error('保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.setFieldsValue(settings);
    message.info('已重置为上次保存的设置');
  };



  // 清除所有数据
  const handleClearAllData = () => {
    Modal.confirm({
      title: '⚠️ 危险操作：清除所有数据',
      content: (
        <div>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>此操作将永久删除以下所有数据：</p>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>所有人员信息</li>
            <li>所有岗位设置</li>
            <li>所有轮班规则</li>
            <li>所有排班安排</li>
            <li>所有冲突记录和替班记录</li>
            <li>系统设置和自定义标签</li>
          </ul>
          <p style={{ color: '#ff4d4f' }}>
            <strong>请确认您已经导出并保存了重要数据！</strong>
          </p>
          <p>此操作不可恢复，请谨慎操作。</p>
        </div>
      ),
      icon: null,
      okText: '我已备份数据，确认清除',
      cancelText: '取消',
      okType: 'danger',
      width: 500,
      onOk() {
        try {
          // 清除所有localStorage数据
          localStorage.clear();
          message.success('所有数据已清除');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          console.error('清除数据失败:', error);
          message.error('清除数据失败');
        }
      }
    });
  };

  // 导出Excel文件
  const handleExportExcel = () => {
    try {
      const personnel = localStorageService.getPersonnel();
      const positions = localStorageService.getPositions();
      const scheduleRules = localStorageService.getScheduleRules();
      const dutySchedules = localStorageService.getDutySchedules();
      const customTags = localStorageService.getCustomTags();
      const conflictRecords = localStorageService.getConflictRecords();
      const substituteRecords = localStorageService.getSubstituteRecordsSimple();
      const systemSettings = localStorageService.getSystemSettings();

      // 创建新的工作簿
      const workbook = XLSX.utils.book_new();

      // 人员数据工作表
      const personnelData = personnel.map((person, index) => ({
        '序号': index + 1,
        '姓名': person.name,
        '标签': Array.isArray(person.tags) ? person.tags.join(',') : (person.tags || ''),
        '状态': person.status || '在岗',
        '电话': person.phone || '',
        '备注': person.remarks || ''
      }));
      const personnelSheet = XLSX.utils.json_to_sheet(personnelData);
      XLSX.utils.book_append_sheet(workbook, personnelSheet, '人员信息');

      // 自定义标签工作表
      const tagsData = customTags.map((tag, index) => ({
        '序号': index + 1,
        '标签名称': tag
      }));
      const tagsSheet = XLSX.utils.json_to_sheet(tagsData);
      XLSX.utils.book_append_sheet(workbook, tagsSheet, '自定义标签');

      // 岗位数据工作表
      const positionsData = positions.map((position, index) => ({
        '序号': index + 1,
        '岗位名称': position.name,
        '要求标签': Array.isArray(position.requiredTags) ? position.requiredTags.join(',') : (position.requiredTags || ''),
        '启用编组': position.enableGroup ? '是' : '否',
        '每组人数': position.groupSize || '',
        '描述': position.description || '',
        '分配人员': Array.isArray(position.assignedPersons) ? 
          position.assignedPersons.map(ap => personnel.find(p => p.id === ap.personId)?.name || '未知').join(',') : '',
        '编组信息': Array.isArray(position.groups) ? 
          position.groups.map(g => `${g.name}(${g.members.map(m => personnel.find(p => p.id === m)?.name || '未知').join(',')})`).join(';') : ''
      }));
      const positionsSheet = XLSX.utils.json_to_sheet(positionsData);
      XLSX.utils.book_append_sheet(workbook, positionsSheet, '岗位设置');

      // 轮班规则工作表
      const rulesData = scheduleRules.map((rule, index) => ({
        '序号': index + 1,
        '岗位名称': localStorageService.getPositions().find(p => p.id === rule.positionId)?.name || '未知岗位',
        '轮班方式': rule.rotationType === 'daily' ? '每日轮换' : 
                    rule.rotationType === 'weekly' ? '每周轮换' : 
                    rule.rotationType === 'continuous' ? '连班' : rule.rotationType,
        '连班天数': rule.continuousDays || '',
        '工作日': rule.workdays ? (Array.isArray(rule.workdays) ? rule.workdays.join(',') : rule.workdays) : '全部'
      }));
      const rulesSheet = XLSX.utils.json_to_sheet(rulesData);
      XLSX.utils.book_append_sheet(workbook, rulesSheet, '轮班规则');

      // 排班安排工作表（最近60天）
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const recentSchedules = dutySchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= sixtyDaysAgo;
      });

      const scheduleData = recentSchedules.map((schedule, index) => {
        const position = localStorageService.getPositions().find(p => p.id === schedule.positionId);
        const personnel = localStorageService.getPersonnel();
        
        let assignedNames = '';
        if (schedule.isGroup && schedule.assignedPersonIds) {
          assignedNames = schedule.assignedPersonIds
            .map(id => personnel.find(p => p.id === id)?.name || '未知')
            .join(',');
        } else if (schedule.assignedPersonId) {
          const person = personnel.find(p => p.id === schedule.assignedPersonId);
          assignedNames = person?.name || '未知';
        }

        return {
          '序号': index + 1,
          '日期': schedule.date,
          '岗位': position?.name || '未知岗位',
          '值班人员': assignedNames,
          '编组名称': schedule.assignedGroupName || '',
          '是否编组': schedule.isGroup ? '是' : '否'
        };
      });
      const scheduleSheet = XLSX.utils.json_to_sheet(scheduleData);
      XLSX.utils.book_append_sheet(workbook, scheduleSheet, '排班安排');

      // 冲突记录工作表
      if (conflictRecords && conflictRecords.length > 0) {
        const conflictData = conflictRecords.map((conflict, index) => ({
          '序号': index + 1,
          '日期': conflict.date,
          '人员': personnel.find(p => p.id === conflict.personId)?.name || '未知',
          '岗位': positions.find(p => p.id === conflict.positionId)?.name || '未知',
          '冲突原因': conflict.reason,
          '状态': conflict.resolved ? '已解决' : '未解决'
        }));
        const conflictSheet = XLSX.utils.json_to_sheet(conflictData);
        XLSX.utils.book_append_sheet(workbook, conflictSheet, '冲突记录');
      }

      // 替班记录工作表
      if (substituteRecords && substituteRecords.length > 0) {
        const substituteData = substituteRecords.map((substitute, index) => ({
          '序号': index + 1,
          '日期': substitute.date,
          '原值班人': personnel.find(p => p.id === substitute.originalPersonId)?.name || '未知',
          '替班人': personnel.find(p => p.id === substitute.substitutePersonId)?.name || '未知',
          '岗位': positions.find(p => p.id === substitute.positionId)?.name || '未知',
          '替班原因': substitute.reason,
          '状态': substitute.approved ? '已批准' : '待批准'
        }));
        const substituteSheet = XLSX.utils.json_to_sheet(substituteData);
        XLSX.utils.book_append_sheet(workbook, substituteSheet, '替班记录');
      }

      // 系统设置工作表
      const settingsData = [
        { '设置项': '机构名称', '设置值': systemSettings.organizationName || '' },
        { '设置项': '联系人', '设置值': systemSettings.contactPerson || '' },
        { '设置项': '联系电话', '设置值': systemSettings.contactPhone || '' },
        { '设置项': '工作日', '设置值': Array.isArray(systemSettings.workDays) ? systemSettings.workDays.join(',') : '' },
        { '设置项': '上班时间', '设置值': systemSettings.workStartTime || '' },
        { '设置项': '下班时间', '设置值': systemSettings.workEndTime || '' },
        { '设置项': '最大连续值班天数', '设置值': systemSettings.maxContinuousDuty || '' },
        { '设置项': '最少休息天数', '设置值': systemSettings.minRestDays || '' }
      ];
      const settingsSheet = XLSX.utils.json_to_sheet(settingsData);
      XLSX.utils.book_append_sheet(workbook, settingsSheet, '系统设置');

      // 生成文件名
      const orgName = systemSettings.organizationName || '排班系统';
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `${orgName}_排班数据_${dateStr}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      
      message.success('Excel文件导出成功');
    } catch (error) {
      console.error('导出Excel失败:', error);
      message.error('导出Excel失败');
    }
  };

  // 下载Excel模板
  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // 人员信息模板
      const personnelTemplate = [
        {
          '序号': 1,
          '姓名': '张三',
          '标签': '领导',
          '状态': '在岗',
          '电话': '138-0000-0001',
          '备注': '部门主管'
        },
        {
          '序号': 2,
          '姓名': '李四',
          '标签': '职工',
          '状态': '在岗',
          '电话': '138-0000-0002',
          '备注': ''
        }
      ];
      const personnelSheet = XLSX.utils.json_to_sheet(personnelTemplate);
      XLSX.utils.book_append_sheet(workbook, personnelSheet, '人员信息模板');

      // 岗位设置模板
      const positionsTemplate = [
        {
          '序号': 1,
          '岗位名称': '带班领导',
          '要求标签': '领导',
          '启用编组': '否',
          '每组人数': '',
          '描述': '负责当日值班工作'
        },
        {
          '序号': 2,
          '岗位名称': '值班员',
          '要求标签': '职工',
          '启用编组': '否',
          '每组人数': '',
          '描述': '执行值班任务'
        }
      ];
      const positionsSheet = XLSX.utils.json_to_sheet(positionsTemplate);
      XLSX.utils.book_append_sheet(workbook, positionsSheet, '岗位设置模板');

      // 填写说明
      const instructionData = [
        { '字段': '人员信息-标签', '说明': '可填写：领导、职工、中层等，多个标签用逗号分隔' },
        { '字段': '人员信息-状态', '说明': '可填写：在岗、请假、出差、培训等' },
        { '字段': '岗位设置-要求标签', '说明': '该岗位需要的人员标签，多个用逗号分隔' },
        { '字段': '岗位设置-启用编组', '说明': '填写"是"或"否"' },
        { '字段': '岗位设置-每组人数', '说明': '启用编组时填写，如：2' },
        { '字段': '导入说明', '说明': '填写完成后，在系统设置中选择导入Excel文件' }
      ];
      const instructionSheet = XLSX.utils.json_to_sheet(instructionData);
      XLSX.utils.book_append_sheet(workbook, instructionSheet, '填写说明');

      XLSX.writeFile(workbook, '排班系统数据模板.xlsx');
      message.success('Excel模板下载成功，请按照说明填写后导入');
    } catch (error) {
      console.error('下载模板失败:', error);
      message.error('下载模板失败');
    }
  };

  // JSON导出（保留原功能）
  const handleExportJSON = () => {
    try {
      const systemSettings = localStorageService.getSystemSettings();
      
      // 使用新的数据结构导出实际数据
      const data = {
        personnel: localStorageService.getPersonnel(),
        customTags: localStorageService.getCustomTags(),
        positions: localStorageService.getPositions(),
        scheduleRules: localStorageService.getScheduleRules(),
        dutySchedules: localStorageService.getDutySchedules(),
        conflictRecords: localStorageService.getConflictRecords(),
        substituteRecords: localStorageService.getSubstituteRecordsSimple(),
        systemSettings: systemSettings,
        exportDate: new Date().toISOString(),
        version: '2.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 生成文件名
      const orgName = systemSettings.organizationName || '排班系统';
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `${orgName}_排班数据_${dateStr}.json`;
      
      link.click();
      URL.revokeObjectURL(url);
      message.success('JSON数据导出成功');
    } catch (error) {
      console.error('导出数据失败:', error);
      message.error('导出数据失败');
    }
  };

  // Excel导入
  const handleImportExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let importedData = {
          personnel: [],
          positions: [],
          customTags: [],
          scheduleRules: [],
          dutySchedules: [],
          conflictRecords: [],
          substituteRecords: [],
          systemSettings: {}
        };

        // 读取人员信息
        if (workbook.SheetNames.includes('人员信息') || workbook.SheetNames.includes('人员信息模板')) {
          const sheetName = workbook.SheetNames.includes('人员信息') ? '人员信息' : '人员信息模板';
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          importedData.personnel = jsonData.map((row, index) => ({
            id: `imported_${Date.now()}_${index}`,
            name: row['姓名'] || '',
            tags: row['标签'] ? row['标签'].split(',').map(tag => tag.trim()) : [],
            status: row['状态'] || '在岗',
            phone: row['电话'] || '',
            remarks: row['备注'] || ''
          })).filter(person => person.name);
        }

        // 读取自定义标签
        if (workbook.SheetNames.includes('自定义标签')) {
          const worksheet = workbook.Sheets['自定义标签'];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          importedData.customTags = jsonData.map(row => row['标签名称']).filter(tag => tag);
        }

        // 读取岗位设置
        if (workbook.SheetNames.includes('岗位设置') || workbook.SheetNames.includes('岗位设置模板')) {
          const sheetName = workbook.SheetNames.includes('岗位设置') ? '岗位设置' : '岗位设置模板';
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          importedData.positions = jsonData.map((row, index) => ({
            id: `pos_imported_${Date.now()}_${index}`,
            name: row['岗位名称'] || '',
            requiredTags: row['要求标签'] ? row['要求标签'].split(',').map(tag => tag.trim()) : [],
            enableGroup: row['启用编组'] === '是',
            groupSize: row['每组人数'] ? parseInt(row['每组人数']) : 2,
            description: row['描述'] || '',
            assignedPersons: [],
            groups: []
          })).filter(position => position.name);
        }

        // 读取轮班规则
        if (workbook.SheetNames.includes('轮班规则')) {
          const worksheet = workbook.Sheets['轮班规则'];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          importedData.scheduleRules = jsonData.map((row, index) => ({
            id: `rule_imported_${Date.now()}_${index}`,
            positionId: '', // 需要后续匹配
            positionName: row['岗位名称'],
            rotationType: row['轮班方式'] === '每日轮换' ? 'daily' : 
                         row['轮班方式'] === '每周轮换' ? 'weekly' : 
                         row['轮班方式'] === '连班' ? 'continuous' : 'daily',
            continuousDays: row['连班天数'] ? parseInt(row['连班天数']) : 3,
            workdays: row['工作日'] ? row['工作日'].split(',').map(d => parseInt(d.trim())) : [1,2,3,4,5]
          }));
        }

        // 读取系统设置
        if (workbook.SheetNames.includes('系统设置')) {
          const worksheet = workbook.Sheets['系统设置'];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          const settingsMap = {};
          jsonData.forEach(row => {
            settingsMap[row['设置项']] = row['设置值'];
          });
          
          importedData.systemSettings = {
            organizationName: settingsMap['机构名称'] || '',
            contactPerson: settingsMap['联系人'] || '',
            contactPhone: settingsMap['联系电话'] || '',
            workDays: settingsMap['工作日'] ? settingsMap['工作日'].split(',').map(d => parseInt(d.trim())) : [1,2,3,4,5],
            workStartTime: settingsMap['上班时间'] || '08:00',
            workEndTime: settingsMap['下班时间'] || '18:00',
            maxContinuousDuty: settingsMap['最大连续值班天数'] ? parseInt(settingsMap['最大连续值班天数']) : 7,
            minRestDays: settingsMap['最少休息天数'] ? parseInt(settingsMap['最少休息天数']) : 1,
            enableNotifications: true
          };
        }

        // 显示导入预览
        setImportModalVisible(true);
        setImportPreview(importedData);
        
      } catch (error) {
        console.error('解析Excel文件失败:', error);
        message.error('解析Excel文件失败，请检查文件格式');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // 阻止自动上传
  };

  const [importPreview, setImportPreview] = useState({});

  // 确认导入
  const handleConfirmImport = () => {
    try {
      // 导入自定义标签
      if (importPreview.customTags && importPreview.customTags.length > 0) {
        const allTags = new Set([...localStorageService.getCustomTags(), ...importPreview.customTags]);
        localStorageService.saveCustomTags([...allTags]);
      }

      // 导入人员信息
      if (importPreview.personnel && importPreview.personnel.length > 0) {
        const existingPersonnel = localStorageService.getPersonnel();
        const mergedPersonnel = [...existingPersonnel, ...importPreview.personnel];
        localStorageService.savePersonnel(mergedPersonnel);
        
        // 收集人员标签并更新
        const allTags = new Set(localStorageService.getCustomTags());
        importPreview.personnel.forEach(person => {
          if (person.tags) {
            person.tags.forEach(tag => allTags.add(tag));
          }
        });
        localStorageService.saveCustomTags([...allTags]);
      }

      // 导入岗位设置
      if (importPreview.positions && importPreview.positions.length > 0) {
        const existingPositions = localStorageService.getPositions();
        const mergedPositions = [...existingPositions, ...importPreview.positions];
        localStorageService.savePositions(mergedPositions);
      }

      // 导入轮班规则
      if (importPreview.scheduleRules && importPreview.scheduleRules.length > 0) {
        // 需要匹配岗位ID
        const positions = localStorageService.getPositions();
        const rulesWithPositionId = importPreview.scheduleRules.map(rule => {
          const position = positions.find(p => p.name === rule.positionName);
          return {
            ...rule,
            positionId: position ? position.id : rule.positionId
          };
        });
        
        const existingRules = localStorageService.getScheduleRules();
        const mergedRules = [...existingRules, ...rulesWithPositionId];
        localStorageService.saveScheduleRules(mergedRules);
      }

      // 导入系统设置
      if (importPreview.systemSettings && Object.keys(importPreview.systemSettings).length > 0) {
        const currentSettings = localStorageService.getSystemSettings();
        const updatedSettings = {
          ...currentSettings,
          ...importPreview.systemSettings,
          updateTime: new Date().toISOString()
        };
        localStorageService.saveSystemSettings(updatedSettings);
      }

      setImportModalVisible(false);
      message.success('Excel数据导入成功，正在刷新页面...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('导入数据失败:', error);
      message.error('导入数据失败');
    }
  };

  // JSON导入（保留原功能）
  const handleImportJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // 导入新格式数据
        if (data.version === '2.0') {
          if (data.personnel) localStorageService.savePersonnel(data.personnel);
          if (data.customTags) localStorageService.saveCustomTags(data.customTags);
          if (data.positions) localStorageService.savePositions(data.positions);
          if (data.scheduleRules) localStorageService.saveScheduleRules(data.scheduleRules);
          if (data.dutySchedules) localStorageService.saveDutySchedules(data.dutySchedules);
          if (data.conflictRecords) localStorageService.saveConflictRecords(data.conflictRecords);
          if (data.substituteRecords) localStorageService.saveSubstituteRecordsSimple(data.substituteRecords);
          if (data.systemSettings) localStorageService.saveSystemSettings(data.systemSettings);
        } else {
          // 兼容旧格式数据导入
          localStorageService.importData(data);
        }
        
        message.success('JSON数据导入成功，请刷新页面查看效果');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error) {
        console.error('导入数据失败:', error);
        message.error('导入数据失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
    return false; // 阻止自动上传
  };

  const workdayOptions = [
    { label: '周一', value: 1 },
    { label: '周二', value: 2 },
    { label: '周三', value: 3 },
    { label: '周四', value: 4 },
    { label: '周五', value: 5 },
    { label: '周六', value: 6 },
    { label: '周日', value: 0 }
  ];

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Title level={3} style={{ margin: 0, marginBottom: '4px' }}>
          <SettingOutlined /> 系统设置
        </Title>
        <Text type="secondary">
          个性化配置系统参数和机构信息
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          organizationName: '值班排班系统',
          workDays: [1, 2, 3, 4, 5],
          workStartTime: '08:00',
          workEndTime: '18:00',
          enableNotifications: true,
          maxContinuousDuty: 7,
          minRestDays: 1
        }}
      >
        <Row gutter={[16, 16]}>
          {/* 机构信息 */}
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <BankOutlined />
                  <span>机构信息</span>
                </Space>
              }
              size="small"
              bodyStyle={{ padding: '12px' }}
            >
              <Row gutter={[12, 8]}>
                <Col xs={24} sm={24} md={12} lg={10}>
                  <Form.Item
                    name="organizationName"
                    label={
                      <Space size={4}>
                        <span>机构名称</span>
                        <Tooltip title="将显示在系统左上角标题位置">
                          <InfoCircleOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                        </Tooltip>
                      </Space>
                    }
                    rules={[{ required: true, message: '请输入机构名称' }]}
                    style={{ marginBottom: '8px' }}
                  >
                    <Input placeholder="如：XX公司值班管理系统" size="small" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={12} md={6} lg={6}>
                  <Form.Item
                    name="contactPerson"
                    label={
                      <Space size={4}>
                        <UserOutlined />
                        <span>联系人</span>
                      </Space>
                    }
                    style={{ marginBottom: '8px' }}
                  >
                    <Input placeholder="联系人姓名" size="small" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} sm={12} md={6} lg={8}>
                  <Form.Item
                    name="contactPhone"
                    label={
                      <Space size={4}>
                        <PhoneOutlined />
                        <span>联系电话</span>
                      </Space>
                    }
                    style={{ marginBottom: '8px' }}
                  >
                    <Input placeholder="138-0000-0000" size="small" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* 工作时间设置和值班规则 */}
          <Col xs={24} lg={12}>
            <Card 
              title="工作时间设置"
              size="small"
              bodyStyle={{ padding: '12px' }}
            >
              <Row gutter={[12, 8]}>
                <Col span={24}>
                  <Form.Item
                    name="workDays"
                    label="工作日"
                    style={{ marginBottom: '12px' }}
                  >
                    <Select
                      mode="multiple"
                      placeholder="选择工作日"
                      options={workdayOptions}
                      size="small"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="workStartTime"
                    label="上班时间"
                    style={{ marginBottom: '8px' }}
                  >
                    <Input placeholder="08:00" size="small" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="workEndTime"
                    label="下班时间"
                    style={{ marginBottom: '8px' }}
                  >
                    <Input placeholder="18:00" size="small" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card 
              title="值班规则"
              size="small"
              bodyStyle={{ padding: '12px' }}
            >
              <Row gutter={[12, 8]}>
                <Col span={12}>
                  <Form.Item
                    name="maxContinuousDuty"
                    label="最大连续值班天数"
                    style={{ marginBottom: '12px' }}
                  >
                    <InputNumber min={1} max={30} placeholder="7" style={{ width: '100%' }} size="small" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="minRestDays"
                    label="最少休息天数"
                    style={{ marginBottom: '12px' }}
                  >
                    <InputNumber min={0} max={7} placeholder="1" style={{ width: '100%' }} size="small" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="enableNotifications"
                    label="启用系统通知"
                    valuePropName="checked"
                    style={{ marginBottom: '8px' }}
                  >
                    <Switch size="small" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>



          {/* 数据管理 */}
          <Col span={24}>
            <Card 
              title="数据管理"
              size="small"
              bodyStyle={{ padding: '12px' }}
            >
              <Row gutter={[16, 12]}>
                {/* 导出功能 */}
                <Col xs={24} sm={12}>
                  <div>
                    <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>数据导出</Text>
                    <Space wrap size="small">
                      <Button
                        type="primary"
                        icon={<FileExcelOutlined />}
                        onClick={handleExportExcel}
                        size="small"
                      >
                        导出Excel
                      </Button>
                      <Button
                        icon={<ExportOutlined />}
                        onClick={handleExportJSON}
                        size="small"
                      >
                        导出JSON
                      </Button>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={handleClearAllData}
                        size="small"
                      >
                        清除数据
                      </Button>
                    </Space>
                    <div style={{ marginTop: '4px' }}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        Excel格式推荐，JSON格式为完整备份
                      </Text>
                    </div>
                  </div>
                </Col>

                {/* 导入功能 */}
                <Col xs={24} sm={12}>
                  <div>
                    <Text strong style={{ fontSize: '13px', marginBottom: '8px', display: 'block' }}>数据导入</Text>
                    <Space wrap size="small">
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadTemplate}
                        size="small"
                      >
                        下载模板
                      </Button>
                      <Upload
                        beforeUpload={handleImportExcel}
                        showUploadList={false}
                        accept=".xlsx,.xls"
                      >
                        <Button
                          icon={<FileExcelOutlined />}
                          size="small"
                        >
                          导入Excel
                        </Button>
                      </Upload>
                      <Upload
                        beforeUpload={handleImportJSON}
                        showUploadList={false}
                        accept=".json"
                      >
                        <Button
                          icon={<ImportOutlined />}
                          size="small"
                        >
                          导入JSON
                        </Button>
                      </Upload>
                    </Space>
                    <div style={{ marginTop: '4px' }}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        先下载模板填写，再导入Excel文件
                      </Text>
                    </div>
                  </div>
                </Col>
              </Row>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <Alert
                message="提醒：导入数据前建议先备份当前数据"
                type="warning"
                showIcon
                size="small"
                style={{ fontSize: '11px' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <Space>
            <Button onClick={handleReset} size="small">
              <UndoOutlined /> 重置
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} size="small">
              <SaveOutlined /> 保存设置
            </Button>
          </Space>
        </div>
      </Form>

      {/* 导入预览弹窗 */}
      <Modal
        title="导入数据预览"
        open={importModalVisible}
        onOk={handleConfirmImport}
        onCancel={() => setImportModalVisible(false)}
        width={900}
        okText="确认导入"
        cancelText="取消"
      >
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {/* 系统设置预览 */}
          {importPreview.systemSettings && Object.keys(importPreview.systemSettings).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <Title level={5}>系统设置：</Title>
              <Text>机构名称：{importPreview.systemSettings.organizationName}</Text><br/>
              <Text>联系人：{importPreview.systemSettings.contactPerson}</Text><br/>
              <Text>联系电话：{importPreview.systemSettings.contactPhone}</Text>
            </div>
          )}

          {/* 自定义标签预览 */}
          {importPreview.customTags && importPreview.customTags.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <Title level={5}>将导入 {importPreview.customTags.length} 个自定义标签：</Title>
              <Text>{importPreview.customTags.join('、')}</Text>
            </div>
          )}

          {/* 人员信息预览 */}
          {importPreview.personnel && importPreview.personnel.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <Title level={5}>将导入 {importPreview.personnel.length} 个人员：</Title>
              <Table
                dataSource={importPreview.personnel}
                columns={[
                  { title: '姓名', dataIndex: 'name', key: 'name', width: 80 },
                  { title: '标签', dataIndex: 'tags', key: 'tags', render: tags => tags.join(', '), width: 120 },
                  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
                  { title: '电话', dataIndex: 'phone', key: 'phone', width: 120 }
                ]}
                pagination={false}
                size="small"
                scroll={{ y: 150 }}
              />
            </div>
          )}
          
          {/* 岗位设置预览 */}
          {importPreview.positions && importPreview.positions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <Title level={5}>将导入 {importPreview.positions.length} 个岗位：</Title>
              <Table
                dataSource={importPreview.positions}
                columns={[
                  { title: '岗位名称', dataIndex: 'name', key: 'name', width: 100 },
                  { title: '要求标签', dataIndex: 'requiredTags', key: 'requiredTags', render: tags => tags.join(', '), width: 120 },
                  { title: '启用编组', dataIndex: 'enableGroup', key: 'enableGroup', render: enable => enable ? '是' : '否', width: 80 },
                  { title: '描述', dataIndex: 'description', key: 'description' }
                ]}
                pagination={false}
                size="small"
                scroll={{ y: 150 }}
              />
            </div>
          )}

          {/* 轮班规则预览 */}
          {importPreview.scheduleRules && importPreview.scheduleRules.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <Title level={5}>将导入 {importPreview.scheduleRules.length} 个轮班规则：</Title>
              <Table
                dataSource={importPreview.scheduleRules}
                columns={[
                  { title: '岗位', dataIndex: 'positionName', key: 'positionName', width: 100 },
                  { title: '轮班方式', dataIndex: 'rotationType', key: 'rotationType', 
                    render: type => type === 'daily' ? '每日轮换' : type === 'weekly' ? '每周轮换' : '连班', width: 100 },
                  { title: '连班天数', dataIndex: 'continuousDays', key: 'continuousDays', width: 80 },
                  { title: '工作日', dataIndex: 'workdays', key: 'workdays', render: days => days.join(',') }
                ]}
                pagination={false}
                size="small"
                scroll={{ y: 150 }}
              />
            </div>
          )}

          {!importPreview.personnel?.length && !importPreview.positions?.length && 
           !importPreview.customTags?.length && !importPreview.scheduleRules?.length &&
           !Object.keys(importPreview.systemSettings || {}).length && (
            <Alert
              message="未检测到可导入的数据"
              description="请检查Excel文件格式是否正确，或者文件中是否包含数据。"
              type="warning"
              showIcon
            />
          )}
        </div>
      </Modal>


    </div>
  );
};

export default SystemSettings; 