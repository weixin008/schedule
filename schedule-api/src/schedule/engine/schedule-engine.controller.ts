import { Controller, Post, Get, Body, Query, Param, BadRequestException } from '@nestjs/common';
import { ScheduleEngineService, GenerateScheduleParams, ScheduleGenerationResult } from './schedule-engine.service';
import { PersonnelSelectorService } from './personnel-selector.service';
import { ConflictDetectorService } from './conflict-detector.service';
import { RotationStateManagerService } from './rotation-state-manager.service';

export class GenerateScheduleDto {
  ruleId: number;
  startDate: string;
  endDate: string;
  forceRegenerate?: boolean;
}

export class PreviewScheduleDto {
  ruleId: number;
  startDate: string;
  endDate: string;
  sampleDays?: number;
}

export class PersonnelSelectionDto {
  roleId: number;
  date: string;
  excludeEmployeeIds?: number[];
}

export class ConflictDetectionDto {
  schedules: any[];
}

@Controller('schedule-engine')
export class ScheduleEngineController {
  constructor(
    private readonly scheduleEngine: ScheduleEngineService,
    private readonly personnelSelector: PersonnelSelectorService,
    private readonly conflictDetector: ConflictDetectorService,
    private readonly rotationStateManager: RotationStateManagerService,
  ) {}

  /**
   * 生成排班
   */
  @Post('generate')
  async generateSchedule(@Body() dto: GenerateScheduleDto): Promise<ScheduleGenerationResult> {
    try {
      const params: GenerateScheduleParams = {
        ruleId: dto.ruleId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        forceRegenerate: dto.forceRegenerate || false,
      };

      return await this.scheduleEngine.generateSchedule(params);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 预览排班规则效果
   */
  @Post('preview')
  async previewScheduleRule(@Body() dto: PreviewScheduleDto) {
    try {
      return await this.scheduleEngine.previewScheduleRule(
        dto.ruleId,
        new Date(dto.startDate),
        new Date(dto.endDate),
        dto.sampleDays
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 获取角色可用人员
   */
  @Post('personnel-selection')
  async getPersonnelSelection(@Body() dto: PersonnelSelectionDto) {
    try {
      // 这里需要先获取角色信息
      // 简化实现，实际应该从数据库获取角色
      const mockRole = {
        id: dto.roleId,
        name: '值班员',
        selectionCriteria: {
          byPosition: ['值班员'],
        },
        assignmentType: 'SINGLE' as const,
        isRequired: true,
        description: '值班员角色',
        isActive: true,
        sortOrder: 0,
        personnelOrder: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return await this.personnelSelector.getDetailedPersonnelSelection(
        mockRole,
        new Date(dto.date),
        dto.excludeEmployeeIds || []
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 检测排班冲突
   */
  @Post('detect-conflicts')
  async detectConflicts(@Body() dto: ConflictDetectionDto) {
    try {
      const conflicts = await this.conflictDetector.detectConflicts(dto.schedules);
      
      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        summary: {
          total: conflicts.length,
          critical: conflicts.filter(c => c.severity === 'CRITICAL').length,
          high: conflicts.filter(c => c.severity === 'HIGH').length,
          medium: conflicts.filter(c => c.severity === 'MEDIUM').length,
          low: conflicts.filter(c => c.severity === 'LOW').length,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 解决排班冲突
   */
  @Post('resolve-conflicts')
  async resolveConflicts(@Body() dto: ConflictDetectionDto) {
    try {
      const resolvedSchedules = await this.conflictDetector.resolveConflicts(dto.schedules);
      const remainingConflicts = await this.conflictDetector.detectConflicts(resolvedSchedules);
      
      return {
        resolvedSchedules,
        remainingConflicts,
        resolutionSummary: {
          originalConflicts: dto.schedules.filter(s => s.status === 'CONFLICT').length,
          resolvedConflicts: dto.schedules.filter(s => s.status === 'CONFLICT').length - remainingConflicts.length,
          remainingConflicts: remainingConflicts.length,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 获取轮换状态统计
   */
  @Get('rotation-stats/:ruleId')
  async getRotationStats(@Param('ruleId') ruleId: number) {
    try {
      // 这里需要获取轮换状态
      // 简化实现，实际应该从缓存或数据库获取
      const mockRotationState = {
        ruleId,
        currentIndex: new Map(),
        lastAssignmentDate: new Date(),
        assignmentHistory: [],
        groupRotationIndex: new Map(),
      };

      return this.rotationStateManager.getRotationStatistics(mockRotationState);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 获取排班引擎状态
   */
  @Get('status')
  async getEngineStatus() {
    return {
      status: 'active',
      version: '1.0.0',
      features: {
        scheduleGeneration: true,
        conflictDetection: true,
        personnelSelection: true,
        rotationManagement: true,
        previewMode: true,
      },
      supportedRotationTypes: [
        'DAILY',
        'WEEKLY', 
        'MONTHLY',
        'CONTINUOUS',
        'SHIFT_BASED'
      ],
      supportedAssignmentTypes: [
        'SINGLE',
        'GROUP'
      ],
      conflictTypes: [
        'TIME_CONFLICT',
        'STATUS_CONFLICT',
        'EMPTY_ROLE',
        'WORKLOAD_VIOLATION',
        'REST_VIOLATION'
      ],
    };
  }

  /**
   * 验证排班规则
   */
  @Post('validate-rule')
  async validateScheduleRule(@Body() rule: any) {
    try {
      const validationResult = {
        isValid: true,
        errors: [] as string[],
        warnings: [] as string[],
        suggestions: [] as string[],
      };

      // 验证基本字段
      if (!rule.name || rule.name.trim() === '') {
        validationResult.errors.push('规则名称不能为空');
        validationResult.isValid = false;
      }

      if (!rule.rotationType) {
        validationResult.errors.push('必须指定轮换类型');
        validationResult.isValid = false;
      }

      // 验证时间配置
      if (!rule.timeConfig) {
        validationResult.errors.push('必须配置时间设置');
        validationResult.isValid = false;
      } else {
        if (!rule.timeConfig.shifts || rule.timeConfig.shifts.length === 0) {
          validationResult.errors.push('至少需要配置一个班次');
          validationResult.isValid = false;
        }

        if (!rule.timeConfig.workDays || rule.timeConfig.workDays.length === 0) {
          validationResult.warnings.push('未配置工作日，将使用默认设置');
        }
      }

      // 验证角色配置
      if (!rule.roleConfig) {
        validationResult.errors.push('必须配置角色设置');
        validationResult.isValid = false;
      } else {
        if (!rule.roleConfig.roles || rule.roleConfig.roles.length === 0) {
          validationResult.errors.push('至少需要配置一个角色');
          validationResult.isValid = false;
        }
      }

      // 验证轮换配置
      if (!rule.rotationConfig) {
        validationResult.warnings.push('未配置轮换设置，将使用默认设置');
      } else {
        if (!rule.rotationConfig.mode) {
          validationResult.warnings.push('未指定轮换模式，将使用顺序轮换');
        }

        if (!rule.rotationConfig.cycle || rule.rotationConfig.cycle <= 0) {
          validationResult.warnings.push('轮换周期设置不合理，建议设置为正整数');
        }
      }

      // 提供建议
      if (rule.constraints) {
        if (!rule.constraints.maxConsecutiveDays) {
          validationResult.suggestions.push('建议设置最大连续工作天数限制');
        }

        if (!rule.constraints.minRestHours) {
          validationResult.suggestions.push('建议设置最小休息时间限制');
        }
      } else {
        validationResult.suggestions.push('建议配置约束条件以确保合理的工作安排');
      }

      return validationResult;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * 获取排班建议
   */
  @Post('suggestions')
  async getScheduleSuggestions(@Body() params: {
    date: string;
    roleId: number;
    excludeEmployeeIds?: number[];
    preferredCriteria?: any;
  }) {
    try {
      // 简化实现，实际应该基于历史数据和算法生成建议
      const suggestions = {
        recommendedPersonnel: [],
        alternativeDates: [],
        workloadBalance: {
          current: 'balanced',
          recommendation: '当前工作负荷分配较为均衡',
        },
        conflictWarnings: [],
        optimizationTips: [
          '建议在工作日均匀分配值班任务',
          '考虑员工的专业技能匹配度',
          '注意避免连续多日值班安排',
        ],
      };

      return suggestions;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}