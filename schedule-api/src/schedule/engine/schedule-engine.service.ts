import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleRule } from '../../schedule-rule/entities/schedule-rule.entity';
import { PersonnelSelectorService } from './personnel-selector.service';
import { RotationStateManagerService } from './rotation-state-manager.service';
import { ConflictDetectorService } from './conflict-detector.service';

export interface GenerateScheduleParams {
  ruleId: number;
  startDate: Date;
  endDate: Date;
  forceRegenerate?: boolean;
}

export interface ScheduleGenerationResult {
  schedules: Schedule[];
  conflicts: any[];
  warnings: string[];
  statistics: {
    totalDays: number;
    scheduledDays: number;
    emptyDays: number;
    conflictDays: number;
  };
}

@Injectable()
export class ScheduleEngineService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleRule)
    private scheduleRuleRepository: Repository<ScheduleRule>,
    private readonly personnelSelector: PersonnelSelectorService,
    private readonly rotationStateManager: RotationStateManagerService,
    private readonly conflictDetector: ConflictDetectorService,
  ) {}

  /**
   * 生成排班的主要方法
   */
  async generateSchedule(params: GenerateScheduleParams): Promise<ScheduleGenerationResult> {
    const { ruleId, startDate, endDate, forceRegenerate = false } = params;
    
    // 获取排班规则
    const rule = await this.scheduleRuleRepository.findOne({ where: { id: ruleId } });
    if (!rule) {
      throw new Error(`Schedule rule with ID ${ruleId} not found`);
    }

    // 如果不是强制重新生成，检查是否已有排班
    if (!forceRegenerate) {
      const existingSchedules = await this.checkExistingSchedules(startDate, endDate);
      if (existingSchedules.length > 0) {
        throw new Error('Schedules already exist for this period. Use forceRegenerate=true to override.');
      }
    }

    const schedules: Schedule[] = [];
    const conflicts: any[] = [];
    const warnings: string[] = [];
    let currentDate = new Date(startDate);
    
    // 初始化轮换状态
    const rotationState = await this.rotationStateManager.initializeRotationState(rule);
    
    let totalDays = 0;
    let scheduledDays = 0;
    let emptyDays = 0;
    let conflictDays = 0;

    while (currentDate <= endDate) {
      totalDays++;
      
      // 检查是否跳过当前日期
      if (this.shouldSkipDate(currentDate, rule)) {
        currentDate = this.addDays(currentDate, 1);
        continue;
      }

      try {
        // 为当前日期生成排班
        const dailySchedules = await this.generateDailySchedule(
          currentDate,
          rule,
          rotationState
        );

        if (dailySchedules.length > 0) {
          schedules.push(...dailySchedules);
          scheduledDays++;
          
          // 检测冲突
          const dailyConflicts = await this.conflictDetector.detectDailyConflicts(dailySchedules);
          if (dailyConflicts.length > 0) {
            conflicts.push(...dailyConflicts);
            conflictDays++;
          }
        } else {
          emptyDays++;
          warnings.push(`No personnel available for ${currentDate.toDateString()}`);
        }

        // 更新轮换状态
        await this.rotationStateManager.updateRotationState(rotationState, rule);
        
      } catch (error) {
        warnings.push(`Error generating schedule for ${currentDate.toDateString()}: ${error.message}`);
        emptyDays++;
      }

      currentDate = this.addDays(currentDate, 1);
    }

    // 解决冲突
    const resolvedSchedules = await this.conflictDetector.resolveConflicts(schedules);

    return {
      schedules: resolvedSchedules,
      conflicts,
      warnings,
      statistics: {
        totalDays,
        scheduledDays,
        emptyDays,
        conflictDays,
      },
    };
  }

  /**
   * 生成单日排班
   */
  private async generateDailySchedule(
    date: Date,
    rule: ScheduleRule,
    rotationState: any
  ): Promise<Schedule[]> {
    const dailySchedules: Schedule[] = [];

    // 遍历每个班次
    for (const shift of rule.timeConfig.shifts) {
      // 遍历每个角色
      for (const role of rule.roleConfig.roles) {
        const assignment = await this.assignPersonnelToRole(
          date,
          shift,
          role,
          rotationState
        );

        if (assignment) {
          const schedule = new Schedule();
          schedule.date = date;
          schedule.shiftId = shift.id;
          schedule.roleId = role.id;
          schedule.assignmentType = role.assignmentType;
          
          if (assignment.type === 'PERSON') {
            schedule.assignedPersonId = assignment.person.id;
            schedule.assignedPerson = assignment.person;
          } else if (assignment.type === 'GROUP') {
            schedule.assignedGroupId = assignment.group.id;
            schedule.assignedGroup = assignment.group;
          }
          
          schedule.status = 'NORMAL';
          dailySchedules.push(schedule);
        } else if (role.isRequired) {
          // 如果角色是必需的但没有分配到人员，创建空排班记录
          const schedule = new Schedule();
          schedule.date = date;
          schedule.shiftId = shift.id;
          schedule.roleId = role.id;
          schedule.assignmentType = role.assignmentType;
          schedule.status = 'EMPTY';
          schedule.notes = 'No available personnel for required role';
          dailySchedules.push(schedule);
        }
      }
    }

    return dailySchedules;
  }

  /**
   * 为角色分配人员
   */
  private async assignPersonnelToRole(
    date: Date,
    shift: any,
    role: any,
    rotationState: any
  ): Promise<any> {
    // 获取符合条件的人员或编组
    if (role.assignmentType === 'SINGLE') {
      const availablePersonnel = await this.personnelSelector.selectPersonnelForRole(
        role,
        date,
        []
      );
      
      if (availablePersonnel.length === 0) {
        return null;
      }

      return await this.rotationStateManager.getNextPersonAssignment(
        availablePersonnel,
        rotationState,
        role.id
      );
    } else {
      const availableGroups = await this.personnelSelector.selectGroupsForRole(
        role,
        date
      );
      
      if (availableGroups.length === 0) {
        return null;
      }

      return await this.rotationStateManager.getNextGroupAssignment(
        availableGroups,
        rotationState,
        role.id
      );
    }
  }

  /**
   * 检查是否应该跳过某个日期
   */
  private shouldSkipDate(date: Date, rule: ScheduleRule): boolean {
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    // 检查工作日配置
    if (!rule.timeConfig.workDays.includes(dayOfWeek)) {
      return true;
    }

    // 检查是否跳过节假日
    if (rule.timeConfig.skipHolidays) {
      // 这里可以集成节假日API或配置
      // 暂时简化处理
      return false;
    }

    return false;
  }

  /**
   * 检查现有排班
   */
  private async checkExistingSchedules(startDate: Date, endDate: Date): Promise<Schedule[]> {
    return await this.scheduleRepository.find({
      where: {
        date: Between(startDate, endDate),
      },
    });
  }

  /**
   * 添加天数
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 预览排班规则效果
   */
  async previewScheduleRule(
    ruleId: number,
    startDate: Date,
    endDate: Date,
    sampleDays: number = 7
  ): Promise<any> {
    const rule = await this.scheduleRuleRepository.findOne({ where: { id: ruleId } });
    if (!rule) {
      throw new Error(`Schedule rule with ID ${ruleId} not found`);
    }

    // 限制预览天数
    const previewEndDate = new Date(startDate);
    previewEndDate.setDate(previewEndDate.getDate() + Math.min(sampleDays, 30));
    
    const actualEndDate = previewEndDate < endDate ? previewEndDate : endDate;

    // 生成预览数据（不保存到数据库）
    const result = await this.generateSchedule({
      ruleId,
      startDate,
      endDate: actualEndDate,
      forceRegenerate: true,
    });

    return {
      rule: {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        rotationType: rule.rotationType,
      },
      preview: {
        period: {
          startDate,
          endDate: actualEndDate,
          totalDays: result.statistics.totalDays,
        },
        schedules: result.schedules.map(schedule => ({
          date: schedule.date,
          shiftId: schedule.shiftId,
          roleId: schedule.roleId,
          assignmentType: schedule.assignmentType,
          assignedPersonId: schedule.assignedPersonId,
          assignedGroupId: schedule.assignedGroupId,
          status: schedule.status,
        })),
        statistics: result.statistics,
        conflicts: result.conflicts,
        warnings: result.warnings,
      },
    };
  }
}

function Between(startDate: Date, endDate: Date): any {
  // TypeORM Between helper - 这里简化实现
  return {
    startDate,
    endDate,
  };
}