// 值班管理系统 - 本地存储服务
import webStorage from './tauriStorageService';

class LocalStorageService {
  constructor() {
    this.EMPLOYEES_KEY = 'duty_employees';
    this.DUTY_SCHEDULES_KEY = 'duty_schedules';
    this.DUTY_GROUPS_KEY = 'duty_groups';
    this.EMPLOYEE_STATUS_RECORDS_KEY = 'employee_status_records';
    this.SUBSTITUTE_RECORDS_KEY = 'substitute_records';
    this.SETTINGS_KEY = 'duty_settings';
    this.ATTENDANCE_SUPERVISOR_GROUPS_KEY = 'attendance_supervisor_groups';
    this.SCHEDULE_PLANS_KEY = 'schedule_plans'; // 新增排班计划存储
    this.USERS_KEY = 'system_users'; // 新增用户管理存储
    this.USER_SESSIONS_KEY = 'user_sessions'; // 新增用户会话存储
    
    // 初始化默认数据
    this.initializeDefaultData();
  }

  // 智能存储：使用Web存储
  async smartSave(key, data) {
    return await webStorage.saveData(key, data);
  }

  // 智能读取：使用Web存储  
  async smartLoad(key, defaultValue = null) {
    return await webStorage.loadData(key, defaultValue);
  }

  initializeDefaultData() {
    // 如果没有设置，初始化默认设置
    if (!localStorage.getItem(this.SETTINGS_KEY)) {
      const defaultSettings = {
        // 员工级别定义
        employeeLevels: [
          { id: 'leader', name: '领导', canLeadDuty: true, priority: 1 },
          { id: 'supervisor', name: '主管', canLeadDuty: true, priority: 2 },
          { id: 'senior', name: '资深员工', canLeadDuty: true, priority: 3 },
          { id: 'regular', name: '普通员工', canLeadDuty: false, priority: 4 },
          { id: 'intern', name: '实习生', canLeadDuty: false, priority: 5 }
        ],
        // 员工标签定义 - 新增
        employeeTags: [
          { id: 'leader_tag', name: '领导', color: 'red', dutyRole: 'leader' },
          { id: 'staff_tag', name: '职工', color: 'blue', dutyRole: 'staff' },
          { id: 'supervisor_tag', name: '考勤监督员', color: 'green', dutyRole: 'attendance_supervisor' }
        ],
        // 值班类型定义
        dutyTypes: [
          { 
            id: 'day_duty', 
            name: '白班值班', 
            startTime: '08:00', 
            endTime: '20:00', 
            duration: 12,
            color: '#52c41a'
          },
          { 
            id: 'night_duty', 
            name: '夜班值班', 
            startTime: '20:00', 
            endTime: '08:00', 
            duration: 12,
            color: '#1890ff'
          },
          { 
            id: 'full_duty', 
            name: '24小时值班', 
            startTime: '00:00', 
            endTime: '23:59', 
            duration: 24,
            color: '#722ed1'
          }
        ],
        // 员工状态类型定义
        employeeStatusTypes: [
          { id: 'active', name: '正常在职', color: 'green', allowDuty: true },
          { id: 'sick_leave', name: '病假', color: 'red', allowDuty: false, requireApproval: true },
          { id: 'personal_leave', name: '事假', color: 'orange', allowDuty: false, requireApproval: true },
          { id: 'annual_leave', name: '年假', color: 'blue', allowDuty: false, requireApproval: true },
          { id: 'business_trip', name: '出差', color: 'purple', allowDuty: false, requireApproval: true },
          { id: 'training', name: '培训', color: 'cyan', allowDuty: false, requireApproval: true },
          { id: 'maternity_leave', name: '产假', color: 'magenta', allowDuty: false, requireApproval: true },
          { id: 'inactive', name: '离职', color: 'default', allowDuty: false, requireApproval: false },
          { id: 'other', name: '其他', color: 'default', allowDuty: false, requireApproval: true }
        ],
        // 值班规则 - 扩展
        dutyRules: {
          requireLeaderInDuty: true,
          minRestDays: 1,
          maxContinuousDuty: 7,
          enableSubstitute: true,
          // 新增复杂排班规则
          advancedScheduling: {
            leaderRotation: {
              enabled: true,
              pattern: 'daily', // daily - 每日轮换
              order: [] // 轮换顺序，将由用户设置
            },
            staffRotation: {
              enabled: true,
              mondayToThursday: {
                pattern: 'daily', // 一人一天
                order: [] // 轮换顺序
              },
              fridayToSunday: {
                pattern: 'continuous_three_days', // 连班三天
                order: [] // 轮换顺序
              }
            },
            attendanceSupervision: {
              enabled: true,
              workdaysOnly: true, // 仅工作日
              groups: [], // 固定编组
              rotationPattern: 'weekly' // 每周轮换
            }
          }
        }
      };
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(defaultSettings));
    }

    // 数据迁移：将旧的leave_records转换为新的employee_status_records
    this.migrateLeaveRecordsToStatusRecords();
  }

  // 数据迁移方法
  migrateLeaveRecordsToStatusRecords() {
    const oldLeaveRecords = localStorage.getItem('leave_records');
    const newStatusRecords = localStorage.getItem(this.EMPLOYEE_STATUS_RECORDS_KEY);
    
    if (oldLeaveRecords && !newStatusRecords) {
      try {
        const leaveData = JSON.parse(oldLeaveRecords);
        const statusRecords = leaveData.map(leave => ({
          id: leave.id,
          employeeId: leave.employeeId,
          statusType: leave.type, // sick_leave, personal_leave等
          startDate: leave.startDate,
          endDate: leave.endDate,
          reason: leave.reason,
          remarks: leave.remarks || '',
          status: leave.status, // pending, approved, rejected
          createdAt: leave.createdAt,
          approvedAt: leave.approvedAt,
          rejectedAt: leave.rejectedAt,
          updatedAt: leave.updatedAt
        }));
        
        localStorage.setItem(this.EMPLOYEE_STATUS_RECORDS_KEY, JSON.stringify(statusRecords));
        console.log('已完成请假记录到员工状态记录的数据迁移');
      } catch (error) {
        console.error('数据迁移失败:', error);
      }
    }
  }

  // =================== 新的简化数据结构 ===================
  
  // 人员管理
  getPersonnel() {
    try {
      const data = localStorage.getItem('paiban_personnel');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取人员数据失败:', error);
      return [];
    }
  }

  savePersonnel(personnel) {
    try {
      localStorage.setItem('paiban_personnel', JSON.stringify(personnel));
      return true;
    } catch (error) {
      console.error('保存人员数据失败:', error);
      return false;
    }
  }

  // 自定义标签
  getCustomTags() {
    try {
      const data = localStorage.getItem('paiban_custom_tags');
      return data ? JSON.parse(data) : ['领导', '职工', '中层'];
    } catch (error) {
      console.error('获取标签数据失败:', error);
      return ['领导', '职工', '中层'];
    }
  }

  saveCustomTags(tags) {
    try {
      localStorage.setItem('paiban_custom_tags', JSON.stringify(tags));
      return true;
    } catch (error) {
      console.error('保存标签数据失败:', error);
      return false;
    }
  }

  // 岗位管理
  getPositions() {
    try {
      const data = localStorage.getItem('paiban_positions');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取岗位数据失败:', error);
      return [];
    }
  }

  savePositions(positions) {
    try {
      localStorage.setItem('paiban_positions', JSON.stringify(positions));
      return true;
    } catch (error) {
      console.error('保存岗位数据失败:', error);
      return false;
    }
  }

  // 轮班规则
  getScheduleRules() {
    try {
      const data = localStorage.getItem('paiban_schedule_rules_new');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取轮班规则失败:', error);
      return [];
    }
  }

  saveScheduleRules(rules) {
    try {
      localStorage.setItem('paiban_schedule_rules_new', JSON.stringify(rules));
      return true;
    } catch (error) {
      console.error('保存轮班规则失败:', error);
      return false;
    }
  }

  // 冲突记录管理
  getConflictRecords() {
    try {
      const data = localStorage.getItem('paiban_conflict_records');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取冲突记录失败:', error);
      return [];
    }
  }

  saveConflictRecords(records) {
    try {
      localStorage.setItem('paiban_conflict_records', JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('保存冲突记录失败:', error);
      return false;
    }
  }

  addConflictRecord(conflict) {
    const conflicts = this.getConflictRecords();
    const newConflict = {
      id: `conflict_${Date.now()}`,
      ...conflict,
      createTime: new Date().toISOString(),
      status: 'pending' // pending, resolved, ignored
    };
    conflicts.push(newConflict);
    this.saveConflictRecords(conflicts);
    return newConflict;
  }

  // 自动检测排班冲突
  detectScheduleConflicts() {
    const schedules = this.getDutySchedules();
    const personnel = this.getPersonnel();
    const conflicts = [];

    schedules.forEach(schedule => {
      const scheduleDate = this.parseDate(schedule.date);
      
      if (schedule.isGroup) {
        // 检查编组成员状态
        schedule.assignedPersonIds?.forEach(personId => {
          const person = personnel.find(p => p.id === personId);
          if (person && this.isPersonUnavailableOnDate(person, scheduleDate)) {
            const conflictId = `${schedule.id}_${personId}`;
            // 检查是否已存在相同冲突
            const existingConflicts = this.getConflictRecords();
            const exists = existingConflicts.some(c => c.id === conflictId && c.status === 'pending');
            
            if (!exists) {
              const conflict = {
                id: conflictId,
                type: 'group',
                date: schedule.date,
                positionName: this.getPositionName(schedule.positionId),
                personName: person.name,
                personId: person.id,
                personStatus: person.status,
                statusPeriod: person.statusPeriod,
                scheduleId: schedule.id,
                reason: this.getConflictReason(person, scheduleDate),
                createTime: new Date().toISOString(),
                status: 'pending'
              };
              conflicts.push(conflict);
            }
          }
        });
      } else {
        // 检查个人值班状态
        const person = personnel.find(p => p.id === schedule.assignedPersonId);
        if (person && this.isPersonUnavailableOnDate(person, scheduleDate)) {
          const conflictId = `${schedule.id}_${person.id}`;
          // 检查是否已存在相同冲突
          const existingConflicts = this.getConflictRecords();
          const exists = existingConflicts.some(c => c.id === conflictId && c.status === 'pending');
          
          if (!exists) {
            const conflict = {
              id: conflictId,
              type: 'individual',
              date: schedule.date,
              positionName: this.getPositionName(schedule.positionId),
              personName: person.name,
              personId: person.id,
              personStatus: person.status,
              statusPeriod: person.statusPeriod,
              scheduleId: schedule.id,
              reason: this.getConflictReason(person, scheduleDate),
              createTime: new Date().toISOString(),
              status: 'pending'
            };
            conflicts.push(conflict);
          }
        }
      }
    });

    // 保存新检测到的冲突
    if (conflicts.length > 0) {
      const existingConflicts = this.getConflictRecords();
      const allConflicts = [...existingConflicts, ...conflicts];
      this.saveConflictRecords(allConflicts);
    }

    return conflicts;
  }

  // 解析日期字符串
  parseDate(dateStr) {
    return new Date(dateStr + 'T00:00:00.000Z');
  }

  // 判断人员在指定日期是否不可用
  isPersonUnavailableOnDate(person, date) {
    if (person.status === '在岗') return false;
    if (!person.statusPeriod) return person.status !== '在岗';
    
    const startDate = new Date(person.statusPeriod.start + 'T00:00:00.000Z');
    const endDate = new Date(person.statusPeriod.end + 'T23:59:59.999Z');
    return date >= startDate && date <= endDate;
  }

  // 获取岗位名称
  getPositionName(positionId) {
    const positions = this.getPositions();
    const position = positions.find(p => p.id === positionId);
    return position?.name || '值班';
  }

  // 获取冲突原因描述
  getConflictReason(person, date) {
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
    const statusText = statusMapping[person.status] || person.status || '未知';
    if (statusText === '在岗') return '人员状态正常';
    let reason = `人员状态：${statusText}`;
    if (person.statusPeriod) {
      reason += `（${person.statusPeriod.start} 至 ${person.statusPeriod.end}）`;
    }
    if (person.statusReason) {
      reason += `，原因：${person.statusReason}`;
    }
    return reason;
  }

  resolveConflict(conflictId, resolution) {
    const conflicts = this.getConflictRecords();
    const index = conflicts.findIndex(c => c.id === conflictId);
    if (index !== -1) {
      conflicts[index] = {
        ...conflicts[index],
        status: 'resolved',
        resolution: resolution,
        resolveTime: new Date().toISOString()
      };
      this.saveConflictRecords(conflicts);
      return true;
    }
    return false;
  }

  // 简化版替班记录管理
  getSubstituteRecordsSimple() {
    try {
      const data = localStorage.getItem('paiban_substitute_records_simple');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取替班记录失败:', error);
      return [];
    }
  }

  saveSubstituteRecordsSimple(records) {
    try {
      localStorage.setItem('paiban_substitute_records_simple', JSON.stringify(records));
      return true;
    } catch (error) {
      console.error('保存替班记录失败:', error);
      return false;
    }
  }

  addSubstituteRecordSimple(substitute) {
    const substitutes = this.getSubstituteRecordsSimple();
    const newSubstitute = {
      id: `substitute_${Date.now()}`,
      ...substitute,
      createTime: new Date().toISOString(),
      status: 'approved' // 直接设为已批准，简化流程
    };
    substitutes.push(newSubstitute);
    this.saveSubstituteRecordsSimple(substitutes);
    return newSubstitute;
  }

  approveSubstituteSimple(substituteId) {
    const substitutes = this.getSubstituteRecordsSimple();
    const index = substitutes.findIndex(s => s.id === substituteId);
    if (index !== -1) {
      substitutes[index].status = 'approved';
      substitutes[index].approveTime = new Date().toISOString();
      this.saveSubstituteRecordsSimple(substitutes);
      
      // 更新排班表
      this.updateScheduleForSubstituteSimple(substitutes[index]);
      return true;
    }
    return false;
  }

  updateScheduleForSubstituteSimple(substitute) {
    const schedules = this.getDutySchedules();
    const scheduleIndex = schedules.findIndex(s => s.id === substitute.scheduleId);
    
    if (scheduleIndex !== -1) {
      if (substitute.type === 'individual') {
        schedules[scheduleIndex].assignedPersonId = substitute.substitutePersonId;
        schedules[scheduleIndex].originalPersonId = substitute.originalPersonId;
        schedules[scheduleIndex].isSubstituted = true;
        schedules[scheduleIndex].substituteRecordId = substitute.id;
      } else if (substitute.type === 'group') {
        const memberIndex = schedules[scheduleIndex].assignedPersonIds.indexOf(substitute.originalPersonId);
        if (memberIndex !== -1) {
          schedules[scheduleIndex].assignedPersonIds[memberIndex] = substitute.substitutePersonId;
          schedules[scheduleIndex].substitutedMembers = schedules[scheduleIndex].substitutedMembers || [];
          schedules[scheduleIndex].substitutedMembers.push({
            original: substitute.originalPersonId,
            substitute: substitute.substitutePersonId,
            recordId: substitute.id
          });
        }
      }
      
      this.saveDutySchedules(schedules);
    }
  }

  // =================== 员工管理 ===================
  getEmployees() {
    const data = localStorage.getItem(this.EMPLOYEES_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveEmployees(employees) {
    localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(employees));
  }

  addEmployee(employee) {
    try {
      // 数据验证
      if (!employee.name) {
        throw new Error('员工姓名为必填项');
      }
      
      if (!employee.tags || employee.tags.length === 0) {
        throw new Error('请至少选择一个角色标签');
      }
      
      // 检查姓名重复（移除工号重复检查，因为工号不再是必填项）
      const employees = this.getEmployees();
      if (employees.some(emp => emp.name === employee.name)) {
        throw new Error('员工姓名已存在，请使用不同的姓名');
      }
      
      const newEmployee = {
        ...employee,
        id: Date.now().toString(),
        employeeId: employee.employeeId || `EMP${Date.now()}`,
        department: employee.department || '', // 可选字段
        level: employee.level || '', // 可选字段
        createdAt: new Date().toISOString(),
        status: employee.status || 'active', // 使用用户选择的状态，默认为active
        tags: employee.tags || [], // 人员标签
        qualifications: employee.qualifications || [], // 资质认证
        maxContinuousDuty: employee.maxContinuousDuty || 7, // 最大连续值班天数
        preferredPartner: employee.preferredPartner || null // 首选搭档
      };
      employees.push(newEmployee);
      this.saveEmployees(employees);
      return newEmployee;
    } catch (error) {
      console.error('添加员工失败:', error);
      throw error;
    }
  }

  updateEmployee(id, updatedEmployee) {
    const employees = this.getEmployees();
    const index = employees.findIndex(emp => emp.id === id);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...updatedEmployee, updatedAt: new Date().toISOString() };
      this.saveEmployees(employees);
      return employees[index];
    }
    return null;
  }

  deleteEmployee(id) {
    const employees = this.getEmployees();
    const filteredEmployees = employees.filter(emp => emp.id !== id);
    this.saveEmployees(filteredEmployees);
    
    // 同时删除相关的值班记录
    const schedules = this.getDutySchedules();
    const filteredSchedules = schedules.filter(schedule => 
      !schedule.dutyStaff.some(staff => staff.employeeId === id)
    );
    this.saveDutySchedules(filteredSchedules);
  }

  // =================== 编组管理 ===================
  getDutyGroups() {
    const data = localStorage.getItem(this.DUTY_GROUPS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveDutyGroups(groups) {
    localStorage.setItem(this.DUTY_GROUPS_KEY, JSON.stringify(groups));
  }

  addDutyGroup(group) {
    try {
      if (!group.name || !group.members || group.members.length < 2) {
        throw new Error('编组名称和至少2名成员为必填项');
      }

      const groups = this.getDutyGroups();
      const newGroup = {
        ...group,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: 'active' // active, inactive
      };
      groups.push(newGroup);
      this.saveDutyGroups(groups);
      return newGroup;
    } catch (error) {
      console.error('添加编组失败:', error);
      throw error;
    }
  }

  // =================== 考勤监督员编组管理 ===================
  getAttendanceSupervisorGroups() {
    const data = localStorage.getItem(this.ATTENDANCE_SUPERVISOR_GROUPS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveAttendanceSupervisorGroups(groups) {
    localStorage.setItem(this.ATTENDANCE_SUPERVISOR_GROUPS_KEY, JSON.stringify(groups));
  }

  addAttendanceSupervisorGroup(group) {
    try {
      if (!group.name || !group.members || group.members.length !== 2) {
        throw new Error('考勤监督员编组需要固定2名成员');
      }

      // 验证成员是否有考勤监督员标签
      const employees = this.getEmployees();
      for (const memberId of group.members) {
        const employee = employees.find(emp => emp.id === memberId);
        if (!employee || !employee.tags || !employee.tags.includes('supervisor_tag')) {
          throw new Error('编组成员必须具有考勤监督员标签');
        }
      }

      const groups = this.getAttendanceSupervisorGroups();
      const newGroup = {
        ...group,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: 'active',
        rotationOrder: group.rotationOrder || groups.length // 轮换顺序
      };
      groups.push(newGroup);
      this.saveAttendanceSupervisorGroups(groups);
      return newGroup;
    } catch (error) {
      console.error('添加考勤监督员编组失败:', error);
      throw error;
    }
  }

  updateAttendanceSupervisorGroup(id, updatedGroup) {
    const groups = this.getAttendanceSupervisorGroups();
    const index = groups.findIndex(group => group.id === id);
    if (index !== -1) {
      groups[index] = { ...groups[index], ...updatedGroup, updatedAt: new Date().toISOString() };
      this.saveAttendanceSupervisorGroups(groups);
      return groups[index];
    }
    return null;
  }

  deleteAttendanceSupervisorGroup(id) {
    const groups = this.getAttendanceSupervisorGroups();
    const filteredGroups = groups.filter(group => group.id !== id);
    this.saveAttendanceSupervisorGroups(filteredGroups);
  }

  // 获取当前周应该值班的考勤监督员组
  getCurrentAttendanceSupervisorGroup(date) {
    const groups = this.getAttendanceSupervisorGroups().filter(g => g.status === 'active');
    if (groups.length === 0) return null;

    // 计算是第几周（从2024年1月1日开始计算）
    const startDate = new Date('2024-01-01');
    const currentDate = new Date(date);
    const weekNumber = Math.floor((currentDate - startDate) / (7 * 24 * 60 * 60 * 1000));
    
    return groups[weekNumber % groups.length];
  }

  // =================== 值班排班管理 ===================
  getDutySchedules() {
    const data = localStorage.getItem(this.DUTY_SCHEDULES_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveDutySchedules(schedules) {
    localStorage.setItem(this.DUTY_SCHEDULES_KEY, JSON.stringify(schedules));
  }

  addDutySchedule(schedule) {
    try {
      // 数据验证
      if (!schedule.date || !schedule.dutyType || !schedule.dutyStaff || schedule.dutyStaff.length === 0) {
        throw new Error('日期、值班类型和值班人员为必填项');
      }

      // 检查值班冲突
      const schedules = this.getDutySchedules();
      const conflictSchedule = schedules.find(s => 
        s.date === schedule.date && 
        s.dutyType === schedule.dutyType &&
        s.status !== 'cancelled'
      );
      
      if (conflictSchedule) {
        throw new Error('该日期该班次已有值班安排');
      }

      // 检查人员是否可用（使用新的状态检查方法）
      for (const staff of schedule.dutyStaff) {
        if (!this.isEmployeeAvailable(staff.employeeId, schedule.date)) {
          const employee = this.getEmployees().find(emp => emp.id === staff.employeeId);
          const currentStatus = this.getEmployeeCurrentStatus(staff.employeeId, schedule.date);
          const settings = this.getSettings();
          const statusType = settings.employeeStatusTypes.find(type => type.id === currentStatus);
          throw new Error(`${employee?.name || '员工'} 在该日期状态为"${statusType?.name || currentStatus}"，无法安排值班`);
        }
      }

      // 检查是否需要领导值班
      const settings = this.getSettings();
      if (settings.dutyRules.requireLeaderInDuty) {
        const hasLeader = schedule.dutyStaff.some(staff => {
          const employee = this.getEmployees().find(emp => emp.id === staff.employeeId);
          const level = settings.employeeLevels.find(level => level.id === employee?.level);
          return level?.canLeadDuty;
        });
        if (!hasLeader) {
          throw new Error('值班人员中必须包含至少一名领导');
        }
      }

      const newSchedule = {
        ...schedule,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: 'scheduled', // scheduled, completed, cancelled
        hasSubstitute: false
      };
      
      schedules.push(newSchedule);
      this.saveDutySchedules(schedules);
      return newSchedule;
    } catch (error) {
      console.error('添加值班安排失败:', error);
      throw error;
    }
  }

  // =================== 员工状态管理 ===================
  getEmployeeStatusRecords() {
    const data = localStorage.getItem(this.EMPLOYEE_STATUS_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveEmployeeStatusRecords(records) {
    localStorage.setItem(this.EMPLOYEE_STATUS_RECORDS_KEY, JSON.stringify(records));
  }

  addEmployeeStatusRecord(record) {
    try {
      if (!record.employeeId || !record.statusType || !record.startDate || !record.endDate) {
        throw new Error('员工、状态类型、开始日期和结束日期为必填项');
      }

      // 检查时间段冲突
      const records = this.getEmployeeStatusRecords();
      const conflictRecord = records.find(r => 
        r.employeeId === record.employeeId &&
        r.status === 'approved' &&
        r.statusType !== 'active' &&
        ((new Date(record.startDate) >= new Date(r.startDate) && new Date(record.startDate) <= new Date(r.endDate)) ||
         (new Date(record.endDate) >= new Date(r.startDate) && new Date(record.endDate) <= new Date(r.endDate)) ||
         (new Date(record.startDate) <= new Date(r.startDate) && new Date(record.endDate) >= new Date(r.endDate)))
      );
      
      if (conflictRecord) {
        throw new Error('该时间段与现有状态记录冲突');
      }

      const newRecord = {
        ...record,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: 'approved' // 直接批准，无需审批流程
      };
      
      records.push(newRecord);
      this.saveEmployeeStatusRecords(records);
      
      // 自动更新员工基础状态
      const currentDate = new Date();
      if (new Date(record.startDate) <= currentDate && new Date(record.endDate) >= currentDate) {
        this.updateEmployeeBaseStatus(record.employeeId, record.statusType);
      }
      
      return newRecord;
    } catch (error) {
      console.error('添加员工状态记录失败:', error);
      throw error;
    }
  }

  // 更新员工基础状态
  updateEmployeeBaseStatus(employeeId, status) {
    const employees = this.getEmployees();
    const employeeIndex = employees.findIndex(emp => emp.id === employeeId);
    if (employeeIndex !== -1) {
      employees[employeeIndex].status = status;
      this.saveEmployees(employees);
    }
  }

  // 获取员工当前状态
  getEmployeeCurrentStatus(employeeId, date = null) {
    const targetDate = date ? new Date(date) : new Date();
    const records = this.getEmployeeStatusRecords();
    
    // 查找在指定日期有效的状态记录
    const activeRecord = records.find(record => 
      record.employeeId === employeeId &&
      record.status === 'approved' &&
      new Date(record.startDate) <= targetDate &&
      new Date(record.endDate) >= targetDate
    );
    
    return activeRecord ? activeRecord.statusType : 'active';
  }

  // 获取某个时间段内不可用的员工
  getUnavailableEmployees(startDate, endDate) {
    const records = this.getEmployeeStatusRecords();
    const settings = this.getSettings();
    const unavailableEmployees = new Set();
    
    records.forEach(record => {
      if (record.status === 'approved') {
        const statusType = settings.employeeStatusTypes.find(type => type.id === record.statusType);
        if (statusType && !statusType.allowDuty &&
            new Date(record.startDate) <= new Date(endDate) &&
            new Date(record.endDate) >= new Date(startDate)) {
          unavailableEmployees.add(record.employeeId);
        }
      }
    });
    
    return Array.from(unavailableEmployees);
  }

  // 检查员工在指定日期是否可用
  isEmployeeAvailable(employeeId, date) {
    const currentStatus = this.getEmployeeCurrentStatus(employeeId, date);
    const settings = this.getSettings();
    const statusType = settings.employeeStatusTypes.find(type => type.id === currentStatus);
    return statusType ? statusType.allowDuty : false;
  }

  // 批准状态记录（保留API兼容性，但直接返回成功）
  approveStatusRecord(recordId) {
    return true; // 无需审批，直接成功
  }

  // 拒绝状态记录（保留API兼容性，但直接返回成功）
  rejectStatusRecord(recordId) {
    return true; // 无需审批，直接成功
  }

  // =================== 替班管理 ===================
  getSubstituteRecords() {
    const data = localStorage.getItem(this.SUBSTITUTE_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveSubstituteRecords(records) {
    localStorage.setItem(this.SUBSTITUTE_RECORDS_KEY, JSON.stringify(records));
  }

  addSubstituteRecord(record) {
    try {
      if (!record.originalEmployeeId || !record.substituteEmployeeId || !record.scheduleId) {
        throw new Error('原值班人员、替班人员和值班安排为必填项');
      }

      // 检查替班人员是否可用
      const schedules = this.getDutySchedules();
      const targetSchedule = schedules.find(s => s.id === record.scheduleId);
      if (!targetSchedule) {
        throw new Error('找不到指定的值班安排');
      }

      const unavailableEmployees = this.getUnavailableEmployees(targetSchedule.date, targetSchedule.date);
      if (unavailableEmployees.includes(record.substituteEmployeeId)) {
        throw new Error('替班人员在该日期不可用');
      }

      const records = this.getSubstituteRecords();
      const newRecord = {
        ...record,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: 'pending' // pending, approved, completed
      };
      records.push(newRecord);
      this.saveSubstituteRecords(records);

      // 如果自动批准，更新值班安排
      if (record.autoApprove) {
        this.approveSubstitute(newRecord.id);
      }

      return newRecord;
    } catch (error) {
      console.error('添加替班记录失败:', error);
      throw error;
    }
  }

  approveSubstitute(substituteId) {
    const records = this.getSubstituteRecords();
    const recordIndex = records.findIndex(r => r.id === substituteId);
    if (recordIndex === -1) return false;

    const record = records[recordIndex];
    
    // 更新值班安排
    const schedules = this.getDutySchedules();
    const scheduleIndex = schedules.findIndex(s => s.id === record.scheduleId);
    if (scheduleIndex !== -1) {
      const schedule = schedules[scheduleIndex];
      schedule.dutyStaff = schedule.dutyStaff.map(staff => 
        staff.employeeId === record.originalEmployeeId
          ? { ...staff, employeeId: record.substituteEmployeeId, isSubstitute: true }
          : staff
      );
      schedule.hasSubstitute = true;
      this.saveDutySchedules(schedules);
    }

    // 更新替班记录状态
    records[recordIndex].status = 'approved';
    records[recordIndex].approvedAt = new Date().toISOString();
    this.saveSubstituteRecords(records);

    return true;
  }

  // =================== 智能排班算法 ===================
  generateIntelligentSchedule(startDate, endDate, options = {}) {
    const employees = this.getEmployees().filter(emp => emp.status === 'active');
    const settings = this.getSettings();
    const unavailableEmployees = this.getUnavailableEmployees(startDate, endDate);
    const availableEmployees = employees.filter(emp => !unavailableEmployees.includes(emp.id));
    
    const schedules = [];
    
    // 生成高级排班
    if (settings.dutyRules.advancedScheduling) {
      return this.generateAdvancedSchedule(startDate, endDate, availableEmployees, settings, options);
    }

    // 原有的简单排班逻辑保持不变
    if (availableEmployees.length < (settings.dutyRules.minStaffPerDuty || 2)) {
      throw new Error('可用人员不足以安排值班');
    }

    const employeeDutyCount = {};
    const lastDutyDate = {};

    // 初始化员工值班计数
    availableEmployees.forEach(emp => {
      employeeDutyCount[emp.id] = 0;
      lastDutyDate[emp.id] = null;
    });

    // 按优先级和负载均衡选择值班人员
    const selectDutyStaff = (date, dutyType, requiredCount) => {
      const candidates = availableEmployees.filter(emp => {
        // 检查休息时间
        if (lastDutyDate[emp.id]) {
          const daysSinceLastDuty = Math.floor((new Date(date) - new Date(lastDutyDate[emp.id])) / (1000 * 60 * 60 * 24));
          if (daysSinceLastDuty < settings.dutyRules.minRestDays) {
            return false;
          }
        }
        return true;
      });

      // 按值班次数和级别排序
      candidates.sort((a, b) => {
        const countDiff = employeeDutyCount[a.id] - employeeDutyCount[b.id];
        if (countDiff !== 0) return countDiff;
        
        const levelA = settings.employeeLevels.find(l => l.id === a.level);
        const levelB = settings.employeeLevels.find(l => l.id === b.level);
        return levelA.priority - levelB.priority;
      });

      const selected = candidates.slice(0, requiredCount);
      
      // 确保有领导值班
      if (settings.dutyRules.requireLeaderInDuty) {
        const hasLeader = selected.some(emp => {
          const level = settings.employeeLevels.find(l => l.id === emp.level);
          return level?.canLeadDuty;
        });
        
        if (!hasLeader) {
          // 替换一个普通员工为领导
          const leader = candidates.find(emp => {
            const level = settings.employeeLevels.find(l => l.id === emp.level);
            return level?.canLeadDuty && !selected.includes(emp);
          });
          
          if (leader && selected.length > 0) {
            selected[selected.length - 1] = leader;
          }
        }
      }

      return selected.map(emp => ({
        employeeId: emp.id,
        role: (() => {
          const level = settings.employeeLevels.find(l => l.id === emp.level);
          return level?.canLeadDuty ? 'team_leader' : 'duty_officer';
        })()
      }));
    };

    // 生成排班
    let currentDate = new Date(startDate);
    const endDateTime = new Date(endDate);

    while (currentDate <= endDateTime) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      for (const dutyType of settings.dutyTypes) {
        if (options.dutyTypes && !options.dutyTypes.includes(dutyType.id)) {
          continue;
        }

        const dutyStaff = selectDutyStaff(dateStr, dutyType.id, settings.dutyRules.minStaffPerDuty || 2);
        
        if (dutyStaff.length >= (settings.dutyRules.minStaffPerDuty || 2)) {
          schedules.push({
            date: dateStr,
            dutyType: dutyType.id,
            dutyStaff,
            notes: '智能排班生成',
            isAutoGenerated: true
          });

          // 更新员工值班计数和最后值班日期
          dutyStaff.forEach(staff => {
            employeeDutyCount[staff.employeeId]++;
            lastDutyDate[staff.employeeId] = dateStr;
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedules;
  }

  // 高级排班算法 - 支持复杂轮班逻辑
  generateAdvancedSchedule(startDate, endDate, availableEmployees, settings, options = {}) {
    const schedules = [];
    const advancedRules = settings.dutyRules.advancedScheduling;
    
    // 获取各类人员
    const leaders = availableEmployees.filter(emp => emp.tags && emp.tags.includes('leader_tag'));
    const staff = availableEmployees.filter(emp => emp.tags && emp.tags.includes('staff_tag'));
    const attendanceSupervisorGroups = this.getAttendanceSupervisorGroups().filter(g => g.status === 'active');

    if (leaders.length === 0 || staff.length === 0) {
      throw new Error('领导或职工人员不足');
    }

    // 初始化轮换索引
    let leaderIndex = 0;
    let staffMondayToThursdayIndex = 0;
    let staffFridayToSundayIndex = 0;
    let fridayToSundayWeekCount = 0;

    let currentDate = new Date(startDate);
    const endDateTime = new Date(endDate);

    while (currentDate <= endDateTime) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0=周日, 1=周一, ..., 6=周六
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isWorkday = !isWeekend;

      // 构建当日值班安排
      const dutyStaff = [];
      const attendanceSupervisors = [];

      // 1. 安排领导（每日轮换）
      if (advancedRules.leaderRotation.enabled) {
        const currentLeader = leaders[leaderIndex % leaders.length];
        if (this.isEmployeeAvailable(currentLeader.id, dateStr)) {
          dutyStaff.push({
            employeeId: currentLeader.id,
            role: 'leader',
            dutyType: 'leader_duty'
          });
        }
        leaderIndex++;
      }

      // 2. 安排值班员
      if (advancedRules.staffRotation.enabled) {
        if (dayOfWeek >= 1 && dayOfWeek <= 4) {
          // 周一到周四：一人一天轮换
          const currentStaff = staff[staffMondayToThursdayIndex % staff.length];
          if (this.isEmployeeAvailable(currentStaff.id, dateStr)) {
            dutyStaff.push({
              employeeId: currentStaff.id,
              role: 'duty_officer',
              dutyType: 'staff_duty'
            });
          }
          staffMondayToThursdayIndex++;
        } else if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
          // 周五到周日：连班三天
          const currentStaff = staff[staffFridayToSundayIndex % staff.length];
          if (this.isEmployeeAvailable(currentStaff.id, dateStr)) {
            dutyStaff.push({
              employeeId: currentStaff.id,
              role: 'duty_officer',
              dutyType: 'staff_duty',
              isContinuousDuty: true
            });
          }
          
          // 周日结束后，切换到下一个人
          if (dayOfWeek === 0) {
            staffFridayToSundayIndex++;
          }
        }
      }

      // 3. 安排考勤监督员（仅工作日）
      if (advancedRules.attendanceSupervision.enabled && isWorkday && attendanceSupervisorGroups.length > 0) {
        const currentGroup = this.getCurrentAttendanceSupervisorGroup(dateStr);
        if (currentGroup) {
          currentGroup.members.forEach(memberId => {
            if (this.isEmployeeAvailable(memberId, dateStr)) {
              attendanceSupervisors.push({
                employeeId: memberId,
                role: 'attendance_supervisor',
                dutyType: 'attendance_supervision'
              });
            }
          });
        }
      }

      // 生成当日排班记录
      if (dutyStaff.length > 0) {
        const allStaff = [...dutyStaff, ...attendanceSupervisors];
        
        schedules.push({
          date: dateStr,
          dutyType: 'advanced_duty',
          dutyStaff: allStaff,
          notes: '高级智能排班生成',
          isAutoGenerated: true,
          advancedSchedule: {
            hasLeader: dutyStaff.some(s => s.role === 'leader'),
            hasStaff: dutyStaff.some(s => s.role === 'duty_officer'),
            hasAttendanceSupervisors: attendanceSupervisors.length > 0,
            dayOfWeek: dayOfWeek
          }
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return schedules;
  }

  // =================== 通用方法 ===================
  getSettings() {
    const data = localStorage.getItem(this.SETTINGS_KEY);
    return data ? JSON.parse(data) : null;
  }

  saveSettings(settings) {
    localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  exportData() {
    return {
      employees: this.getEmployees(),
      dutySchedules: this.getDutySchedules(),
      dutyGroups: this.getDutyGroups(),
      leaveRecords: this.getEmployeeStatusRecords(),
      substituteRecords: this.getSubstituteRecords(),
      settings: this.getSettings(),
      exportDate: new Date().toISOString()
    };
  }

  importData(data) {
    try {
      if (data.employees) this.saveEmployees(data.employees);
      if (data.dutySchedules) this.saveDutySchedules(data.dutySchedules);
      if (data.dutyGroups) this.saveDutyGroups(data.dutyGroups);
      if (data.leaveRecords) this.saveEmployeeStatusRecords(data.leaveRecords);
      if (data.substituteRecords) this.saveSubstituteRecords(data.substituteRecords);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (error) {
      console.error('数据导入失败:', error);
      return false;
    }
  }

  // =================== 排班计划管理 ===================
  getSchedulePlans() {
    const data = localStorage.getItem(this.SCHEDULE_PLANS_KEY);
    return data ? JSON.parse(data) : [];
  }

  saveSchedulePlans(plans) {
    localStorage.setItem(this.SCHEDULE_PLANS_KEY, JSON.stringify(plans));
  }

  clearAllData() {
    localStorage.clear();
    this.initializeDefaultData();
  }

  // 创建演示数据 - 按照用户需求
  createDemoData() {
    // 清除现有数据
    this.clearAllData();
    
    const now = new Date().toISOString();
    
    // 3个领导
    const leaders = [
      { id: '1', name: '张主任', tags: ['leader_tag'], phone: '13800001001', status: '出差', employeeId: 'L001', createdAt: now },
      { id: '2', name: '李经理', tags: ['leader_tag'], phone: '13800001002', status: '在岗', employeeId: 'L002', createdAt: now },
      { id: '3', name: '王总监', tags: ['leader_tag'], phone: '13800001003', status: '在岗', employeeId: 'L003', createdAt: now }
    ];
    
    // 7个职工
    const staff = [
      { id: '4', name: '陈小明', tags: ['staff_tag'], phone: '13800002001', status: '在岗', employeeId: 'S001', createdAt: now },
      { id: '5', name: '刘小红', tags: ['staff_tag'], phone: '13800002002', status: '在岗', employeeId: 'S002', createdAt: now },
      { id: '6', name: '赵小华', tags: ['staff_tag'], phone: '13800002003', status: '在岗', employeeId: 'S003', createdAt: now },
      { id: '7', name: '孙小丽', tags: ['staff_tag'], phone: '13800002004', status: '在岗', employeeId: 'S004', createdAt: now },
      { id: '8', name: '周小强', tags: ['staff_tag'], phone: '13800002005', status: '在岗', employeeId: 'S005', createdAt: now },
      { id: '9', name: '吴小花', tags: ['staff_tag'], phone: '13800002006', status: '在岗', employeeId: 'S006', createdAt: now },
      { id: '10', name: '郑小军', tags: ['staff_tag'], phone: '13800002007', status: '在岗', employeeId: 'S007', createdAt: now }
    ];
    
    // 4个考勤监督员（用于组成2个固定编组）
    const supervisors = [
      { id: '11', name: '监督员A', tags: ['supervisor_tag'], phone: '13800003001', status: '在岗', employeeId: 'SV001', createdAt: now },
      { id: '12', name: '监督员B', tags: ['supervisor_tag'], phone: '13800003002', status: '在岗', employeeId: 'SV002', createdAt: now },
      { id: '13', name: '监督员C', tags: ['supervisor_tag'], phone: '13800003003', status: '在岗', employeeId: 'SV003', createdAt: now },
      { id: '14', name: '监督员D', tags: ['supervisor_tag'], phone: '13800003004', status: '在岗', employeeId: 'SV004', createdAt: now }
    ];
    
    // 保存所有员工
    const allEmployees = [...leaders, ...staff, ...supervisors].map(emp => ({
      ...emp,
      department: '',
      level: '',
      qualifications: [],
      maxContinuousDuty: 7,
      preferredPartner: null,
      remarks: ''
    }));
    
    this.saveEmployees(allEmployees);
    
    // 创建张主任的出差状态记录（到7月1日回来）
    const businessTripRecord = {
      id: 'bt001',
      employeeId: '1',
      statusType: 'business_trip',
      startDate: '2024-06-01',
      endDate: '2024-07-01',
      reason: '外地项目出差',
      remarks: '7月1日回来',
      status: 'approved',
      createdAt: now
    };
    
    this.saveEmployeeStatusRecords([businessTripRecord]);
    
    // 创建考勤监督员编组
    const supervisorGroups = [
      {
        id: 'sg001',
        name: '第一监督组',
        members: ['11', '12'], // 监督员A和B
        status: 'active',
        rotationOrder: 0,
        createdAt: now
      },
      {
        id: 'sg002', 
        name: '第二监督组',
        members: ['13', '14'], // 监督员C和D
        status: 'active',
        rotationOrder: 1,
        createdAt: now
      }
    ];
    
    this.saveAttendanceSupervisorGroups(supervisorGroups);
    
    console.log('演示数据创建完成！');
    return {
      employees: allEmployees.length,
      leaders: leaders.length,
      staff: staff.length,
      supervisors: supervisors.length,
      supervisorGroups: supervisorGroups.length
    };
  }

  // 生成高级排班表 - 按照用户复杂需求
  generateComplexSchedule(startDate, endDate) {
    try {
      const employees = this.getEmployees();
      const schedules = [];
      
      // 获取不同角色的员工
      const leaders = employees.filter(emp => 
        emp.tags?.includes('leader_tag') && emp.status === '在岗'
      );
      const staff = employees.filter(emp => 
        emp.tags?.includes('staff_tag') && emp.status === '在岗'
      );
      const supervisorGroups = this.getAttendanceSupervisorGroups().filter(g => g.status === 'active');
      
      // 排班顺序设置
      const leaderOrder = leaders.map(l => l.id); // 领导轮换顺序
      const staffOrder = staff.map(s => s.id); // 职工轮换顺序
      
      let leaderIndex = 0;
      let staffWeekdayIndex = 0;
      let staffWeekendIndex = 0;
      let supervisorGroupIndex = 0;
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const currentDate = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // 周一到周五
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6; // 周五到周日
        
        console.log(`处理日期: ${currentDate}, 星期${dayOfWeek}, 工作日: ${isWeekday}`);
        
        // 每日一个领导值班
        const currentLeader = leaders[leaderIndex % leaders.length];
        
        // 检查领导是否可用（考虑出差等状态）
        let availableLeader = currentLeader;
        if (!this.isEmployeeAvailable(currentLeader.id, currentDate)) {
          console.log(`${currentLeader.name} 在 ${currentDate} 不可用，寻找替代人员`);
          // 如果当前领导不可用，找下一个可用的领导
          for (let i = 1; i < leaders.length; i++) {
            const nextLeader = leaders[(leaderIndex + i) % leaders.length];
            if (this.isEmployeeAvailable(nextLeader.id, currentDate)) {
              availableLeader = nextLeader;
              console.log(`使用替代领导: ${availableLeader.name}`);
              break;
            }
          }
        }
        
        // 职工值班安排
        let currentStaff;
        if (isWeekday && dayOfWeek !== 5) { // 周一到周四：每日轮换
          currentStaff = staff[staffWeekdayIndex % staff.length];
          staffWeekdayIndex++;
        } else if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) { // 周五到周日：连班三天
          if (dayOfWeek === 5) { // 周五开始新的连班周期
            currentStaff = staff[staffWeekendIndex % staff.length];
            // 周五到周日使用同一个人，所以只在周五时推进索引
            if (date.getDay() === 5) {
              staffWeekendIndex++;
            }
          } else {
            // 周六和周日使用与周五相同的员工
            currentStaff = staff[(staffWeekendIndex - 1 + staff.length) % staff.length];
          }
        }
        
        // 考勤监督员安排（仅工作日）
        let supervisorMembers = [];
        if (isWeekday) {
          const weekNumber = Math.floor((date - new Date('2024-01-01')) / (7 * 24 * 60 * 60 * 1000));
          const currentGroup = supervisorGroups[weekNumber % supervisorGroups.length];
          if (currentGroup) {
            supervisorMembers = currentGroup.members.map(memberId => 
              employees.find(emp => emp.id === memberId)
            ).filter(Boolean);
          }
        }
        
        // 构建当日排班记录
        const daySchedule = {
          id: `schedule_${currentDate}`,
          date: currentDate,
          dutyType: 'daily',
          advancedSchedule: true, // 标记为高级排班
          dutyStaff: [
            {
              employeeId: availableLeader.id,
              employeeName: availableLeader.name,
              role: 'leader', // 领导角色
              phone: availableLeader.phone
            },
            {
              employeeId: currentStaff.id,
              employeeName: currentStaff.name,
              role: 'duty_officer', // 值班员角色
              phone: currentStaff.phone,
              isContinuousDuty: (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) // 标记连班
            },
            ...supervisorMembers.map(supervisor => ({
              employeeId: supervisor.id,
              employeeName: supervisor.name,
              role: 'attendance_supervisor', // 考勤监督员角色
              phone: supervisor.phone
            }))
          ],
          status: 'active',
          createdAt: new Date().toISOString(),
          remarks: this.generateScheduleRemarks(currentDate, dayOfWeek, availableLeader, currentStaff, supervisorMembers)
        };
        
        schedules.push(daySchedule);
        
        // 领导每日轮换
        leaderIndex++;
      }
      
      // 保存生成的排班表
      this.saveDutySchedules(schedules);
      
      return {
        success: true,
        scheduleCount: schedules.length,
        startDate,
        endDate,
        summary: {
          totalDays: schedules.length,
          leadersUsed: leaders.length,
          staffUsed: staff.length,
          supervisorGroups: supervisorGroups.length
        }
      };
      
    } catch (error) {
      console.error('生成复杂排班表失败:', error);
      throw error;
    }
  }
  
  // 生成排班说明
  generateScheduleRemarks(date, dayOfWeek, leader, staff, supervisors) {
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayName = dayNames[dayOfWeek];
    
    let remarks = `${dayName} - 领导: ${leader.name}, 值班员: ${staff.name}`;
    
    if (supervisors.length > 0) {
      const supervisorNames = supervisors.map(s => s.name).join('、');
      remarks += `, 考勤监督: ${supervisorNames}`;
    }
    
    if (dayOfWeek === 5) {
      remarks += ' [周末连班开始]';
    } else if (dayOfWeek === 6 || dayOfWeek === 0) {
      remarks += ' [周末连班中]';
    }
    
    return remarks;
  }

  // 系统设置管理
  getSystemSettings() {
    try {
      const data = localStorage.getItem('paiban_system_settings');
      return data ? JSON.parse(data) : {
        organizationName: '值班排班系统',
        organizationCode: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: '',
        address: '',
        workDays: [1, 2, 3, 4, 5],
        workStartTime: '08:00',
        workEndTime: '18:00',
        maxContinuousDuty: 7,
        minRestDays: 1,
        enableWeekendDuty: true,
        autoRefreshInterval: 30,
        enableNotifications: true,
        enableAutoBackup: false,
        createTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取系统设置失败:', error);
      return {};
    }
  }

  saveSystemSettings(settings) {
    try {
      localStorage.setItem('paiban_system_settings', JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('保存系统设置失败:', error);
      return false;
    }
  }

  // 创建演示数据（包含冲突）
  createDemoDataWithConflicts() {
    try {
      // 创建人员数据
      const demoPersonnel = [
        {
          id: 'person_1',
          name: '张三',
          tag: '领导',
          phone: '13800138001',
          status: '在岗',
          createTime: new Date().toISOString()
        },
        {
          id: 'person_2', 
          name: '李四',
          tag: '职工',
          phone: '13800138002',
          status: '请假',
          statusPeriod: {
            start: new Date().toISOString().split('T')[0], // 今天开始
            end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 3天后结束
          },
          statusReason: '因病请假',
          createTime: new Date().toISOString()
        },
        {
          id: 'person_3',
          name: '王五',
          tag: '职工', 
          phone: '13800138003',
          status: '在岗',
          createTime: new Date().toISOString()
        },
        {
          id: 'person_4',
          name: '赵六',
          tag: '中层',
          phone: '13800138004', 
          status: '出差',
          statusPeriod: {
            start: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 明天开始
            end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 5天后结束
          },
          statusReason: '外地出差',
          createTime: new Date().toISOString()
        }
      ];

      // 创建岗位数据
      const demoPositions = [
        {
          id: 'pos_1',
          name: '带班领导',
          requiredTags: ['领导'],
          isGroup: false,
          assignedPersonIds: ['person_1'],
          createTime: new Date().toISOString()
        },
        {
          id: 'pos_2',
          name: '值班员',
          requiredTags: ['职工'],
          isGroup: false, 
          assignedPersonIds: ['person_2', 'person_3'],
          createTime: new Date().toISOString()
        }
      ];

      // 创建排班数据（包含冲突）
      const demoSchedules = [
        {
          id: 'schedule_1',
          date: new Date().toISOString().split('T')[0], // 今天
          positionId: 'pos_2',
          positionName: '值班员',
          isGroup: false,
          assignedPersonId: 'person_2', // 李四今天请假，会产生冲突
          createTime: new Date().toISOString()
        },
        {
          id: 'schedule_2',
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 明天
          positionId: 'pos_1',
          positionName: '带班领导',
          isGroup: false,
          assignedPersonId: 'person_1',
          createTime: new Date().toISOString()
        },
        {
          id: 'schedule_3',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 后天
          positionId: 'pos_2',
          positionName: '值班员',
          isGroup: false,
          assignedPersonId: 'person_4', // 赵六后天出差，会产生冲突
          createTime: new Date().toISOString()
        }
      ];

      // 保存数据
      this.savePersonnel(demoPersonnel);
      this.savePositions(demoPositions);
      this.saveDutySchedules(demoSchedules);

      // 自动检测冲突
      this.detectScheduleConflicts();

      console.log('演示数据（包含冲突）创建成功');
      return true;
    } catch (error) {
      console.error('创建演示数据失败:', error);
      return false;
    }
  }

  // 用户管理相关方法
  getUsers() {
    try {
      const data = localStorage.getItem(this.USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return [];
    }
  }

  saveUsers(users) {
    try {
      console.log('保存用户列表，用户数量:', users.length);
      console.log('用户数据:', users);
      
      const jsonData = JSON.stringify(users);
      console.log('序列化后的数据长度:', jsonData.length);
      
      localStorage.setItem(this.USERS_KEY, jsonData);
      console.log('用户数据已保存到localStorage');
      
      return true;
    } catch (error) {
      console.error('保存用户列表失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        usersCount: users ? users.length : 'undefined'
      });
      return false;
    }
  }

  addUser(user) {
    try {
      console.log('开始添加用户:', user);
      const users = this.getUsers();
      console.log('当前用户列表:', users);
      
      const newUser = {
        ...user,
        id: user.id || `user_${Date.now()}`,
        createTime: new Date().toISOString(),
        lastLoginTime: null,
        status: 'active'
      };
      
      console.log('准备保存的用户对象:', newUser);
      users.push(newUser);
      
      const saveResult = this.saveUsers(users);
      console.log('保存用户列表结果:', saveResult);
      
      if (saveResult) {
        console.log('用户添加成功:', newUser);
        return newUser;
      } else {
        console.log('保存用户列表失败');
        return null;
      }
    } catch (error) {
      console.error('添加用户失败:', error);
      return null;
    }
  }

  updateUser(id, updatedUser) {
    try {
      const users = this.getUsers();
      const index = users.findIndex(user => user.id === id);
      if (index !== -1) {
        users[index] = {
          ...users[index],
          ...updatedUser,
          updateTime: new Date().toISOString()
        };
        this.saveUsers(users);
        return users[index];
      }
      return null;
    } catch (error) {
      console.error('更新用户失败:', error);
      return null;
    }
  }

  deleteUser(id) {
    try {
      const users = this.getUsers();
      const filteredUsers = users.filter(user => user.id !== id);
      this.saveUsers(filteredUsers);
      return true;
    } catch (error) {
      console.error('删除用户失败:', error);
      return false;
    }
  }

  getUserById(id) {
    try {
      const users = this.getUsers();
      return users.find(user => user.id === id) || null;
    } catch (error) {
      console.error('获取用户失败:', error);
      return null;
    }
  }

  getUserByUsername(username) {
    try {
      const users = this.getUsers();
      return users.find(user => user.username === username) || null;
    } catch (error) {
      console.error('获取用户失败:', error);
      return null;
    }
  }

  // 用户认证相关方法
  authenticateUser(username, password) {
    try {
      const user = this.getUserByUsername(username);
      if (user && user.password === password && user.status === 'active') {
        // 更新最后登录时间
        this.updateUser(user.id, { lastLoginTime: new Date().toISOString() });
        return { success: true, user: { ...user, password: undefined } };
      }
      return { success: false, message: '用户名或密码错误' };
    } catch (error) {
      console.error('用户认证失败:', error);
      return { success: false, message: '认证失败' };
    }
  }

  // 用户会话管理
  getSessions() {
    try {
      const data = localStorage.getItem(this.USER_SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取会话列表失败:', error);
      return [];
    }
  }

  saveSessions(sessions) {
    try {
      localStorage.setItem(this.USER_SESSIONS_KEY, JSON.stringify(sessions));
      return true;
    } catch (error) {
      console.error('保存会话列表失败:', error);
      return false;
    }
  }

  createSession(userId, token) {
    try {
      const sessions = this.getSessions();
      const newSession = {
        id: `session_${Date.now()}`,
        userId,
        token,
        createTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24小时过期
      };
      sessions.push(newSession);
      this.saveSessions(sessions);
      return newSession;
    } catch (error) {
      console.error('创建会话失败:', error);
      return null;
    }
  }

  validateSession(token) {
    try {
      const sessions = this.getSessions();
      const session = sessions.find(s => s.token === token);
      if (session && new Date(session.expiresAt) > new Date()) {
        // 更新最后活动时间
        session.lastActivity = new Date().toISOString();
        this.saveSessions(sessions);
        return { valid: true, session };
      }
      return { valid: false };
    } catch (error) {
      console.error('验证会话失败:', error);
      return { valid: false };
    }
  }

  removeSession(token) {
    try {
      const sessions = this.getSessions();
      const filteredSessions = sessions.filter(s => s.token !== token);
      this.saveSessions(filteredSessions);
      return true;
    } catch (error) {
      console.error('移除会话失败:', error);
      return false;
    }
  }

  // 初始化默认管理员账户
  initializeDefaultAdmin() {
    try {
      const users = this.getUsers();
      if (users.length === 0) {
        const adminUser = {
          id: 'admin_001',
          username: 'admin',
          password: 'admin123',
          name: '系统管理员',
          email: 'admin@example.com',
          role: 'admin',
          permissions: ['all'],
          createTime: new Date().toISOString(),
          status: 'active'
        };
        this.addUser(adminUser);
        console.log('默认管理员账户已创建');
      }
    } catch (error) {
      console.error('初始化默认管理员失败:', error);
    }
  }

  // 根据岗位和轮班规则生成排班表
  generateScheduleByRules(startDate, endDate) {
    try {
      const employees = this.getEmployees();
      const positions = this.getPositions();
      const scheduleRules = this.getScheduleRules();
      const schedules = [];
      
      if (positions.length === 0) {
        console.warn('没有岗位数据，无法生成排班表');
        return { success: false, message: '没有岗位数据' };
      }
      
      if (scheduleRules.length === 0) {
        console.warn('没有轮班规则，无法生成排班表');
        return { success: false, message: '没有轮班规则' };
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // 按员工标签分组
      const employeesByTag = {};
      employees.forEach(emp => {
        emp.tags?.forEach(tag => {
          if (!employeesByTag[tag]) {
            employeesByTag[tag] = [];
          }
          employeesByTag[tag].push(emp);
        });
      });
      
      // 为每个日期生成排班
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const currentDate = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
        
        console.log(`处理日期: ${currentDate}, 星期${dayName}`);
        
        // 应用轮班规则
        const applicableRules = scheduleRules.filter(rule => rule.enabled);
        
        for (const rule of applicableRules) {
          let shouldApply = false;
          let rulePositions = [];
          
          if (rule.type === 'weekly') {
            const dayPattern = rule.pattern[dayName];
            if (dayPattern && dayPattern.enabled) {
              shouldApply = true;
              rulePositions = dayPattern.positions;
            }
          } else if (rule.type === 'daily') {
            const dayPattern = rule.pattern.everyDay;
            if (dayPattern && dayPattern.enabled) {
              shouldApply = true;
              rulePositions = dayPattern.positions;
            }
          }
          
          if (shouldApply && rulePositions.length > 0) {
            console.log(`应用规则: ${rule.name}`);
            
            // 为每个岗位生成排班
            for (const positionId of rulePositions) {
              const position = positions.find(p => p.id === positionId);
              if (!position) continue;
              
              // 找到符合岗位要求的员工
              const availableEmployees = [];
              position.requiredTags?.forEach(tag => {
                const tagEmployees = employeesByTag[tag] || [];
                availableEmployees.push(...tagEmployees);
              });
              
              if (availableEmployees.length === 0) {
                console.warn(`岗位 ${position.name} 没有可用员工`);
                continue;
              }
              
              // 选择员工（简单轮换）
              const selectedEmployee = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
              
              // 检查员工是否可用
              if (!this.isEmployeeAvailable(selectedEmployee.id, currentDate)) {
                console.log(`${selectedEmployee.name} 在 ${currentDate} 不可用，跳过`);
                continue;
              }
              
              // 创建排班记录
              const schedule = {
                id: `schedule_${currentDate}_${positionId}`,
                date: currentDate,
                positionId: positionId,
                positionName: position.name,
                assignedPersonId: selectedEmployee.id,
                assignedPersonName: selectedEmployee.name,
                dutyType: 'position_based',
                workHours: rule.workHours || position.workHours,
                status: 'active',
                createdAt: new Date().toISOString(),
                remarks: `${rule.name} - ${position.name}`
              };
              
              schedules.push(schedule);
              console.log(`创建排班: ${position.name} -> ${selectedEmployee.name}`);
            }
          }
        }
      }
      
      // 保存生成的排班表
      this.saveDutySchedules(schedules);
      
      return {
        success: true,
        scheduleCount: schedules.length,
        startDate,
        endDate,
        summary: {
          totalDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
          positionsUsed: positions.length,
          rulesApplied: scheduleRules.filter(r => r.enabled).length,
          employeesUsed: new Set(schedules.map(s => s.assignedPersonId)).size
        }
      };
      
    } catch (error) {
      console.error('根据规则生成排班表失败:', error);
      throw error;
    }
  }

}

export default new LocalStorageService(); 