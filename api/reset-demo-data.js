import { connectToDatabase } from './_db';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).json({ error: '未授权' });
  try {
    const token = authorization.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: '仅限admin操作' });
    const { db } = await connectToDatabase();
    
    // 清空所有业务数据
    await db.collection('personnel').deleteMany({});
    await db.collection('positions').deleteMany({});
    await db.collection('scheduleRules').deleteMany({});
    await db.collection('dutySchedules').deleteMany({});
    await db.collection('customTags').deleteMany({});
    await db.collection('conflictRecords').deleteMany({});
    await db.collection('substituteRecords').deleteMany({});
    
    // 插入演示人员数据
    await db.collection('personnel').insertMany([
      { 
        id: '1', 
        name: '张主任', 
        tag: 'leader_tag', 
        status: '出差', 
        phone: '13800001001',
        email: 'zhang@example.com',
        department: '管理部',
        position: '主任',
        notes: '部门主管',
        statusPeriod: { start: '2024-01-15', end: '2024-01-20' },
        statusReason: '出差开会',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      { 
        id: '2', 
        name: '李经理', 
        tag: 'leader_tag', 
        status: '在岗', 
        phone: '13800001002',
        email: 'li@example.com',
        department: '管理部',
        position: '经理',
        notes: '副主管',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      { 
        id: '3', 
        name: '王总监', 
        tag: 'leader_tag', 
        status: '在岗', 
        phone: '13800001003',
        email: 'wang@example.com',
        department: '管理部',
        position: '总监',
        notes: '高级管理',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      { 
        id: '4', 
        name: '陈小明', 
        tag: 'staff_tag', 
        status: '在岗', 
        phone: '13800002001',
        email: 'chen@example.com',
        department: '技术部',
        position: '工程师',
        notes: '技术骨干',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      { 
        id: '5', 
        name: '刘小红', 
        tag: 'staff_tag', 
        status: '在岗', 
        phone: '13800002002',
        email: 'liu@example.com',
        department: '技术部',
        position: '工程师',
        notes: '新人',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      { 
        id: '6', 
        name: '赵监督', 
        tag: 'supervisor_tag', 
        status: '在岗', 
        phone: '13800003001',
        email: 'zhao@example.com',
        department: '监督部',
        position: '监督员',
        notes: '资深监督',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      { 
        id: '7', 
        name: '孙监督', 
        tag: 'supervisor_tag', 
        status: '在岗', 
        phone: '13800003002',
        email: 'sun@example.com',
        department: '监督部',
        position: '监督员',
        notes: '监督员',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      { 
        id: '8', 
        name: '周中层', 
        tag: 'middle_tag', 
        status: '在岗', 
        phone: '13800004001',
        email: 'zhou@example.com',
        department: '运营部',
        position: '主管',
        notes: '中层管理',
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
    ]);

    // 插入自定义标签
    await db.collection('customTags').insertMany([
      { id: '1', name: '领导' },
      { id: '2', name: '职工' },
      { id: '3', name: '监督员' },
      { id: '4', name: '中层' }
    ]);

    // 插入岗位数据
    await db.collection('positions').insertMany([
      {
        id: 'pos_001',
        name: '前台接待',
        description: '负责前台接待和咨询工作',
        requiredTags: ['staff_tag'],
        priority: 1,
        minStaff: 1,
        maxStaff: 2,
        workHours: {
          start: '09:00',
          end: '18:00',
          lunchStart: '12:00',
          lunchEnd: '13:00'
        },
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      {
        id: 'pos_002',
        name: '安全巡查',
        description: '负责安全巡查和监控工作',
        requiredTags: ['supervisor_tag'],
        priority: 2,
        minStaff: 1,
        maxStaff: 1,
        workHours: {
          start: '08:00',
          end: '20:00',
          lunchStart: '12:00',
          lunchEnd: '13:00'
        },
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      {
        id: 'pos_003',
        name: '值班领导',
        description: '负责值班期间的领导工作',
        requiredTags: ['leader_tag'],
        priority: 3,
        minStaff: 1,
        maxStaff: 1,
        workHours: {
          start: '09:00',
          end: '17:00',
          lunchStart: '12:00',
          lunchEnd: '13:00'
        },
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
    ]);

    // 插入轮班规则
    await db.collection('scheduleRules').insertMany([
      {
        id: 'rule_001',
        name: '标准工作日',
        description: '周一至周五的标准工作安排',
        type: 'weekly',
        pattern: {
          monday: { enabled: true, positions: ['pos_001', 'pos_003'] },
          tuesday: { enabled: true, positions: ['pos_001', 'pos_003'] },
          wednesday: { enabled: true, positions: ['pos_001', 'pos_003'] },
          thursday: { enabled: true, positions: ['pos_001', 'pos_003'] },
          friday: { enabled: true, positions: ['pos_001', 'pos_003'] },
          saturday: { enabled: false, positions: [] },
          sunday: { enabled: false, positions: [] }
        },
        workHours: {
          start: '09:00',
          end: '18:00',
          lunchStart: '12:00',
          lunchEnd: '13:00'
        },
        priority: 1,
        enabled: true,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      },
      {
        id: 'rule_002',
        name: '周末值班',
        description: '周六周日的值班安排',
        type: 'weekly',
        pattern: {
          monday: { enabled: false, positions: [] },
          tuesday: { enabled: false, positions: [] },
          wednesday: { enabled: false, positions: [] },
          thursday: { enabled: false, positions: [] },
          friday: { enabled: false, positions: [] },
          saturday: { enabled: true, positions: ['pos_001', 'pos_002'] },
          sunday: { enabled: true, positions: ['pos_001', 'pos_002'] }
        },
        workHours: {
          start: '09:00',
          end: '17:00',
          lunchStart: '12:00',
          lunchEnd: '13:00'
        },
        priority: 2,
        enabled: true,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
    ]);

    // 生成一些演示排班数据
    const today = new Date();
    const schedules = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // 工作日排班
      if (date.getDay() >= 1 && date.getDay() <= 5) {
        schedules.push({
          id: `schedule_${i}_1`,
          date: dateStr,
          positionId: 'pos_001',
          positionName: '前台接待',
          assignedPersonId: i % 2 === 0 ? '4' : '5',
          isGroup: false,
          workHours: { start: '09:00', end: '18:00' },
          createTime: new Date().toISOString()
        });
        
        schedules.push({
          id: `schedule_${i}_2`,
          date: dateStr,
          positionId: 'pos_003',
          positionName: '值班领导',
          assignedPersonId: i % 3 === 0 ? '2' : '3',
          isGroup: false,
          workHours: { start: '09:00', end: '17:00' },
          createTime: new Date().toISOString()
        });
      } else {
        // 周末排班
        schedules.push({
          id: `schedule_${i}_3`,
          date: dateStr,
          positionId: 'pos_002',
          positionName: '安全巡查',
          assignedPersonId: i % 2 === 0 ? '6' : '7',
          isGroup: false,
          workHours: { start: '08:00', end: '20:00' },
          createTime: new Date().toISOString()
        });
      }
    }

    await db.collection('dutySchedules').insertMany(schedules);

    res.status(200).json({ 
      success: true, 
      message: '演示数据重置成功',
      summary: {
        personnel: 8,
        positions: 3,
        rules: 2,
        schedules: schedules.length
      }
    });
  } catch (e) {
    console.error('重置演示数据失败:', e);
    res.status(500).json({ error: '重置演示数据失败' });
  }
} 