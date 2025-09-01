import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';
import { EmployeeStatus, EmployeeStatusType } from '../employee/entities/employee-status.entity';
import { ShiftRule } from '../schedule-rule/entities/shift-rule.entity';

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: ConflictDetail[];
  suggestions: ConflictSuggestion[];
}

export interface ConflictDetail {
  id: string;
  type: ConflictType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  scheduleId?: number;
  employeeId?: number;
  affectedDate?: string;
}

export interface ConflictSuggestion {
  type: 'replacement' | 'reschedule' | 'add_personnel';
  description: string;
  availableEmployees?: Employee[];
  alternativeDates?: string[];
}

export enum ConflictType {
  EMPLOYEE_UNAVAILABLE = 'employee_unavailable',
  INSUFFICIENT_LEVEL = 'insufficient_level',
  DOUBLE_SHIFT = 'double_shift',
  CONSECUTIVE_SHIFTS = 'consecutive_shifts',
  INSUFFICIENT_REST = 'insufficient_rest',
  RULE_VIOLATION = 'rule_violation',
  MISSING_REQUIRED_POSITION = 'missing_required_position',
}

@Injectable()
export class ScheduleConflictService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeStatus)
    private employeeStatusRepository: Repository<EmployeeStatus>,
    @InjectRepository(ShiftRule)
    private shiftRuleRepository: Repository<ShiftRule>,
  ) {}

  async detectConflicts(
    date: string,
    employeeId?: number,
    positionId?: number,
    scheduleId?: number
  ): Promise<ConflictResult> {
    const conflicts: ConflictDetail[] = [];
    const suggestions: ConflictSuggestion[] = [];

    // 获取当日所有排班
    const daySchedules = await this.getDaySchedules(date);
    
    if (employeeId) {
      // 检查员工相关冲突
      const employeeConflicts = await this.checkEmployeeConflicts(employeeId, date, daySchedules);
      conflicts.push(...employeeConflicts);
    }

    if (positionId) {
      // 检查岗位相关冲突
      const positionConflicts = await this.checkPositionConflicts(positionId, date, daySchedules);
      conflicts.push(...positionConflicts);
    }

    // 检查规则违反
    const ruleConflicts = await this.checkRuleViolations(date, daySchedules);
    conflicts.push(...ruleConflicts);

    // 生成解决建议
    if (conflicts.length > 0) {
      const conflictSuggestions = await this.generateSuggestions(conflicts, date, positionId);
      suggestions.push(...conflictSuggestions);
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      suggestions,
    };
  }

  private async getDaySchedules(date: string): Promise<Schedule[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.scheduleRepository.find({
      where: {
        start: Between(startOfDay, endOfDay),
      },
      relations: ['employee', 'position'],
    });
  }

  private async checkEmployeeConflicts(
    employeeId: number,
    date: string,
    daySchedules: Schedule[]
  ): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];

    // 检查员工状态
    const employeeStatus = await this.getEmployeeStatus(employeeId, date);
    if (employeeStatus && employeeStatus.status !== EmployeeStatusType.AVAILABLE) {
      conflicts.push({
        id: `employee_status_${employeeId}_${date}`,
        type: ConflictType.EMPLOYEE_UNAVAILABLE,
        title: '员工不可用',
        description: `员工当前状态为"${employeeStatus.status}"，无法安排值班`,
        severity: 'high',
        employeeId,
        affectedDate: date,
      });
    }

    // 检查重复排班
    const employeeSchedules = daySchedules.filter(s => s.employeeId === employeeId);
    if (employeeSchedules.length > 1) {
      conflicts.push({
        id: `double_shift_${employeeId}_${date}`,
        type: ConflictType.DOUBLE_SHIFT,
        title: '重复排班',
        description: '员工在同一天被安排了多个班次',
        severity: 'medium',
        employeeId,
        affectedDate: date,
      });
    }

    // 检查连续值班
    const consecutiveConflict = await this.checkConsecutiveShifts(employeeId, date);
    if (consecutiveConflict) {
      conflicts.push(consecutiveConflict);
    }

    return conflicts;
  }

  private async checkPositionConflicts(
    positionId: number,
    date: string,
    daySchedules: Schedule[]
  ): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];

    // 获取岗位规则
    const shiftRules = await this.shiftRuleRepository.find({
      where: { positionId, isActive: true },
      relations: ['position'],
    });

    for (const rule of shiftRules) {
      // 检查级别要求
      if (rule.levelRequirements && rule.levelRequirements.length > 0) {
        const levelConflicts = await this.checkLevelRequirements(
          rule.levelRequirements,
          positionId,
          date,
          daySchedules
        );
        conflicts.push(...levelConflicts);
      }

      // 检查其他约束
      if (rule.constraints) {
        const constraintConflicts = await this.checkConstraints(
          rule.constraints,
          positionId,
          date,
          daySchedules
        );
        conflicts.push(...constraintConflicts);
      }
    }

    return conflicts;
  }

  private async checkRuleViolations(
    date: string,
    daySchedules: Schedule[]
  ): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];

    // 这里可以添加更多规则检查逻辑
    // 例如：工作时间限制、休息时间要求等

    return conflicts;
  }

  private async checkLevelRequirements(
    levelRequirements: any[],
    positionId: number,
    date: string,
    daySchedules: Schedule[]
  ): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];

    const positionSchedules = daySchedules.filter(s => s.positionId === positionId);

    for (const requirement of levelRequirements) {
      const { level, count, required } = requirement;
      
      const actualCount = positionSchedules.filter(
        s => s.employee && s.employee.level === level
      ).length;

      if (required && actualCount < count) {
        conflicts.push({
          id: `insufficient_level_${positionId}_${level}_${date}`,
          type: ConflictType.INSUFFICIENT_LEVEL,
          title: '级别人员不足',
          description: `${level}级人员需要${count}人，实际只有${actualCount}人`,
          severity: 'high',
          affectedDate: date,
        });
      }
    }

    return conflicts;
  }

  private async checkConstraints(
    constraints: any,
    positionId: number,
    date: string,
    daySchedules: Schedule[]
  ): Promise<ConflictDetail[]> {
    const conflicts: ConflictDetail[] = [];

    // 检查各种约束条件
    // 这里可以根据具体的约束类型进行检查

    return conflicts;
  }

  private async checkConsecutiveShifts(
    employeeId: number,
    date: string
  ): Promise<ConflictDetail | null> {
    // 检查连续值班天数
    const checkDate = new Date(date);
    let consecutiveDays = 0;

    // 向前检查
    for (let i = 1; i <= 7; i++) {
      const prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - i);
      
      const hasSchedule = await this.hasEmployeeScheduleOnDate(employeeId, prevDate);
      if (hasSchedule) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    // 如果连续值班超过3天，产生冲突
    if (consecutiveDays >= 3) {
      return {
        id: `consecutive_shifts_${employeeId}_${date}`,
        type: ConflictType.CONSECUTIVE_SHIFTS,
        title: '连续值班过多',
        description: `员工已连续值班${consecutiveDays}天，建议安排休息`,
        severity: 'medium',
        employeeId,
        affectedDate: date,
      };
    }

    return null;
  }

  private async hasEmployeeScheduleOnDate(
    employeeId: number,
    date: Date
  ): Promise<boolean> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const count = await this.scheduleRepository.count({
      where: {
        employeeId,
        start: Between(startOfDay, endOfDay),
      },
    });

    return count > 0;
  }

  private async getEmployeeStatus(
    employeeId: number,
    date: string
  ): Promise<EmployeeStatus | null> {
    const checkDate = new Date(date);
    
    return await this.employeeStatusRepository.findOne({
      where: {
        employeeId,
        startDate: Between(new Date('1900-01-01'), checkDate),
        // endDate 为 null 或者大于等于 checkDate
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async generateSuggestions(
    conflicts: ConflictDetail[],
    date: string,
    positionId?: number
  ): Promise<ConflictSuggestion[]> {
    const suggestions: ConflictSuggestion[] = [];

    for (const conflict of conflicts) {
      switch (conflict.type) {
        case ConflictType.EMPLOYEE_UNAVAILABLE:
          const availableEmployees = await this.getAvailableEmployees(date, positionId);
          suggestions.push({
            type: 'replacement',
            description: '建议选择其他可用员工替班',
            availableEmployees,
          });
          break;

        case ConflictType.INSUFFICIENT_LEVEL:
          const highLevelEmployees = await this.getHighLevelEmployees(date, positionId);
          suggestions.push({
            type: 'add_personnel',
            description: '建议添加更高级别的员工',
            availableEmployees: highLevelEmployees,
          });
          break;

        case ConflictType.CONSECUTIVE_SHIFTS:
          const alternativeDates = this.getAlternativeDates(date);
          suggestions.push({
            type: 'reschedule',
            description: '建议调整到其他日期，让员工休息',
            alternativeDates,
          });
          break;
      }
    }

    return suggestions;
  }

  private async getAvailableEmployees(
    date: string,
    positionId?: number
  ): Promise<Employee[]> {
    // 获取可用员工列表
    const employees = await this.employeeRepository.find({
      where: positionId ? { positionId: positionId } : {},
      relations: ['positionInfo'],
    });

    // 过滤掉不可用的员工
    const availableEmployees: Employee[] = [];
    
    for (const employee of employees) {
      const status = await this.getEmployeeStatus(employee.id, date);
      const hasSchedule = await this.hasEmployeeScheduleOnDate(employee.id, new Date(date));
      
      if ((!status || status.status === EmployeeStatusType.AVAILABLE) && !hasSchedule) {
        availableEmployees.push(employee);
      }
    }

    return availableEmployees;
  }

  private async getHighLevelEmployees(
    date: string,
    positionId?: number
  ): Promise<Employee[]> {
    const availableEmployees = await this.getAvailableEmployees(date, positionId);
    return availableEmployees.filter(emp => emp.level <= 2); // 1-2级为高级别
  }

  private getAlternativeDates(currentDate: string): string[] {
    const dates: string[] = [];
    const baseDate = new Date(currentDate);

    // 提供前后3天的替代日期
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue; // 跳过当前日期
      
      const altDate = new Date(baseDate);
      altDate.setDate(altDate.getDate() + i);
      dates.push(altDate.toISOString().split('T')[0]);
    }

    return dates;
  }
}