import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { IntegratedConflictDetectionService } from './integrated-conflict-detection.service';
import { OrganizationType } from './enhanced-conflict-detection.service';
import { SmartSchedulingService } from './smart-scheduling.service';

@UseGuards(AuthGuard)
@Controller('enhanced-schedule')
export class EnhancedScheduleController {
  constructor(
    private readonly integratedConflictService: IntegratedConflictDetectionService,
    private readonly smartSchedulingService: SmartSchedulingService,
  ) {}

  /**
   * 综合冲突检测接口
   */
  @Post('conflict-detection')
  async detectConflicts(@Body() body: {
    date: string;
    positionId: number;
    employeeId?: number;
    groupId?: number;
    organizationType?: OrganizationType;
  }) {
    return this.integratedConflictService.detectAllConflicts(
      body.date,
      body.positionId,
      body.employeeId,
      body.groupId,
      body.organizationType || OrganizationType.GENERAL
    );
  }

  /**
   * 智能排班建议
   */
  @Post('smart-suggestions')
  async getSmartSuggestions(@Body() body: {
    startDate: string;
    endDate: string;
    positionId: number;
    groupId?: number;
    constraints?: any;
  }) {
    return this.smartSchedulingService.generateSchedule({
      startDate: body.startDate,
      endDate: body.endDate,
      positionId: body.positionId,
      forceGenerate: body.constraints?.forceGenerate || false,
    });
  }

  /**
   * 批量冲突检测
   */
  @Post('batch-conflict-detection')
  async batchDetectConflicts(@Body() body: {
    schedules: Array<{
      date: string;
      positionId: number;
      employeeId: number;
      groupId?: number;
    }>;
    organizationType?: OrganizationType;
  }) {
    const results: Array<{
      schedule: any;
      conflicts: any;
    }> = [];
    
    for (const schedule of body.schedules) {
      const result = await this.integratedConflictService.detectAllConflicts(
        schedule.date,
        schedule.positionId,
        schedule.employeeId,
        schedule.groupId,
        body.organizationType || OrganizationType.GENERAL
      );
      
      results.push({
        schedule,
        conflicts: result,
      });
    }

    return {
      totalSchedules: body.schedules.length,
      conflictCount: results.filter(r => r.conflicts.overallStatus.level !== 'none').length,
      criticalCount: results.filter(r => r.conflicts.overallStatus.level === 'critical').length,
      results,
    };
  }

  /**
   * 获取组织类型配置
   */
  @Get('organization-types')
  getOrganizationTypes() {
    return Object.values(OrganizationType).map(type => ({
      value: type,
      label: this.getOrganizationTypeLabel(type),
    }));
  }

  /**
   * 冲突统计分析
   */
  @Get('conflict-statistics')
  async getConflictStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('positionId') positionId?: string,
    @Query('groupId') groupId?: string,
  ) {
    // 这里可以实现冲突统计分析逻辑
    return {
      period: { startDate, endDate },
      totalConflicts: 0,
      conflictsByType: {},
      conflictsByDay: {},
      resolutionRate: 0,
      averageResolutionTime: 0,
    };
  }

  private getOrganizationTypeLabel(type: OrganizationType): string {
    const labels = {
      [OrganizationType.HOSPITAL]: '医院',
      [OrganizationType.SCHOOL]: '学校',
      [OrganizationType.RETAIL]: '零售/超市',
      [OrganizationType.FACTORY]: '工厂',
      [OrganizationType.OFFICE]: '办公室',
      [OrganizationType.SECURITY]: '安保',
      [OrganizationType.GENERAL]: '通用',
    };
    return labels[type] || type;
  }
}