import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';
import { ScheduleRule } from '../schedule-rule/entities/schedule-rule.entity';
import { Shift } from '../shift/entities/shift.entity';
import { ShiftRole } from '../shift-role/entities/shift-role.entity';
import { Group } from '../group/entities/group.entity';

export interface SimplifiedScheduleRequest {
  ruleId: number;
  startDate: string;
  endDate: string;
}

export interface RoleBasedScheduleRequest {
  roleIds: number[];
  startDate: string;
  endDate: string;
  forceRegenerate?: boolean;
}

export interface SimplifiedScheduleResult {
  success: boolean;
  schedules: Schedule[];
  conflicts: string[];
  message: string;
}

@Injectable()
export class SimplifiedScheduleEngineService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(ScheduleRule)
    private scheduleRuleRepository: Repository<ScheduleRule>,
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(ShiftRole)
    private shiftRoleRepository: Repository<ShiftRole>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  /**
   * 简化的排班生成逻辑
   * 核心思路：值班角色配置 + 排班规则 = 自动排班
   */
  async generateSchedule(request: SimplifiedScheduleRequest): Promise<SimplifiedScheduleResult> {
    try {
      // 1. 获取排班规则
      const rule = await this.scheduleRuleRepository.findOne({
        where: { id: request.ruleId, isActive: true }
      });

      if (!rule) {
        return {
          success: false,
          schedules: [],
          conflicts: [],
          message: '排班规则不存在或未启用'
        };
      }

      // 2. 获取相关的班次和角色
      const shifts = await this.getShiftsFromRule(rule);
      const roles = await this.getRolesFromRule(rule);

      if (shifts.length === 0 || roles.length === 0) {
        return {
          success: false,
          schedules: [],
          conflicts: [],
          message: '排班规则缺少班次或角色配置'
        };
      }

      // 3. 生成日期范围
      const dateRange = this.generateDateRange(request.startDate, request.endDate);
      const workDays = this.filterWorkDays(dateRange, rule.timeConfig.workDays);

      // 4. 初始化轮换状态
      const rotationState = this.initializeRotationState(rule);

      // 5. 为每个工作日生成排班
      const schedules: Schedule[] = [];
      const conflicts: string[] = [];

      for (const date of workDays) {
        for (const shift of shifts) {
          for (const role of roles) {
            const daySchedule = await this.generateDaySchedule(
              date,
              shift,
              role,
              rule,
              rotationState
            );

            if (daySchedule.success && daySchedule.schedule) {
              schedules.push(daySchedule.schedule);
            } else {
              conflicts.push(`${date} ${shift.name} ${role.name}: ${daySchedule.error}`);
            }
          }
        }
      }

      return {
        success: schedules.length > 0,
        schedules,
        conflicts,
        message: this.generateResultMessage(schedules.length, conflicts.length, workDays.length)
      };

    } catch (error) {
      return {
        success: false,
        schedules: [],
        conflicts: [],
        message: `排班生成失败: ${error.message}`
      };
    }
  }

  /**
   * 为单个日期、班次、角色生成排班
   * 这是核心逻辑：根据角色配置筛选人员，根据规则进行轮换
   */
  private async generateDaySchedule(
    date: string,
    shift: Shift,
    role: ShiftRole,
    rule: ScheduleRule,
    rotationState: any
  ): Promise<{ success: boolean; schedule?: Schedule; error?: string }> {
    
    // 1. 根据角色配置筛选可用人员
    const availablePersonnel = await this.filterPersonnelByRole(role, date);
    
    if (availablePersonnel.length === 0) {
      return {
        success: false,
        error: '没有符合条件的可用人员'
      };
    }

    // 2. 根据分配类型选择人员或编组
    let assignedPersonId: number | null = null;
    let assignedGroupId: number | null = null;
    let assignmentType: 'SINGLE' | 'GROUP' = role.assignmentType;

    if (role.assignmentType === 'SINGLE') {
      // 单人分配：根据轮换规则选择人员
      const selectedPerson = this.selectPersonByRotation(
        availablePersonnel,
        rule.rotationConfig,
        rotationState,
        `${role.id}_${shift.id}`
      );
      assignedPersonId = selectedPerson.id;
    } else {
      // 编组分配：根据轮换规则选择编组
      const availableGroups = await this.getAvailableGroups(role, availablePersonnel);
      if (availableGroups.length === 0) {
        return {
          success: false,
          error: '没有可用的编组'
        };
      }
      
      const selectedGroup = this.selectGroupByRotation(
        availableGroups,
        rule.rotationConfig,
        rotationState,
        `${role.id}_${shift.id}`
      );
      assignedGroupId = selectedGroup.id;
    }

    // 3. 创建排班记录
    const schedule = new Schedule();
    schedule.date = new Date(date);
    schedule.shiftId = shift.id;
    schedule.roleId = role.id;
    schedule.assignedPersonId = assignedPersonId;
    schedule.assignedGroupId = assignedGroupId;
    schedule.assignmentType = assignmentType;
    schedule.status = 'NORMAL';

    return {
      success: true,
      schedule
    };
  }

  /**
   * 根据角色配置筛选人员
   * 这里实现了你说的"值班角色配置"的核心逻辑
   */
  private async filterPersonnelByRole(role: ShiftRole, date: string): Promise<Employee[]> {
    // 获取所有员工
    const allEmployees = await this.employeeRepository.find();

    return allEmployees.filter(employee => {
      // 1. 检查员工状态（是否可用）
      if (employee.status !== 'ON_DUTY') {
        return false;
      }

      // 2. 检查状态时间段（是否在请假/出差期间）
      if (employee.statusStartDate) {
        const checkDate = new Date(date);
        const startDate = new Date(employee.statusStartDate);
        
        // 如果是长期状态或没有结束日期
        if (employee.isLongTerm || !employee.statusEndDate) {
          if (checkDate >= startDate) {
            return false; // 在不可用时间段内
          }
        } else {
          // 有结束日期的情况
          const endDate = new Date(employee.statusEndDate);
          if (checkDate >= startDate && checkDate <= endDate) {
            return false; // 在不可用时间段内
          }
        }
      }

      // 3. 根据角色的筛选条件进行筛选
      const criteria = role.selectionCriteria;

      // 按岗位筛选
      if (criteria.byPosition && criteria.byPosition.length > 0) {
        // 检查员工的组织职位或传统职位字段
        const empPosition = employee.organizationNode?.name || employee.organizationPosition || employee.position;
        if (!empPosition || !criteria.byPosition.includes(empPosition)) {
          return false;
        }
      }

      // 可以扩展更多筛选条件...
      // 按标签筛选、按部门筛选等

      return true;
    });
  }

  /**
   * 根据轮换规则选择人员
   * 这里实现了你说的"排班规则"中的轮换逻辑
   */
  private selectPersonByRotation(
    availablePersonnel: Employee[],
    rotationConfig: any,
    rotationState: any,
    stateKey: string
  ): Employee {
    
    // 获取或初始化该角色班次的轮换状态
    if (!rotationState[stateKey]) {
      rotationState[stateKey] = {
        currentIndex: 0,
        lastAssignmentDate: null
      };
    }

    const state = rotationState[stateKey];

    switch (rotationConfig.mode) {
      case 'SEQUENTIAL':
        // 顺序轮换
        const index = state.currentIndex % availablePersonnel.length;
        state.currentIndex = (state.currentIndex + 1) % availablePersonnel.length;
        return availablePersonnel[index];

      case 'BALANCED':
        // 负载均衡轮换（选择工作最少的人）
        // 这里可以实现更复杂的负载均衡逻辑
        return availablePersonnel[0]; // 简化实现

      case 'RANDOM':
        // 随机选择
        const randomIndex = Math.floor(Math.random() * availablePersonnel.length);
        return availablePersonnel[randomIndex];

      default:
        return availablePersonnel[0];
    }
  }

  /**
   * 根据轮换规则选择编组
   */
  private selectGroupByRotation(
    availableGroups: Group[],
    rotationConfig: any,
    rotationState: any,
    stateKey: string
  ): Group {
    // 类似于人员选择的逻辑，但针对编组
    if (!rotationState[stateKey]) {
      rotationState[stateKey] = {
        currentIndex: 0,
        lastAssignmentDate: null
      };
    }

    const state = rotationState[stateKey];
    const index = state.currentIndex % availableGroups.length;
    state.currentIndex = (state.currentIndex + 1) % availableGroups.length;
    
    return availableGroups[index];
  }

  // 辅助方法
  private async getShiftsFromRule(rule: ScheduleRule): Promise<Shift[]> {
    const shiftIds = rule.timeConfig.shifts?.map(s => s.id) || [];
    if (shiftIds.length === 0) return [];
    
    return await this.shiftRepository.findByIds(shiftIds);
  }

  private async getRolesFromRule(rule: ScheduleRule): Promise<ShiftRole[]> {
    const roleIds = rule.roleConfig.roles?.map(r => r.id) || [];
    if (roleIds.length === 0) return [];
    
    return await this.shiftRoleRepository.findByIds(roleIds);
  }

  private async getAvailableGroups(role: ShiftRole, availablePersonnel: Employee[]): Promise<Group[]> {
    // 获取包含可用人员的编组
    const allGroups = await this.groupRepository.find();
    
    return allGroups.filter(group => {
      // 检查编组是否适用于该角色
      if (!group.applicableRoles.includes(role.name)) {
        return false;
      }
      
      // 检查编组成员是否都可用
      const memberIds = group.memberIds || [];
      const availableIds = availablePersonnel.map(p => p.id);
      
      return memberIds.every(id => availableIds.includes(id));
    });
  }

  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  private filterWorkDays(dates: string[], workDays: number[]): string[] {
    if (!workDays || workDays.length === 0) {
      return dates; // 如果没有指定工作日，则所有日期都是工作日
    }

    return dates.filter(date => {
      const dayOfWeek = new Date(date).getDay(); // 0=Sunday, 1=Monday, ...
      return workDays.includes(dayOfWeek);
    });
  }

  private initializeRotationState(rule: ScheduleRule): any {
    return {}; // 简化的轮换状态管理
  }

  private generateResultMessage(scheduledCount: number, conflictCount: number, totalDays: number): string {
    if (conflictCount === 0) {
      return `排班生成完成，共生成 ${scheduledCount} 个排班记录`;
    } else {
      return `排班生成完成，共生成 ${scheduledCount} 个排班记录，${conflictCount} 个冲突需要处理`;
    }
  }

  /**
   * 基于值班角色配置的排班生成
   * 新的排班逻辑：直接使用值班角色配置，不依赖传统的规则和班次
   */
  async generateRoleBasedSchedule(request: RoleBasedScheduleRequest): Promise<SimplifiedScheduleResult> {
    try {
      // 1. 获取所有指定的值班角色
      // 获取所有活跃的角色，然后过滤
      const allRoles = await this.shiftRoleRepository.find({
        where: { isActive: true }
      });
      
      const roles = request.roleIds.length > 0 
        ? allRoles.filter(role => request.roleIds.includes(role.id))
        : allRoles;

      if (roles.length === 0) {
        return {
          success: false,
          schedules: [],
          conflicts: [],
          message: '未找到可用的值班角色配置'
        };
      }

      // 2. 生成日期范围
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const schedules: Schedule[] = [];
      const conflicts: string[] = [];
      const rotationStates: { [key: string]: any } = {};

      // 3. 为每个角色初始化轮换状态
      roles.forEach(role => {
        const config = role.extendedConfig || {};
        const consecutiveDays = config.rules?.consecutiveDays || 3; // 从角色配置获取连续天数
        rotationStates[role.id] = { 
          currentIndex: 0,
          consecutiveDays: consecutiveDays
        };
      });

      // 4. 遍历每一天
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ...

        // 5. 为每个角色生成排班
        for (const role of roles) {
          const config = role.extendedConfig;
          if (!config?.timeConfig) continue;

          // 检查是否是工作日
          const workDays = config.timeConfig.workDays || [];
          // 支持数字和字符串两种格式的工作日配置
          const dayOfWeekStr = dayOfWeek.toString();
          const dayOfWeekNum = dayOfWeek;
          if (!workDays.includes(dayOfWeekStr) && !workDays.includes(dayOfWeekNum)) continue;

          // 检查是否需要重新生成
          if (!request.forceRegenerate) {
            const existingSchedule = await this.scheduleRepository.findOne({
              where: { 
                date: new Date(dateStr),
                roleId: role.id
              }
            });
            if (existingSchedule) continue;
          }

          // 生成该角色的排班
          const daySchedule = await this.generateRoleScheduleForDay(
            role,
            dateStr,
            rotationStates[role.id]
          );

          if (daySchedule.success && daySchedule.schedule) {
            schedules.push(daySchedule.schedule);
          } else {
            conflicts.push(`${dateStr} ${role.name}: ${daySchedule.error}`);
          }
        }
      }

      return {
        success: true,
        schedules,
        conflicts,
        message: this.generateResultMessage(schedules.length, conflicts.length, 0)
      };

    } catch (error) {
      return {
        success: false,
        schedules: [],
        conflicts: [],
        message: `排班生成失败: ${error.message}`
      };
    }
  }

  /**
   * 为指定角色和日期生成排班
   */
  private async generateRoleScheduleForDay(
    role: ShiftRole,
    date: string,
    rotationState: any
  ): Promise<{ success: boolean; schedule?: Schedule; error?: string }> {
    
    const config = role.extendedConfig;
    if (!config?.rotationOrder || config.rotationOrder.length === 0) {
      return {
        success: false,
        error: '角色未配置值班人员'
      };
    }

    // 获取可用人员
    const availablePersonnel = await this.getAvailablePersonnelForRole(role, date);
    if (availablePersonnel.length === 0) {
      return {
        success: false,
        error: '没有可用人员'
      };
    }

    // 根据轮换规则选择人员
    let assignedPersonId: number | null = null;
    let assignedGroupId: number | null = null;

    if (role.assignmentType === 'SINGLE') {
      // 检查是否是连班模式
      const rotationType = config.rotationType || config.rules?.rotationType || 'sequential';
      
      console.log(`🔍 检查轮换类型: roleId=${role.id}, rotationType=${rotationType}, config:`, {
        configRotationType: config.rotationType,
        rulesRotationType: config.rules?.rotationType,
        finalRotationType: rotationType,
        workDays: config.timeConfig?.workDays,
        rotationOrderLength: config.rotationOrder?.length,
        currentDate: date,
        currentDayOfWeek: new Date(date).getDay()
      });
      
      if (rotationType === 'CONSECUTIVE_DAYS' || rotationType === 'CONTINUOUS') {
        // 连班模式：选中的工作日由同一人连续值班，每周轮换
                const selectedPerson = this.selectPersonForConsecutiveDays(
          availablePersonnel,
          config.rotationOrder,
          date,
          rotationState
        );
        assignedPersonId = selectedPerson.id;
              } else {
        // 其他轮换模式
                const selectedPerson = this.selectPersonFromRotation(
          availablePersonnel,
          config.rotationOrder,
          rotationType,
          rotationState
        );
        assignedPersonId = selectedPerson.id;
              }
    } else {
      // 编组值班：根据轮换规则选择编组
      if (config.selectedGroups && config.selectedGroups.length > 0) {
        const groupRotationType = config.rotationType || config.rules?.rotationType || 'sequential';
                const selectedGroup = this.selectGroupForSchedule(
          config.selectedGroups,
          groupRotationType,
          date,
          rotationState
        );
        assignedGroupId = selectedGroup;
      } else {
        return {
          success: false,
          error: '角色未配置值班编组'
        };
      }
    }

    // 创建排班记录
    const scheduleData: any = {
      date: new Date(date),
      roleId: role.id,
      shiftId: 1, // 临时使用默认值，因为现在基于角色而不是班次
      assignmentType: role.assignmentType,
      status: 'NORMAL',
      startTime: this.formatTimeString(config.timeConfig.startTime),
      endTime: this.formatTimeString(config.timeConfig.endTime),
      title: `${role.name}值班`,
      shift: role.name,
      start: new Date(`${date}T${this.formatTimeString(config.timeConfig.startTime)}:00`),
      end: new Date(`${date}T${this.formatTimeString(config.timeConfig.endTime)}:00`)
    };

    // 根据分配类型设置相应的ID字段
    if (role.assignmentType === 'SINGLE' && assignedPersonId) {
      scheduleData.assignedPersonId = assignedPersonId;
      scheduleData.employeeId = assignedPersonId;
    } else if (role.assignmentType === 'GROUP' && assignedGroupId) {
      scheduleData.assignedGroupId = assignedGroupId;
      // 编组排班不设置employeeId
    }

        const schedule = this.scheduleRepository.create(scheduleData);

    const savedSchedule = await this.scheduleRepository.save(schedule);
    
    // TypeORM save 可能返回数组，取第一个元素
    const finalSchedule = Array.isArray(savedSchedule) ? savedSchedule[0] : savedSchedule;

    return {
      success: true,
      schedule: finalSchedule
    };
  }

  /**
   * 从轮换顺序中选择人员
   */
  private selectPersonFromRotation(
    availablePersonnel: Employee[],
    rotationOrder: any[],
    rotationType: string,
    rotationState: any
  ): Employee {
    
    // 过滤出在轮换顺序中且可用的人员
    const orderedAvailable = rotationOrder
      .map(item => availablePersonnel.find(emp => emp.id === item.key))
      .filter((emp): emp is Employee => emp !== undefined);

    if (orderedAvailable.length === 0) {
      return availablePersonnel[0]; // 降级处理
    }

    switch (rotationType) {
      case 'sequential':
      case 'DAILY_ROTATION':
        // 顺序轮换
        const index = rotationState.currentIndex % orderedAvailable.length;
        rotationState.currentIndex = (rotationState.currentIndex + 1) % orderedAvailable.length;
        return orderedAvailable[index];

      case 'random':
        // 随机选择
        const randomIndex = Math.floor(Math.random() * orderedAvailable.length);
        return orderedAvailable[randomIndex];

      case 'balanced':
        // 负载均衡 - 简化实现
        return orderedAvailable[0];

      default:
        return orderedAvailable[0];
    }
  }

  /**
   * 连班模式的人员选择逻辑
   * 修复：同一周内的指定工作日由同一人值班，每周轮换
   */
  private selectPersonForConsecutiveDays(
    availablePersonnel: Employee[],
    rotationOrder: any[],
    date: string,
    rotationState: any
  ): Employee {
    
    // 过滤出在轮换顺序中且可用的人员
    const orderedAvailable = rotationOrder
      .map(item => availablePersonnel.find(emp => emp.id === item.key))
      .filter((emp): emp is Employee => emp !== undefined);

    if (orderedAvailable.length === 0) {
            return availablePersonnel[0]; // 降级处理
    }

    // 修复：使用周数而不是连续天数来确定人员
    const currentDate = new Date(date);
    const weekNumber = this.getWeekNumber(currentDate);
    
    // 根据周数确定值班人员（每周轮换）
    const personIndex = weekNumber % orderedAvailable.length;
    const selectedPerson = orderedAvailable[personIndex];
    
        return selectedPerson;
  }

  /**
   * 编组值班的选择逻辑
   * 根据轮换类型选择合适的编组
   */
  private selectGroupForSchedule(
    selectedGroups: number[],
    rotationType: string,
    date: string,
    rotationState: any
  ): number {
    
    if (selectedGroups.length === 0) {
      throw new Error('没有可用的编组');
    }

    const currentDate = new Date(date);
    
    switch (rotationType) {
      case 'DAILY_ROTATION':
        // 每日轮换编组
        if (!rotationState.groupDailyIndex) {
          rotationState.groupDailyIndex = 0;
        }
        const dailyIndex = rotationState.groupDailyIndex % selectedGroups.length;
        rotationState.groupDailyIndex++;
                return selectedGroups[dailyIndex];

      case 'WEEKLY_ROTATION':
      case 'GROUP_WEEKLY':
        // 每周轮换编组
        const weekNumber = this.getWeekNumber(currentDate);
        const weeklyIndex = weekNumber % selectedGroups.length;
                return selectedGroups[weeklyIndex];

      case 'CONSECUTIVE_DAYS':
      case 'CONTINUOUS':
        // 连班模式下的编组轮换（每周轮换）
        const consecutiveWeekNumber = this.getWeekNumber(currentDate);
        const consecutiveIndex = consecutiveWeekNumber % selectedGroups.length;
                return selectedGroups[consecutiveIndex];

      default:
        // 默认顺序轮换
        if (!rotationState.groupSequentialIndex) {
          rotationState.groupSequentialIndex = 0;
        }
        const seqIndex = rotationState.groupSequentialIndex % selectedGroups.length;
        rotationState.groupSequentialIndex++;
        return selectedGroups[seqIndex];
    }
  }

  /**
   * 获取周数（从年初开始计算）
   */
  private getWeekNumber(date: Date): number {
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekStart = this.getWeekStart(yearStart);
    const diffTime = date.getTime() - weekStart.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks;
  }

  /**
   * 获取一周的开始日期（周一）
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一
    return new Date(d.setDate(diff));
  }

  /**
   * 获取角色的可用人员
   */
  private async getAvailablePersonnelForRole(role: ShiftRole, date: string): Promise<Employee[]> {
    const allEmployees = await this.employeeRepository.find();
    
    return allEmployees.filter(employee => {
      // 基础状态检查
      if (employee.status !== 'ON_DUTY') {
        return false;
      }

      // 检查是否在轮换顺序中
      const config = role.extendedConfig;
      if (config?.rotationOrder) {
        const isInRotation = config.rotationOrder.some(item => item.key === employee.id);
        if (!isInRotation) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 格式化时间字符串
   */
  private formatTimeString(time: any): string {
    if (!time) return '';
    
    if (typeof time === 'string') {
      return time;
    }
    
    if (time instanceof Date) {
      return time.toTimeString().slice(0, 5); // HH:MM格式
    }
    
    // 如果是对象格式（如从前端传来的Date对象序列化）
    if (typeof time === 'object' && time.getHours) {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    return time.toString();
  }

  /**
   * 获取所有可用的值班角色
   */
  async getAvailableRoles() {
    const roles = await this.shiftRoleRepository.find({
      where: { isActive: true }
    });

    return roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      assignmentType: role.assignmentType,
      hasTimeConfig: !!(role.extendedConfig?.timeConfig?.startTime && role.extendedConfig?.timeConfig?.endTime),
      hasPersonnel: !!(role.extendedConfig?.rotationOrder?.length > 0),
      isComplete: !!(
        role.extendedConfig?.timeConfig?.startTime && 
        role.extendedConfig?.timeConfig?.endTime &&
        role.extendedConfig?.rotationOrder?.length > 0
      )
    }));
  }
}