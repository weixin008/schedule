import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Position } from '../position/entities/position.entity';
import { ShiftRule, ShiftPattern, WorkDayPattern } from '../schedule-rule/entities/shift-rule.entity';
import { EmployeeStatus, EmployeeStatusType } from '../employee/entities/employee-status.entity';
import { ScheduleConflictService, ConflictResult } from './schedule-conflict.service';

export interface SchedulingRequest {
  positionId: number;
  startDate: string;
  endDate: string;
  shiftPattern?: ShiftPattern;
  workDayPattern?: WorkDayPattern;
  forceGenerate?: boolean; // 是否强制生成（忽略部分冲突）
}

export interface SchedulingResult {
  success: boolean;
  schedules: ScheduleCandidate[];
  conflicts: ConflictResult[];
  statistics: SchedulingStatistics;
  message: string;
}

export interface ScheduleCandidate {
  date: string;
  shift: string;
  employeeId: number;
  employee: Employee;
  positionId: number;
  confidence: number; // 0-1，推荐置信度
  reasons: string[]; // 推荐理由
}

export interface SchedulingStatistics {
  totalDays: number;
  scheduledDays: number;
  conflictDays: number;
  employeeWorkload: { [employeeId: number]: number };
  levelDistribution: { [level: number]: number };
}

@Injectable()
export class SmartSchedulingService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(ShiftRule)
    private shiftRuleRepository: Repository<ShiftRule>,
    @InjectRepository(EmployeeStatus)
    private employeeStatusRepository: Repository<EmployeeStatus>,
    private conflictService: ScheduleConflictService,
  ) {}

  async generateSchedule(request: SchedulingRequest): Promise<SchedulingResult> {
    try {
      // 1. 获取基础数据
      const position = await this.getPositionWithRules(request.positionId);
      const availableEmployees = await this.getAvailableEmployees(request.positionId);
      const dateRange = this.generateDateRange(request.startDate, request.endDate);
      const workDays = this.filterWorkDays(dateRange, request.workDayPattern);

      // 2. 初始化统计信息
      const statistics: SchedulingStatistics = {
        totalDays: workDays.length,
        scheduledDays: 0,
        conflictDays: 0,
        employeeWorkload: {},
        levelDistribution: {},
      };

      // 3. 生成排班候选
      const schedules: ScheduleCandidate[] = [];
      const conflicts: ConflictResult[] = [];

      for (const date of workDays) {
        const dayResult = await this.scheduleSingleDay(
          date,
          position,
          availableEmployees,
          request,
          statistics
        );

        if (dayResult.success) {
          schedules.push(...dayResult.schedules);
          statistics.scheduledDays++;
        } else {
          conflicts.push(...dayResult.conflicts);
          statistics.conflictDays++;
        }
      }

      // 4. 优化排班结果
      const optimizedSchedules = await this.optimizeSchedules(schedules, position);

      return {
        success: statistics.scheduledDays > 0,
        schedules: optimizedSchedules,
        conflicts,
        statistics,
        message: this.generateResultMessage(statistics),
      };
    } catch (error) {
      return {
        success: false,
        schedules: [],
        conflicts: [],
        statistics: {
          totalDays: 0,
          scheduledDays: 0,
          conflictDays: 0,
          employeeWorkload: {},
          levelDistribution: {},
        },
        message: `排班生成失败: ${error.message}`,
      };
    }
  }

  private async scheduleSingleDay(
    date: string,
    position: Position,
    availableEmployees: Employee[],
    request: SchedulingRequest,
    statistics: SchedulingStatistics
  ): Promise<{ success: boolean; schedules: ScheduleCandidate[]; conflicts: ConflictResult[] }> {
    const schedules: ScheduleCandidate[] = [];
    const conflicts: ConflictResult[] = [];

    // 获取该岗位的排班规则
    const shiftRules = await this.getShiftRules(position.id);
    const primaryRule = shiftRules.find(rule => rule.isActive) || shiftRules[0];

    if (!primaryRule) {
      // 没有规则，使用默认排班
      const defaultSchedule = await this.generateDefaultSchedule(
        date,
        position,
        availableEmployees,
        statistics
      );
      if (defaultSchedule) {
        schedules.push(defaultSchedule);
        return { success: true, schedules, conflicts };
      }
    } else {
      // 根据规则生成排班
      const ruleBasedSchedules = await this.generateRuleBasedSchedule(
        date,
        position,
        primaryRule,
        availableEmployees,
        statistics
      );
      schedules.push(...ruleBasedSchedules);
    }

    // 检查冲突
    for (const schedule of schedules) {
      const conflictResult = await this.conflictService.detectConflicts(
        date,
        schedule.employeeId,
        position.id
      );
      
      if (conflictResult.hasConflict) {
        conflicts.push(conflictResult);
        
        if (!request.forceGenerate) {
          // 尝试解决冲突
          const resolvedSchedule = await this.resolveConflicts(
            schedule,
            conflictResult,
            availableEmployees
          );
          if (resolvedSchedule) {
            // 替换原排班
            const index = schedules.findIndex(s => s === schedule);
            schedules[index] = resolvedSchedule;
          }
        }
      }
    }

    return {
      success: schedules.length > 0,
      schedules,
      conflicts,
    };
  }

  private async generateRuleBasedSchedule(
    date: string,
    position: Position,
    rule: ShiftRule,
    availableEmployees: Employee[],
    statistics: SchedulingStatistics
  ): Promise<ScheduleCandidate[]> {
    const schedules: ScheduleCandidate[] = [];

    // 根据级别要求分配人员
    if (rule.levelRequirements && rule.levelRequirements.length > 0) {
      for (const levelReq of rule.levelRequirements) {
        const { level, count, required } = levelReq;
        
        const levelEmployees = availableEmployees.filter(emp => emp.level === level);
        const selectedEmployees = await this.selectOptimalEmployees(
          levelEmployees,
          count,
          date,
          statistics
        );

        for (const employee of selectedEmployees) {
          const schedule = await this.createScheduleCandidate(
            date,
            employee,
            position,
            rule,
            statistics
          );
          schedules.push(schedule);
        }

        if (required && selectedEmployees.length < count) {
          // 级别人员不足，尝试用其他级别补充
          const alternativeEmployees = availableEmployees.filter(
            emp => emp.level !== level && !schedules.some(s => s.employeeId === emp.id)
          );
          
          const additionalCount = count - selectedEmployees.length;
          const alternatives = await this.selectOptimalEmployees(
            alternativeEmployees,
            additionalCount,
            date,
            statistics
          );

          for (const employee of alternatives) {
            const schedule = await this.createScheduleCandidate(
              date,
              employee,
              position,
              rule,
              statistics,
              [`替代${level}级人员`]
            );
            schedules.push(schedule);
          }
        }
      }
    } else {
      // 没有级别要求，选择最优员工
      const optimalEmployees = await this.selectOptimalEmployees(
        availableEmployees,
        1, // 默认每个岗位1人
        date,
        statistics
      );

      for (const employee of optimalEmployees) {
        const schedule = await this.createScheduleCandidate(
          date,
          employee,
          position,
          rule,
          statistics
        );
        schedules.push(schedule);
      }
    }

    return schedules;
  }

  private async selectOptimalEmployees(
    candidates: Employee[],
    count: number,
    date: string,
    statistics: SchedulingStatistics
  ): Promise<Employee[]> {
    // 计算每个员工的评分
    const scoredEmployees = await Promise.all(
      candidates.map(async (employee) => {
        const score = await this.calculateEmployeeScore(employee, date, statistics);
        return { employee, score };
      })
    );

    // 按评分排序并选择前N个
    scoredEmployees.sort((a, b) => b.score - a.score);
    return scoredEmployees.slice(0, count).map(item => item.employee);
  }

  private async calculateEmployeeScore(
    employee: Employee,
    date: string,
    statistics: SchedulingStatistics
  ): Promise<number> {
    let score = 100; // 基础分数

    // 1. 工作负荷评分（负荷越低分数越高）
    const currentWorkload = statistics.employeeWorkload[employee.id] || 0;
    const avgWorkload = Object.values(statistics.employeeWorkload).reduce((a, b) => a + b, 0) / 
                       Object.keys(statistics.employeeWorkload).length || 0;
    
    if (currentWorkload < avgWorkload) {
      score += 20; // 工作负荷低于平均值
    } else if (currentWorkload > avgWorkload * 1.5) {
      score -= 30; // 工作负荷过高
    }

    // 2. 连续工作天数评分
    const consecutiveDays = await this.getConsecutiveWorkDays(employee.id, date);
    if (consecutiveDays >= 3) {
      score -= consecutiveDays * 10; // 连续工作天数越多扣分越多
    }

    // 3. 最近休息时间评分
    const daysSinceLastWork = await this.getDaysSinceLastWork(employee.id, date);
    if (daysSinceLastWork >= 2) {
      score += daysSinceLastWork * 5; // 休息时间越长加分越多
    }

    // 4. 员工级别评分（根据岗位需求调整）
    if (employee.level <= 2) {
      score += 10; // 高级别员工加分
    }

    // 5. 员工状态评分
    const status = await this.getEmployeeStatusOnDate(employee.id, date);
    if (status && status.status !== EmployeeStatusType.AVAILABLE) {
      score = 0; // 不可用员工直接0分
    }

    return Math.max(0, score);
  }

  private async createScheduleCandidate(
    date: string,
    employee: Employee,
    position: Position,
    rule: ShiftRule,
    statistics: SchedulingStatistics,
    additionalReasons: string[] = []
  ): Promise<ScheduleCandidate> {
    // 更新统计信息
    statistics.employeeWorkload[employee.id] = (statistics.employeeWorkload[employee.id] || 0) + 1;
    statistics.levelDistribution[employee.level] = (statistics.levelDistribution[employee.level] || 0) + 1;

    // 计算置信度
    const confidence = await this.calculateScheduleConfidence(employee, date, rule);

    // 生成推荐理由
    const reasons = [
      `员工级别: ${employee.level}级`,
      `当前工作负荷: ${statistics.employeeWorkload[employee.id]}天`,
      ...additionalReasons,
    ];

    return {
      date,
      shift: this.determineShift(rule),
      employeeId: employee.id,
      employee,
      positionId: position.id,
      confidence,
      reasons,
    };
  }

  private async calculateScheduleConfidence(
    employee: Employee,
    date: string,
    rule: ShiftRule
  ): Promise<number> {
    let confidence = 0.8; // 基础置信度

    // 根据员工状态调整
    const status = await this.getEmployeeStatusOnDate(employee.id, date);
    if (status && status.status === EmployeeStatusType.AVAILABLE) {
      confidence += 0.1;
    }

    // 根据工作负荷调整
    const consecutiveDays = await this.getConsecutiveWorkDays(employee.id, date);
    if (consecutiveDays === 0) {
      confidence += 0.1; // 刚休息完
    } else if (consecutiveDays >= 3) {
      confidence -= 0.2; // 连续工作过多
    }

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  private determineShift(rule: ShiftRule): string {
    // 根据规则确定班次
    if (rule.shiftPattern === ShiftPattern.DAILY) {
      return 'all-day';
    }
    // 可以根据更复杂的逻辑确定具体班次
    return 'day';
  }

  private async optimizeSchedules(
    schedules: ScheduleCandidate[],
    position: Position
  ): Promise<ScheduleCandidate[]> {
    // 排班优化逻辑
    // 1. 平衡员工工作负荷
    // 2. 确保关键岗位有高级别员工
    // 3. 避免员工连续工作过多天

    return schedules.sort((a, b) => b.confidence - a.confidence);
  }

  // 辅助方法
  private async getPositionWithRules(positionId: number): Promise<Position> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
      relations: ['levels'],
    });
    
    if (!position) {
      throw new Error(`Position with ID ${positionId} not found`);
    }
    
    return position;
  }

  private async getAvailableEmployees(positionId: number): Promise<Employee[]> {
    return await this.employeeRepository.find({
      where: { positionId: positionId },
      relations: ['positionInfo'],
    });
  }

  private async getShiftRules(positionId: number): Promise<ShiftRule[]> {
    return await this.shiftRuleRepository.find({
      where: { positionId },
      order: { isActive: 'DESC', createdAt: 'DESC' },
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

  private filterWorkDays(dates: string[], pattern?: WorkDayPattern): string[] {
    if (!pattern || pattern === WorkDayPattern.EVERYDAY) {
      return dates;
    }

    return dates.filter(date => {
      const dayOfWeek = new Date(date).getDay(); // 0=Sunday, 1=Monday, ...
      
      switch (pattern) {
        case WorkDayPattern.WEEKDAYS:
          return dayOfWeek >= 1 && dayOfWeek <= 5;
        case WorkDayPattern.WEEKDAYS_SATURDAY:
          return dayOfWeek >= 1 && dayOfWeek <= 6;
        case WorkDayPattern.WEEKENDS:
          return dayOfWeek === 0 || dayOfWeek === 6;
        default:
          return true;
      }
    });
  }

  private async getConsecutiveWorkDays(employeeId: number, date: string): Promise<number> {
    let count = 0;
    const checkDate = new Date(date);
    
    for (let i = 1; i <= 10; i++) {
      const prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - i);
      
      const hasWork = await this.hasEmployeeWorkOnDate(employeeId, prevDate);
      if (hasWork) {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }

  private async getDaysSinceLastWork(employeeId: number, date: string): Promise<number> {
    const checkDate = new Date(date);
    
    for (let i = 1; i <= 30; i++) {
      const prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - i);
      
      const hasWork = await this.hasEmployeeWorkOnDate(employeeId, prevDate);
      if (hasWork) {
        return i - 1;
      }
    }
    
    return 30; // 超过30天没有工作记录
  }

  private async hasEmployeeWorkOnDate(employeeId: number, date: Date): Promise<boolean> {
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

  private async getEmployeeStatusOnDate(
    employeeId: number,
    date: string
  ): Promise<EmployeeStatus | null> {
    const checkDate = new Date(date);
    
    return await this.employeeStatusRepository.findOne({
      where: {
        employeeId,
        startDate: Between(new Date('1900-01-01'), checkDate),
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async generateDefaultSchedule(
    date: string,
    position: Position,
    availableEmployees: Employee[],
    statistics: SchedulingStatistics
  ): Promise<ScheduleCandidate | null> {
    if (availableEmployees.length === 0) {
      return null;
    }

    const optimalEmployees = await this.selectOptimalEmployees(
      availableEmployees,
      1,
      date,
      statistics
    );

    if (optimalEmployees.length === 0) {
      return null;
    }

    const employee = optimalEmployees[0];
    const confidence = await this.calculateEmployeeScore(employee, date, statistics) / 100;

    // 更新统计信息
    statistics.employeeWorkload[employee.id] = (statistics.employeeWorkload[employee.id] || 0) + 1;
    statistics.levelDistribution[employee.level] = (statistics.levelDistribution[employee.level] || 0) + 1;

    return {
      date,
      shift: 'day',
      employeeId: employee.id,
      employee,
      positionId: position.id,
      confidence,
      reasons: ['默认排班', `员工级别: ${employee.level}级`],
    };
  }

  private async resolveConflicts(
    schedule: ScheduleCandidate,
    conflictResult: ConflictResult,
    availableEmployees: Employee[]
  ): Promise<ScheduleCandidate | null> {
    // 尝试从建议中找到替代方案
    for (const suggestion of conflictResult.suggestions) {
      if (suggestion.type === 'replacement' && suggestion.availableEmployees) {
        const alternativeEmployee = suggestion.availableEmployees[0];
        if (alternativeEmployee) {
          return {
            ...schedule,
            employeeId: alternativeEmployee.id,
            employee: alternativeEmployee,
            confidence: schedule.confidence * 0.8, // 降低置信度
            reasons: [...schedule.reasons, '冲突解决替换'],
          };
        }
      }
    }

    return null;
  }

  private generateResultMessage(statistics: SchedulingStatistics): string {
    const successRate = (statistics.scheduledDays / statistics.totalDays) * 100;
    
    if (successRate === 100) {
      return '排班生成完成，无冲突';
    } else if (successRate >= 80) {
      return `排班生成基本完成，成功率: ${successRate.toFixed(1)}%`;
    } else if (successRate >= 50) {
      return `排班生成部分完成，成功率: ${successRate.toFixed(1)}%，建议手动调整`;
    } else {
      return `排班生成失败较多，成功率: ${successRate.toFixed(1)}%，请检查人员配置和规则设置`;
    }
  }
}