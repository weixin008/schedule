import { Controller, Post, Body, Get, Query, Delete, UseGuards } from '@nestjs/common';
import { AdvancedScheduleService, AdvancedScheduleRule } from './advanced-schedule.service';
import { AuthGuard } from '../auth/guards/auth.guard';

export interface GenerateAdvancedScheduleDto {
  startDate: string;
  endDate: string;
  rules: AdvancedScheduleRule[];
  clearExisting?: boolean;
}

export interface CreatePresetRulesDto {
  leaderIds: number[];
  dutyOfficerIds: number[];
  supervisorGroupIds?: number[];
}

@UseGuards(AuthGuard)
@Controller('advanced-schedule')
export class AdvancedScheduleController {
  constructor(
    private readonly advancedScheduleService: AdvancedScheduleService
  ) {}

  /**
   * 生成高级排班
   */
  @Post('generate')
  async generateAdvancedSchedule(@Body() dto: GenerateAdvancedScheduleDto) {
    try {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);

      // 如果需要清除现有排班
      if (dto.clearExisting) {
        await this.advancedScheduleService.clearScheduleRange(startDate, endDate);
      }

      // 验证规则
      const validationResults = dto.rules.map(rule => 
        this.advancedScheduleService.validateRule(rule)
      );
      
      const invalidRules = validationResults.filter(result => !result.valid);
      if (invalidRules.length > 0) {
        return {
          success: false,
          message: '排班规则验证失败',
          errors: invalidRules.flatMap(result => result.errors)
        };
      }

      // 生成排班
      const schedules = await this.advancedScheduleService.generateAdvancedSchedule(
        startDate,
        endDate,
        dto.rules
      );

      // 保存排班
      const savedSchedules = await this.advancedScheduleService.saveSchedules(schedules);

      return {
        success: true,
        message: `成功生成 ${savedSchedules.length} 条排班记录`,
        data: {
          scheduleCount: savedSchedules.length,
          dateRange: {
            startDate: dto.startDate,
            endDate: dto.endDate
          },
          rulesApplied: dto.rules.length
        }
      };
    } catch (error) {
      console.error('生成高级排班失败:', error);
      return {
        success: false,
        message: `生成排班失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 创建预设排班规则
   */
  @Post('create-preset-rules')
  async createPresetRules(@Body() dto: CreatePresetRulesDto) {
    try {
      // 创建基础规则模板
      const baseRules = await this.advancedScheduleService.createPresetRules();
      
      // 根据用户指定的人员ID自定义规则
      const customRules: AdvancedScheduleRule[] = [];

      // 1. 带班领导规则
      if (dto.leaderIds && dto.leaderIds.length >= 3) {
        customRules.push({
          roleId: 1,
          ruleName: '带班领导',
          ruleType: 'DAILY_ROTATION',
          personnelIds: dto.leaderIds.slice(0, 3),
          workDays: [1, 2, 3, 4, 5, 6, 0], // 全周
          startTime: '08:00',
          endTime: '18:00'
        });
      }

      // 2. 值班员规则
      if (dto.dutyOfficerIds && dto.dutyOfficerIds.length >= 9) {
        customRules.push({
          roleId: 2,
          ruleName: '值班员',
          ruleType: 'CONSECUTIVE_DAYS',
          personnelIds: dto.dutyOfficerIds.slice(0, 9),
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

      // 3. 考勤监督员规则（编组值班）
      if (dto.supervisorGroupIds && dto.supervisorGroupIds.length > 0) {
        customRules.push({
          roleId: 3,
          ruleName: '考勤监督员',
          ruleType: 'GROUP_WEEKLY',
          personnelIds: [], // 编组值班不需要个人ID
          groupIds: dto.supervisorGroupIds,
          workDays: [1, 2, 3, 4, 5], // 周一至周五
          startTime: '08:00',
          endTime: '18:00',
          rotationConfig: {
            groupRotationWeeks: 1
          }
        });
      }

      return {
        success: true,
        message: '预设规则创建成功',
        data: {
          baseRules,
          customRules,
          totalRules: baseRules.length + customRules.length
        }
      };
    } catch (error) {
      console.error('创建预设规则失败:', error);
      return {
        success: false,
        message: `创建预设规则失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 获取排班规则模板
   */
  @Get('rule-templates')
  async getRuleTemplates() {
    return {
      success: true,
      data: {
        templates: [
          {
            name: '带班领导模板',
            description: '3人每日轮换，全周值班',
            ruleType: 'DAILY_ROTATION',
            requiredPersonnel: 3,
            workDays: [1, 2, 3, 4, 5, 6, 0],
            timeRange: '08:00-18:00'
          },
          {
            name: '值班员模板',
            description: '9人轮换，周一至周四每日换，周五至周日连续值班',
            ruleType: 'CONSECUTIVE_DAYS',
            requiredPersonnel: 9,
            workDays: [1, 2, 3, 4, 5, 6, 0],
            timeRange: '18:00-08:00'
          },
          {
            name: '考勤监督员模板',
            description: '编组值班，每周轮换一组',
            ruleType: 'GROUP_WEEKLY',
            requiredGroups: 2,
            workDays: [1, 2, 3, 4, 5],
            timeRange: '08:00-18:00'
          }
        ]
      }
    };
  }

  /**
   * 验证排班规则
   */
  @Post('validate-rules')
  async validateRules(@Body() rules: AdvancedScheduleRule[]) {
    try {
      const validationResults = rules.map((rule, index) => ({
        ruleIndex: index,
        ruleName: rule.ruleName,
        ...this.advancedScheduleService.validateRule(rule)
      }));

      const hasErrors = validationResults.some(result => !result.valid);

      return {
        success: !hasErrors,
        message: hasErrors ? '部分规则验证失败' : '所有规则验证通过',
        data: {
          validationResults,
          totalRules: rules.length,
          validRules: validationResults.filter(r => r.valid).length,
          invalidRules: validationResults.filter(r => !r.valid).length
        }
      };
    } catch (error) {
      console.error('验证排班规则失败:', error);
      return {
        success: false,
        message: `验证失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 从角色配置生成排班
   */
  @Post('generate-from-roles')
  async generateFromRoles(@Body() dto: {
    startDate: string;
    endDate: string;
    roleIds: number[];
    clearExisting?: boolean;
  }) {
    try {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);

      // 生成排班
      const schedules = await this.advancedScheduleService.generateScheduleFromRoles(
        startDate,
        endDate,
        dto.roleIds,
        dto.clearExisting || false
      );

      // 保存排班
      const savedSchedules = await this.advancedScheduleService.saveSchedules(schedules);

      return {
        success: true,
        message: `成功生成 ${savedSchedules.length} 条排班记录`,
        data: {
          scheduleCount: savedSchedules.length,
          dateRange: {
            startDate: dto.startDate,
            endDate: dto.endDate
          },
          rolesApplied: dto.roleIds.length
        }
      };
    } catch (error) {
      console.error('从角色配置生成排班失败:', error);
      return {
        success: false,
        message: `生成排班失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 清除指定日期范围的排班
   */
  @Delete('clear-range')
  async clearScheduleRange(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    try {
      await this.advancedScheduleService.clearScheduleRange(
        new Date(startDate),
        new Date(endDate)
      );

      return {
        success: true,
        message: `已清除 ${startDate} 至 ${endDate} 的排班记录`
      };
    } catch (error) {
      console.error('清除排班记录失败:', error);
      return {
        success: false,
        message: `清除失败: ${error.message}`,
        error: error.message
      };
    }
  }
}