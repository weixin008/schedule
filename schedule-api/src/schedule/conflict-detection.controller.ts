import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { ScheduleConflictService } from './schedule-conflict.service';
import { EnhancedConflictDetectionService, OrganizationType } from './enhanced-conflict-detection.service';
import { IntegratedConflictDetectionService } from './integrated-conflict-detection.service';

@UseGuards(AuthGuard)
@Controller('conflict-detection')
export class ConflictDetectionController {
  constructor(
    private readonly basicConflictService: ScheduleConflictService,
    private readonly enhancedConflictService: EnhancedConflictDetectionService,
    private readonly integratedConflictService: IntegratedConflictDetectionService,
  ) {}

  /**
   * 基础冲突检测
   */
  @Post('basic')
  async detectBasicConflicts(@Body() body: {
    date: string;
    employeeId?: number;
    positionId?: number;
    scheduleId?: number;
  }) {
    return this.basicConflictService.detectConflicts(
      body.date,
      body.employeeId,
      body.positionId,
      body.scheduleId
    );
  }

  /**
   * 增强冲突检测
   */
  @Post('enhanced')
  async detectEnhancedConflicts(@Body() body: {
    date: string;
    positionId: number;
    employeeId?: number;
    organizationType?: OrganizationType;
  }) {
    return this.enhancedConflictService.detectEnhancedConflicts(
      body.date,
      body.positionId,
      body.employeeId,
      body.organizationType || OrganizationType.GENERAL
    );
  }

  /**
   * 综合冲突检测
   */
  @Post('integrated')
  async detectIntegratedConflicts(@Body() body: {
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
   * 获取支持的组织类型
   */
  @Get('organization-types')
  getOrganizationTypes() {
    return Object.values(OrganizationType).map(type => ({
      value: type,
      label: this.getOrganizationTypeLabel(type),
      description: this.getOrganizationTypeDescription(type),
    }));
  }

  /**
   * 冲突检测配置
   */
  @Get('configuration')
  getConflictDetectionConfiguration() {
    return {
      basicRules: [
        'employee_unavailable',
        'insufficient_level',
        'double_shift',
        'consecutive_shifts',
        'insufficient_rest',
        'rule_violation',
        'missing_required_position',
      ],
      enhancedRules: [
        'HOSPITAL_NIGHT_SHIFT_SUPERVISION',
        'HOSPITAL_MINIMUM_STAFF',
        'SCHOOL_LEADERSHIP_PRESENCE',
        'SCHOOL_TEACHER_COVERAGE',
        'CONSECUTIVE_SHIFTS_LIMIT',
        'WEEKLY_WORKLOAD_BALANCE',
        'GROUP_INTEGRITY',
        'MINIMUM_REST_PERIOD',
        'EMERGENCY_RESPONSE_CAPABILITY',
      ],
      severityLevels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      organizationTypes: Object.values(OrganizationType),
    };
  }

  /**
   * 批量冲突检测
   */
  @Post('batch')
  async batchDetectConflicts(@Body() body: {
    detections: Array<{
      date: string;
      positionId: number;
      employeeId?: number;
      groupId?: number;
    }>;
    organizationType?: OrganizationType;
    detectionLevel?: 'basic' | 'enhanced' | 'integrated';
  }) {
    const results: Array<{
      detection: any;
      success: boolean;
      result?: any;
      error?: string;
    }> = [];
    const detectionLevel = body.detectionLevel || 'integrated';
    
    for (const detection of body.detections) {
      try {
        let result;
        
        switch (detectionLevel) {
          case 'basic':
            result = await this.basicConflictService.detectConflicts(
              detection.date,
              detection.employeeId,
              detection.positionId
            );
            break;
          case 'enhanced':
            result = await this.enhancedConflictService.detectEnhancedConflicts(
              detection.date,
              detection.positionId,
              detection.employeeId,
              body.organizationType || OrganizationType.GENERAL
            );
            break;
          case 'integrated':
          default:
            result = await this.integratedConflictService.detectAllConflicts(
              detection.date,
              detection.positionId,
              detection.employeeId,
              detection.groupId,
              body.organizationType || OrganizationType.GENERAL
            );
            break;
        }
        
        results.push({
          detection,
          success: true,
          result,
        });
      } catch (error: any) {
        results.push({
          detection,
          success: false,
          error: error.message,
        });
      }
    }

    const conflictCount = results.filter(r => 
      r.success && (
        (r.result.hasConflict) || 
        (r.result.overallStatus && r.result.overallStatus.level !== 'none')
      )
    ).length;

    return {
      totalDetections: body.detections.length,
      successCount: results.filter(r => r.success).length,
      conflictCount,
      results,
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

  private getOrganizationTypeDescription(type: OrganizationType): string {
    const descriptions = {
      [OrganizationType.HOSPITAL]: '医院环境，注重医疗安全和专业人员配置',
      [OrganizationType.SCHOOL]: '学校环境，注重教育连续性和管理层覆盖',
      [OrganizationType.RETAIL]: '零售环境，注重客户服务和营业时间覆盖',
      [OrganizationType.FACTORY]: '工厂环境，注重生产安全和技能匹配',
      [OrganizationType.OFFICE]: '办公环境，注重工作效率和团队协作',
      [OrganizationType.SECURITY]: '安保环境，注重安全覆盖和应急响应',
      [OrganizationType.GENERAL]: '通用环境，应用基础规则',
    };
    return descriptions[type] || '标准工作环境';
  }
}