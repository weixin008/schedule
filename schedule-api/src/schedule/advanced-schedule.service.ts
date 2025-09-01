import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';
import { ShiftRole } from '../shift-role/entities/shift-role.entity';
import { Group } from '../group/entities/group.entity';
import { WeekendContinuousScheduleService } from './weekend-continuous-schedule.service';

export interface AdvancedScheduleRule {
  roleId: number;
  ruleName: string;
  ruleType: 'DAILY_ROTATION' | 'WEEKLY_ROTATION' | 'CONSECUTIVE_DAYS' | 'GROUP_WEEKLY';
  personnelIds: number[];
  groupIds?: number[];
  workDays: number[]; // 0=周日, 1=周一, ..., 6=周六
  startTime: string;
  endTime: string;
  rotationConfig?: {
    weekdayRotation?: 'DAILY' | 'CONTINUOUS';
    weekendRotation?: 'DAILY' | 'CONTINUOUS' | 'SINGLE_PERSON';
    continuousDays?: number;
    groupRotationWeeks?: number;
  };
}

@Injectable()
export class AdvancedScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(ShiftRole)
    private shiftRoleRepository: Repository<ShiftRole>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    private weekendContinuousService: WeekendContinuousScheduleService,
  ) {}

  /**
   * 生成高级排班规则
   * 支持复杂的轮换逻辑：
   * 1. 带班领导每日轮换
   * 2. 值班员周一至周四每日轮换，周五至周日单人连续值班
   * 3. 考勤监督员按组每周轮换
   */
  async generateAdvancedSchedule(
    startDate: Date,
    endDate: Date,
    rules: AdvancedScheduleRule[]
  ): Promise<Schedule[]> {
    const schedules: Schedule[] = [];
    
    for (const rule of rules) {
      const ruleSchedules = await this.generateScheduleForRule(rule, startDate, endDate);
      schedules.push(...ruleSchedules);
    }
    
    return schedules;
  }

  private async generateScheduleForRule(
    rule: AdvancedScheduleRule,
    startDate: Date,
    endDate: Date
  ): Promise<Schedule[]> {
    const schedules: Schedule[] = [];
    
    // 获取人员信息
    const personnel = await this.employeeRepository.findByIds(rule.personnelIds);
    const groups = rule.groupIds ? await this.groupRepository.findByIds(rule.groupIds) : [];
    
    // 对于CONSECUTIVE_DAYS规则，使用专门的算法
    if (rule.ruleType === 'CONSECUTIVE_DAYS') {
      return this.generateConsecutiveDaysSchedules(rule, personnel, startDate, endDate);
    }
    
    // 其他规则类型的处理
    const currentDate = new Date(startDate);
    let rotationIndex = 0;
    let weekStartDate = this.getWeekStart(currentDate);
    let weekNumber = 0;
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=周日, 1=周一, ..., 6=周六
      
      // 检查是否是工作日
      if (rule.workDays.includes(dayOfWeek)) {
        let assignedPersonId: number | null = null;
        let assignedGroupId: number | null = null;
        let assignmentType: 'SINGLE' | 'GROUP' = 'SINGLE';
        
        switch (rule.ruleType) {
          case 'DAILY_ROTATION':
            // 每日轮换（适用于带班领导）
            assignedPersonId = personnel[rotationIndex % personnel.length]?.id;
            rotationIndex++;
            break;
            
          case 'WEEKLY_ROTATION':
            // 按周轮换（适用于考勤监督员编组）
            if (groups.length > 0) {
              assignedGroupId = groups[weekNumber % groups.length]?.id;
              assignmentType = 'GROUP';
            } else {
              assignedPersonId = personnel[weekNumber % personnel.length]?.id;
            }
            break;
            
          case 'GROUP_WEEKLY':
            // 编组按周轮换
            if (groups.length > 0) {
              assignedGroupId = groups[weekNumber % groups.length]?.id;
              assignmentType = 'GROUP';
            }
            break;
        }
        
        if (assignedPersonId || assignedGroupId) {
          const schedule = this.scheduleRepository.create({
            date: new Date(currentDate),
            shiftId: 1, // 默认班次ID
            roleId: rule.roleId,
            assignedPersonId,
            assignedGroupId,
            assignmentType,
            status: 'NORMAL',
            startTime: rule.startTime,
            endTime: rule.endTime,
            notes: `自动生成 - ${rule.ruleName}`
          });
          
          schedules.push(schedule);
        }
      }
      
      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
      
      // 检查是否进入新的一周
      const newWeekStart = this.getWeekStart(currentDate);
      if (newWeekStart.getTime() !== weekStartDate.getTime()) {
        weekStartDate = newWeekStart;
        weekNumber++;
      }
    }
    
    return schedules;
  }

  /**
   * 专门处理连班模式的排班生成
   * 修复逻辑：确保同一周的指定工作日由同一人值班
   */
  private generateConsecutiveDaysSchedules(
    rule: AdvancedScheduleRule,
    personnel: Employee[],
    startDate: Date,
    endDate: Date
  ): Schedule[] {
    const schedules: Schedule[] = [];
    
            // 连班逻辑：同一周内的指定工作日由同一人值班，每周轮换
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=周日, 1=周一, ..., 6=周六
      
      // 只处理规则指定的工作日
      if (rule.workDays.includes(dayOfWeek)) {
        // 计算当前是第几周（从开始日期算起）
        const weekNumber = this.getWeekNumber(startDate, currentDate);
        
        // 根据周数确定值班人员（每周轮换）
        const personIndex = weekNumber % personnel.length;
        const assignedPerson = personnel[personIndex];
        
        console.log(`📅 ${currentDate.toISOString().split('T')[0]} (第${weekNumber}周) - ${assignedPerson.name}`);
        
        const schedule = this.scheduleRepository.create({
          date: new Date(currentDate),
          shiftId: 1, // 默认班次ID
          roleId: rule.roleId,
          assignedPersonId: assignedPerson.id,
          assignedGroupId: null,
          assignmentType: 'SINGLE',
          status: 'NORMAL',
          startTime: rule.startTime,
          endTime: rule.endTime,
          notes: `连班模式 - ${rule.ruleName} (第${weekNumber}周 - ${assignedPerson.name})`,
          // 添加兼容字段
          employeeId: assignedPerson.id,
          start: new Date(currentDate),
          end: new Date(currentDate)
        });
        
        // 设置具体的开始和结束时间
        schedule.start.setHours(parseInt(rule.startTime.split(':')[0]), parseInt(rule.startTime.split(':')[1]), 0, 0);
        schedule.end.setHours(parseInt(rule.endTime.split(':')[0]), parseInt(rule.endTime.split(':')[1]), 0, 0);
        
        schedules.push(schedule);
      }
      
      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
        return schedules;
  }

  /**
   * 计算周数（从开始日期算起）
   * 修复：确保同一周内的日期返回相同的周数
   */
  private getWeekNumber(startDate: Date, currentDate: Date): number {
    // 获取当前日期所在周的周一
    const currentWeekStart = this.getWeekStart(currentDate);
    
    // 获取开始日期所在周的周一
    const startWeekStart = this.getWeekStart(startDate);
    
    // 计算周数差
    const timeDiff = currentWeekStart.getTime() - startWeekStart.getTime();
    const weeksDiff = Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000));
    
    return Math.max(0, weeksDiff);
  }

  /**
   * 获取周末连续值班的人员分配
   * 实现逻辑：周一至周四每日轮换，周五至周日由同一人连续值班
   */
  private getWeekendContinuousAssignment(
    currentDate: Date,
    personnel: Employee[],
    rotationConfig?: AdvancedScheduleRule['rotationConfig']
  ): number | null {
    const dayOfWeek = currentDate.getDay();
    const weekStart = this.getWeekStart(currentDate);
    // 使用年初作为基准日期计算周数
    const yearStart = new Date(currentDate.getFullYear(), 0, 1);
    const weekNumber = this.getWeekNumber(yearStart, currentDate);
    
    // 周一至周四：每日轮换
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      // 简单的每日轮换逻辑
      // 计算从开始日期到现在总共过了多少个工作日（周一到周四）
      const totalWorkdays = weekNumber * 4 + (dayOfWeek - 1);
      const rotationIndex = totalWorkdays % personnel.length;
      return personnel[rotationIndex]?.id || null;
    }
    
    // 周五至周日：同一人连续值班3天
    if (dayOfWeek >= 5 || dayOfWeek === 0) {
      // 关键逻辑：确保周五、周六、周日是同一个人
      // 每周轮换一个人负责周末值班
      const weekendPersonIndex = weekNumber % personnel.length;
      return personnel[weekendPersonIndex]?.id || null;
    }
    
    return null;
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
   * 创建预设的排班规则模板
   */
  async createPresetRules(): Promise<AdvancedScheduleRule[]> {
    // 获取所有员工，按标签分类
    const allEmployees = await this.employeeRepository.find();
    
    const leaders = allEmployees.filter(emp => 
      emp.tags?.includes('领导') || 
      emp.organizationPosition?.includes('领导') ||
      emp.organizationPosition?.includes('主任') ||
      emp.organizationPosition?.includes('院长')
    );
    
    const dutyOfficers = allEmployees.filter(emp => 
      !emp.tags?.includes('领导') && 
      emp.status === 'ON_DUTY' &&
      !emp.organizationPosition?.includes('领导') &&
      !emp.organizationPosition?.includes('主任') &&
      !emp.organizationPosition?.includes('院长')
    );

    const rules: AdvancedScheduleRule[] = [];

    // 1. 带班领导规则（3人每日轮换）
    if (leaders.length >= 3) {
      rules.push({
        roleId: 1,
        ruleName: '带班领导',
        ruleType: 'DAILY_ROTATION',
        personnelIds: leaders.slice(0, 3).map(emp => emp.id),
        workDays: [1, 2, 3, 4, 5, 6, 0], // 全周
        startTime: '08:00',
        endTime: '18:00'
      });
    }

    // 2. 值班员规则（9人，周一至周四每日轮换，周五至周日连续值班）
    if (dutyOfficers.length >= 9) {
      rules.push({
        roleId: 2,
        ruleName: '值班员',
        ruleType: 'CONSECUTIVE_DAYS',
        personnelIds: dutyOfficers.slice(0, 9).map(emp => emp.id),
        workDays: [1, 2, 3, 4, 5, 6, 0], // 全周
        startTime: '18:00',
        endTime: '08:00',
        rotationConfig: {
          weekdayRotation: 'DAILY',
          weekendRotation: 'CONTINUOUS',
          continuousDays: 3
        }
      });
    }

    return rules;
  }

  /**
   * 批量保存排班记录
   */
  async saveSchedules(schedules: Schedule[]): Promise<Schedule[]> {
    return await this.scheduleRepository.save(schedules);
  }

  /**
   * 清除指定日期范围的排班记录
   */
  async clearScheduleRange(startDate: Date, endDate: Date): Promise<void> {
    await this.scheduleRepository
      .createQueryBuilder()
      .delete()
      .where('date >= :startDate AND date <= :endDate', { startDate, endDate })
      .execute();
  }

  /**
   * 从ShiftRole配置生成排班
   */
  async generateScheduleFromRoles(
    startDate: Date,
    endDate: Date,
    roleIds: number[],
    clearExisting: boolean = false
  ): Promise<Schedule[]> {
    if (clearExisting) {
      await this.clearScheduleRange(startDate, endDate);
    }

    const schedules: Schedule[] = [];
    
    // 获取角色配置
    const roles = await this.shiftRoleRepository.findByIds(roleIds);
    
    for (const role of roles) {
      if (!role.isActive) continue;
      
      const config = role.extendedConfig || {};
      const timeConfig = config.timeConfig || {};
      
      // 构建排班规则
      const rule: AdvancedScheduleRule = {
        roleId: role.id,
        ruleName: role.name,
        ruleType: this.mapRotationTypeToRuleType(config.rotationType) || 'DAILY_ROTATION',
        personnelIds: config.rotationOrder?.map((person: any) => person.key) || [],
        groupIds: config.selectedGroups || [],
        workDays: timeConfig.workDays?.map((day: any) => typeof day === 'string' ? parseInt(day) : day) || [1, 2, 3, 4, 5],
        startTime: this.formatTime(timeConfig.startTime) || '08:00',
        endTime: this.formatTime(timeConfig.endTime) || '18:00',
        rotationConfig: {
          continuousDays: config.rules?.consecutiveDays || 3
        }
      };
      
      // 生成该角色的排班
      const roleSchedules = await this.generateScheduleForRule(rule, startDate, endDate);
      schedules.push(...roleSchedules);
    }
    
    return schedules;
  }

  /**
   * 将前端的rotationType映射到后端的ruleType
   */
  private mapRotationTypeToRuleType(rotationType: string): 'DAILY_ROTATION' | 'WEEKLY_ROTATION' | 'CONSECUTIVE_DAYS' | 'GROUP_WEEKLY' {
    switch (rotationType) {
      case 'DAILY_ROTATION':
        return 'DAILY_ROTATION';
      case 'WEEKLY_ROTATION':
        return 'WEEKLY_ROTATION';
      case 'CONTINUOUS':
      case 'CONSECUTIVE_DAYS':
        return 'CONSECUTIVE_DAYS'; // 统一使用CONSECUTIVE_DAYS作为连班模式
      case 'GROUP_WEEKLY':
        return 'GROUP_WEEKLY';
      default:
        return 'DAILY_ROTATION';
    }
  }

  /**
   * 格式化时间
   */
  private formatTime(time: any): string {
    if (!time) return '08:00';
    if (typeof time === 'string') return time;
    if (time instanceof Date) {
      return time.toTimeString().slice(0, 5);
    }
    return '08:00';
  }

  /**
   * 验证排班规则的有效性
   */
  validateRule(rule: AdvancedScheduleRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.personnelIds || rule.personnelIds.length === 0) {
      errors.push('必须指定至少一个人员');
    }

    if (!rule.workDays || rule.workDays.length === 0) {
      errors.push('必须指定至少一个工作日');
    }

    if (rule.ruleType === 'DAILY_ROTATION' && rule.personnelIds.length < 2) {
      errors.push('每日轮换至少需要2个人员');
    }

    if (rule.ruleType === 'CONSECUTIVE_DAYS' && rule.personnelIds.length < 2) {
      errors.push('连班模式建议至少2个人员');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}