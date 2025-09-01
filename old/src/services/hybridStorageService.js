// 混合存储服务 - 支持本地存储和云端存储
import localStorageService from './localStorageService';
import cloudStorageService from './cloudStorageService';
import * as api from './apiService';

class HybridStorageService {
  constructor() {
    // 在本地开发环境中，如果没有设置API_URL，默认使用本地存储
    this.useCloud = process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL !== '' && process.env.REACT_APP_API_URL !== 'http://localhost:3001/api';
    this.isOnline = navigator.onLine;
    
    // 监听网络状态
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineData();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    console.log('混合存储服务初始化:', {
      useCloud: this.useCloud,
      isOnline: this.isOnline,
      apiUrl: process.env.REACT_APP_API_URL
    });
  }

  // 检查是否使用云端存储
  shouldUseCloud() {
    return this.useCloud && this.isOnline;
  }

  // 用户管理
  async getUsers() {
    if (this.shouldUseCloud()) {
      try {
        return await cloudStorageService.getUsers();
      } catch (error) {
        console.warn('云端获取用户失败，使用本地存储:', error);
        return localStorageService.getUsers();
      }
    }
    return localStorageService.getUsers();
  }

  async addUser(user) {
    // 先保存到本地
    const localResult = localStorageService.addUser(user);
    
    // 如果启用云端，也保存到云端
    if (this.shouldUseCloud()) {
      try {
        await cloudStorageService.addUser(user);
        console.log('用户已同步到云端');
      } catch (error) {
        console.warn('云端保存用户失败:', error);
        // 保存到离线队列
        this.saveOfflineData('/users', 'POST', user);
      }
    }
    
    return localResult;
  }

  async updateUser(id, userData) {
    // 先更新本地
    const localResult = localStorageService.updateUser(id, userData);
    
    // 如果启用云端，也更新云端
    if (this.shouldUseCloud()) {
      try {
        await cloudStorageService.updateUser(id, userData);
        console.log('用户更新已同步到云端');
      } catch (error) {
        console.warn('云端更新用户失败:', error);
        this.saveOfflineData('/users', 'PUT', { id, ...userData });
      }
    }
    
    return localResult;
  }

  async deleteUser(id) {
    // 先删除本地
    const localResult = localStorageService.deleteUser(id);
    
    // 如果启用云端，也删除云端
    if (this.shouldUseCloud()) {
      try {
        await cloudStorageService.deleteUser(id);
        console.log('用户删除已同步到云端');
      } catch (error) {
        console.warn('云端删除用户失败:', error);
        this.saveOfflineData('/users', 'DELETE', { id });
      }
    }
    
    return localResult;
  }

  async getUserByUsername(username) {
    if (this.shouldUseCloud()) {
      try {
        const users = await cloudStorageService.getUsers();
        return users.find(user => user.username === username) || null;
      } catch (error) {
        console.warn('云端获取用户失败，使用本地存储:', error);
        return localStorageService.getUserByUsername(username);
      }
    }
    return localStorageService.getUserByUsername(username);
  }

  // 用户认证
  async authenticateUser(username, password) {
    if (this.shouldUseCloud()) {
      try {
        const result = await cloudStorageService.authenticateUser(username, password);
        if (result.success) {
          // 同步用户信息到本地
          const localUsers = localStorageService.getUsers();
          const existingUserIndex = localUsers.findIndex(u => u.username === username);
          if (existingUserIndex !== -1) {
            localUsers[existingUserIndex] = { ...localUsers[existingUserIndex], ...result.user };
          } else {
            localUsers.push(result.user);
          }
          localStorageService.saveUsers(localUsers);
        }
        return result;
      } catch (error) {
        console.warn('云端认证失败，使用本地认证:', error);
        return localStorageService.authenticateUser(username, password);
      }
    }
    return localStorageService.authenticateUser(username, password);
  }

  // 通用数据存储
  async getData(collection, userId = null) {
    if (this.shouldUseCloud()) {
      try {
        return await cloudStorageService.getData(collection, userId);
      } catch (error) {
        console.warn(`云端获取${collection}失败，使用本地存储:`, error);
        return this.getLocalData(collection);
      }
    }
    return this.getLocalData(collection);
  }

  async saveData(collection, data) {
    // 先保存到本地
    const localResult = this.saveLocalData(collection, data);
    
    // 如果启用云端，也保存到云端
    if (this.shouldUseCloud()) {
      try {
        await cloudStorageService.saveData(collection, data);
        console.log(`${collection}数据已同步到云端`);
      } catch (error) {
        console.warn(`云端保存${collection}失败:`, error);
        this.saveOfflineData('/data', 'POST', { collection, ...data });
      }
    }
    
    return localResult;
  }

  async updateData(collection, id, data) {
    // 先更新本地
    const localResult = this.updateLocalData(collection, id, data);
    
    // 如果启用云端，也更新云端
    if (this.shouldUseCloud()) {
      try {
        await cloudStorageService.updateData(collection, id, data);
        console.log(`${collection}数据更新已同步到云端`);
      } catch (error) {
        console.warn(`云端更新${collection}失败:`, error);
        this.saveOfflineData('/data', 'PUT', { collection, id, ...data });
      }
    }
    
    return localResult;
  }

  async deleteData(collection, id) {
    // 先删除本地
    const localResult = this.deleteLocalData(collection, id);
    
    // 如果启用云端，也删除云端
    if (this.shouldUseCloud()) {
      try {
        await cloudStorageService.deleteData(collection, id);
        console.log(`${collection}数据删除已同步到云端`);
      } catch (error) {
        console.warn(`云端删除${collection}失败:`, error);
        this.saveOfflineData('/data', 'DELETE', { collection, id });
      }
    }
    
    return localResult;
  }

  // 本地数据操作
  getLocalData(collection) {
    const key = this.getLocalStorageKey(collection);
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`获取本地${collection}数据失败:`, error);
      return [];
    }
  }

  saveLocalData(collection, data) {
    const key = this.getLocalStorageKey(collection);
    try {
      const existingData = this.getLocalData(collection);
      existingData.push(data);
      localStorage.setItem(key, JSON.stringify(existingData));
      return data;
    } catch (error) {
      console.error(`保存本地${collection}数据失败:`, error);
      return null;
    }
  }

  updateLocalData(collection, id, data) {
    const key = this.getLocalStorageKey(collection);
    try {
      const existingData = this.getLocalData(collection);
      const index = existingData.findIndex(item => item.id === id);
      if (index !== -1) {
        existingData[index] = { ...existingData[index], ...data };
        localStorage.setItem(key, JSON.stringify(existingData));
        return existingData[index];
      }
      return null;
    } catch (error) {
      console.error(`更新本地${collection}数据失败:`, error);
      return null;
    }
  }

  deleteLocalData(collection, id) {
    const key = this.getLocalStorageKey(collection);
    try {
      const existingData = this.getLocalData(collection);
      const filteredData = existingData.filter(item => item.id !== id);
      localStorage.setItem(key, JSON.stringify(filteredData));
      return true;
    } catch (error) {
      console.error(`删除本地${collection}数据失败:`, error);
      return false;
    }
  }

  // 获取本地存储键名
  getLocalStorageKey(collection) {
    const keyMap = {
      'users': 'system_users',
      'employees': 'duty_employees',
      'schedules': 'duty_schedules',
      'settings': 'duty_settings',
      'personnel': 'paiban_personnel',
      'supervisor_groups': 'attendance_supervisor_groups'
    };
    return keyMap[collection] || collection;
  }

  // 离线数据同步
  async syncOfflineData() {
    if (!this.isOnline || !this.useCloud) return;

    const offlineData = JSON.parse(localStorage.getItem('offlineData') || '[]');
    if (offlineData.length === 0) return;

    console.log('开始同步离线数据...');

    for (const item of offlineData) {
      try {
        await cloudStorageService.apiRequest(item.endpoint, {
          method: item.method,
          body: JSON.stringify(item.data)
        });
        console.log('同步成功:', item);
      } catch (error) {
        console.error('同步失败:', item, error);
      }
    }

    // 清除已同步的数据
    localStorage.removeItem('offlineData');
  }

  // 保存离线数据
  saveOfflineData(endpoint, method, data) {
    const offlineData = JSON.parse(localStorage.getItem('offlineData') || '[]');
    offlineData.push({ endpoint, method, data, timestamp: Date.now() });
    localStorage.setItem('offlineData', JSON.stringify(offlineData));
  }

  // 数据导出
  async exportAllData() {
    const collections = ['users', 'employees', 'schedules', 'settings', 'personnel'];
    const allData = {};

    for (const collection of collections) {
      if (this.shouldUseCloud()) {
        try {
          allData[collection] = await cloudStorageService.getData(collection);
        } catch (error) {
          console.error(`导出${collection}失败:`, error);
          allData[collection] = this.getLocalData(collection);
        }
      } else {
        allData[collection] = this.getLocalData(collection);
      }
    }

    return allData;
  }

  // 数据导入
  async importAllData(data) {
    const results = {};

    for (const [collection, items] of Object.entries(data)) {
      results[collection] = [];
      
      for (const item of items) {
        try {
          if (this.shouldUseCloud()) {
            const result = await cloudStorageService.saveData(collection, item);
            results[collection].push({ success: true, id: result._id });
          } else {
            const result = this.saveLocalData(collection, item);
            results[collection].push({ success: true, id: result?.id });
          }
        } catch (error) {
          results[collection].push({ success: false, error: error.message });
        }
      }
    }

    return results;
  }

  // 初始化默认管理员
  initializeDefaultAdmin() {
    return localStorageService.initializeDefaultAdmin();
  }

  // 获取系统设置
  getSystemSettings() {
    return localStorageService.getSystemSettings();
  }

  // 保存系统设置
  saveSystemSettings(settings) {
    const result = localStorageService.saveSystemSettings(settings);
    
    if (this.shouldUseCloud()) {
      this.saveData('settings', settings);
    }
    
    return result;
  }

  // 获取员工数据
  getEmployees() {
    return localStorageService.getEmployees();
  }

  // 保存员工数据
  saveEmployees(employees) {
    const result = localStorageService.saveEmployees(employees);
    
    if (this.shouldUseCloud()) {
      this.saveData('employees', { employees });
    }
    
    return result;
  }

  // 获取排班数据
  getDutySchedules() {
    return localStorageService.getDutySchedules();
  }

  // 保存排班数据
  saveDutySchedules(schedules) {
    const result = localStorageService.saveDutySchedules(schedules);
    
    if (this.shouldUseCloud()) {
      this.saveData('schedules', { schedules });
    }
    
    return result;
  }

  // 会话管理
  getSessions() {
    return localStorageService.getSessions();
  }

  saveSessions(sessions) {
    return localStorageService.saveSessions(sessions);
  }

  createSession(userId, token) {
    return localStorageService.createSession(userId, token);
  }

  validateSession(token) {
    return localStorageService.validateSession(token);
  }

  removeSession(token) {
    return localStorageService.removeSession(token);
  }

  // 创建演示数据
  createDemoData() {
    return localStorageService.createDemoData();
  }

  // 生成复杂排班表
  generateComplexSchedule(startDate, endDate) {
    return localStorageService.generateComplexSchedule(startDate, endDate);
  }

  // 根据岗位和轮班规则生成排班表
  generateScheduleByRules(startDate, endDate) {
    return localStorageService.generateScheduleByRules(startDate, endDate);
  }

  // 获取考勤监督员组
  getAttendanceSupervisorGroups() {
    return localStorageService.getAttendanceSupervisorGroups();
  }

  // 保存考勤监督员组
  saveAttendanceSupervisorGroups(groups) {
    const result = localStorageService.saveAttendanceSupervisorGroups(groups);
    
    if (this.shouldUseCloud()) {
      this.saveData('supervisor_groups', { groups });
    }
    
    return result;
  }

  // 添加员工
  addEmployee(employee) {
    const result = localStorageService.addEmployee(employee);
    
    if (this.shouldUseCloud()) {
      this.saveData('employees', employee);
    }
    
    return result;
  }

  // 更新员工
  updateEmployee(id, updatedEmployee) {
    const result = localStorageService.updateEmployee(id, updatedEmployee);
    
    if (this.shouldUseCloud()) {
      this.updateData('employees', id, updatedEmployee);
    }
    
    return result;
  }

  // 删除员工
  deleteEmployee(id) {
    const result = localStorageService.deleteEmployee(id);
    
    if (this.shouldUseCloud()) {
      this.deleteData('employees', id);
    }
    
    return result;
  }

  // 获取设置
  getSettings() {
    return localStorageService.getSettings();
  }

  // 保存设置
  saveSettings(settings) {
    const result = localStorageService.saveSettings(settings);
    
    if (this.shouldUseCloud()) {
      this.saveData('settings', settings);
    }
    
    return result;
  }

  // 清除所有数据
  clearAllData() {
    return localStorageService.clearAllData();
  }

  // 导出数据
  exportData() {
    return localStorageService.exportData();
  }

  // 导入数据
  importData(data) {
    return localStorageService.importData(data);
  }

  // 人员管理
  async getPersonnel() {
    return await api.getPersonnel();
  }

  async addPersonnel(person) {
    return await api.addPersonnel(person);
  }

  async updatePersonnel(id, person) {
    return await api.updatePersonnel(id, person);
  }

  async deletePersonnel(id) {
    return await api.deletePersonnel(id);
  }

  // 自定义标签
  getCustomTags() {
    return localStorageService.getCustomTags();
  }

  saveCustomTags(tags) {
    const result = localStorageService.saveCustomTags(tags);
    
    if (this.shouldUseCloud()) {
      this.saveData('custom_tags', { tags });
    }
    
    return result;
  }

  // 岗位管理
  async getPositions() {
    return await api.getPositions();
  }

  async addPosition(position) {
    return await api.addPosition(position);
  }

  async updatePosition(id, position) {
    return await api.updatePosition(id, position);
  }

  async deletePosition(id) {
    return await api.deletePosition(id);
  }

  // 轮班规则
  async getScheduleRules() {
    return await api.getScheduleRules();
  }

  async addScheduleRule(rule) {
    return await api.addScheduleRule(rule);
  }

  async updateScheduleRule(id, rule) {
    return await api.updateScheduleRule(id, rule);
  }

  async deleteScheduleRule(id) {
    return await api.deleteScheduleRule(id);
  }

  // 冲突记录管理
  getConflictRecords() {
    return localStorageService.getConflictRecords();
  }

  saveConflictRecords(records) {
    const result = localStorageService.saveConflictRecords(records);
    
    if (this.shouldUseCloud()) {
      this.saveData('conflict_records', { records });
    }
    
    return result;
  }

  addConflictRecord(conflict) {
    return localStorageService.addConflictRecord(conflict);
  }

  // 自动检测排班冲突
  detectScheduleConflicts() {
    return localStorageService.detectScheduleConflicts();
  }

  // 解析日期字符串
  parseDate(dateStr) {
    return localStorageService.parseDate(dateStr);
  }

  // 检查人员是否在指定日期不可用
  isPersonUnavailableOnDate(person, date) {
    return localStorageService.isPersonUnavailableOnDate(person, date);
  }

  // 获取岗位名称
  getPositionName(positionId) {
    return localStorageService.getPositionName(positionId);
  }

  // 获取冲突原因
  getConflictReason(person, date) {
    return localStorageService.getConflictReason(person, date);
  }

  // 解决冲突
  resolveConflict(conflictId, resolution) {
    return localStorageService.resolveConflict(conflictId, resolution);
  }

  // 替班记录管理
  getSubstituteRecordsSimple() {
    return localStorageService.getSubstituteRecordsSimple();
  }

  saveSubstituteRecordsSimple(records) {
    const result = localStorageService.saveSubstituteRecordsSimple(records);
    
    if (this.shouldUseCloud()) {
      this.saveData('substitute_records', { records });
    }
    
    return result;
  }

  addSubstituteRecordSimple(substitute) {
    return localStorageService.addSubstituteRecordSimple(substitute);
  }

  approveSubstituteSimple(substituteId) {
    return localStorageService.approveSubstituteSimple(substituteId);
  }

  updateScheduleForSubstituteSimple(substitute) {
    return localStorageService.updateScheduleForSubstituteSimple(substitute);
  }

  // 值班组管理
  getDutyGroups() {
    return localStorageService.getDutyGroups();
  }

  saveDutyGroups(groups) {
    const result = localStorageService.saveDutyGroups(groups);
    
    if (this.shouldUseCloud()) {
      this.saveData('duty_groups', { groups });
    }
    
    return result;
  }

  addDutyGroup(group) {
    return localStorageService.addDutyGroup(group);
  }

  // 员工状态记录管理
  getEmployeeStatusRecords() {
    return localStorageService.getEmployeeStatusRecords();
  }

  saveEmployeeStatusRecords(records) {
    const result = localStorageService.saveEmployeeStatusRecords(records);
    
    if (this.shouldUseCloud()) {
      this.saveData('employee_status_records', { records });
    }
    
    return result;
  }

  addEmployeeStatusRecord(record) {
    return localStorageService.addEmployeeStatusRecord(record);
  }

  updateEmployeeBaseStatus(employeeId, status) {
    return localStorageService.updateEmployeeBaseStatus(employeeId, status);
  }

  getEmployeeCurrentStatus(employeeId, date = null) {
    return localStorageService.getEmployeeCurrentStatus(employeeId, date);
  }

  getUnavailableEmployees(startDate, endDate) {
    return localStorageService.getUnavailableEmployees(startDate, endDate);
  }

  isEmployeeAvailable(employeeId, date) {
    return localStorageService.isEmployeeAvailable(employeeId, date);
  }

  approveStatusRecord(recordId) {
    return localStorageService.approveStatusRecord(recordId);
  }

  rejectStatusRecord(recordId) {
    return localStorageService.rejectStatusRecord(recordId);
  }

  // 替班记录管理（完整版）
  getSubstituteRecords() {
    return localStorageService.getSubstituteRecords();
  }

  saveSubstituteRecords(records) {
    const result = localStorageService.saveSubstituteRecords(records);
    
    if (this.shouldUseCloud()) {
      this.saveData('substitute_records_full', { records });
    }
    
    return result;
  }

  addSubstituteRecord(record) {
    return localStorageService.addSubstituteRecord(record);
  }

  approveSubstitute(substituteId) {
    return localStorageService.approveSubstitute(substituteId);
  }

  // 智能排班生成
  generateIntelligentSchedule(startDate, endDate, options = {}) {
    return localStorageService.generateIntelligentSchedule(startDate, endDate, options);
  }

  generateAdvancedSchedule(startDate, endDate, availableEmployees, settings, options = {}) {
    return localStorageService.generateAdvancedSchedule(startDate, endDate, availableEmployees, settings, options);
  }

  // 排班计划管理
  getSchedulePlans() {
    return localStorageService.getSchedulePlans();
  }

  saveSchedulePlans(plans) {
    const result = localStorageService.saveSchedulePlans(plans);
    
    if (this.shouldUseCloud()) {
      this.saveData('schedule_plans', { plans });
    }
    
    return result;
  }

  // 添加排班记录
  addDutySchedule(schedule) {
    return localStorageService.addDutySchedule(schedule);
  }

  // 考勤监督员组管理
  addAttendanceSupervisorGroup(group) {
    return localStorageService.addAttendanceSupervisorGroup(group);
  }

  updateAttendanceSupervisorGroup(id, updatedGroup) {
    return localStorageService.updateAttendanceSupervisorGroup(id, updatedGroup);
  }

  deleteAttendanceSupervisorGroup(id) {
    return localStorageService.deleteAttendanceSupervisorGroup(id);
  }

  getCurrentAttendanceSupervisorGroup(date) {
    return localStorageService.getCurrentAttendanceSupervisorGroup(date);
  }

  // 创建演示数据（带冲突）
  createDemoDataWithConflicts() {
    return localStorageService.createDemoDataWithConflicts();
  }

  async resetDemoData() {
    return await api.resetDemoData();
  }

  // 用户相关
  async register(data) {
    return await api.register(data);
  }

  async login(data) {
    return await api.login(data);
  }

  async validateInvite(inviteCode) {
    return await api.validateInvite(inviteCode);
  }

  async getSchedules() {
    return await api.getSchedules();
  }

  async addSchedule(schedule) {
    return await api.addSchedule(schedule);
  }

  async updateSchedule(id, schedule) {
    return await api.updateSchedule(id, schedule);
  }

  async deleteSchedule(id) {
    return await api.deleteSchedule(id);
  }

  async saveSchedules(schedules) {
    return await Promise.all(schedules.map(api.addSchedule));
  }

  async getScheduleRules() {
    return await api.getScheduleRules();
  }

  async addScheduleRule(rule) {
    return await api.addScheduleRule(rule);
  }

  async updateScheduleRules(rules) {
    return await Promise.all(rules.map(api.updateScheduleRule));
  }

  async deleteScheduleRules(ids) {
    return await Promise.all(ids.map(api.deleteScheduleRule));
  }
}

export default new HybridStorageService(); 