import { Injectable } from '@nestjs/common';
import { ScheduleConflictService, ConflictResult } from './schedule-conflict.service';
import { EnhancedConflictDetectionService, EnhancedConflictResult, OrganizationType } from './enhanced-conflict-detection.service';
import { GroupShiftService, GroupShiftAssignment } from '../group/group-shift.service';

export interface IntegratedConflictResult {
  basicConflicts: ConflictResult;
  enhancedConflicts: EnhancedConflictResult;
  groupConflicts: GroupConflictResult;
  overallStatus: ConflictStatus;
  recommendations: ConflictRecommendation[];
}

export interface GroupConflictResult {
  hasGroupConflicts: boolean;
  groupIntegrityIssues: GroupIntegrityIssue[];
  rotationViolations: RotationViolation[];
  workloadImbalances: WorkloadImbalance[];
}

export interface GroupIntegrityIssue {
  groupId: number;
  groupName: string;
  requiredMembers: number;
  availableMembers: number;
  missingMembers: string[];
  severity: 'critical' | 'high' | 'medium';
}

export interface RotationViolation {
  groupId: number;
  employeeId: number;
  employeeName: string;
  violationType: 'consecutive_shifts' | 'insufficient_rest' | 'rotation_order';
  description: string;
  suggestedAction: string;
}

export interface WorkloadImbalance {
  groupId: number;
  imbalanceType: 'uneven_distribution' | 'overload' | 'underutilization';
  affectedEmployees: number[];
  severity: number; // 1-10
  recommendation: string;
}

export interface ConflictStatus {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  canProceed: boolean;
  requiresApproval: boolean;
  blockers: string[];
}

export interface ConflictRecommendation {
  type: 'adjustment' | 'replacement' | 'approval_required' | 'rule_override';
  priority: number; // 1-10
  description: string;
  actions: RecommendedAction[];
}

export interface RecommendedAction {
  action: string;
  targetEmployeeId?: number;
  targetGroupId?: number;
  alternativeDate?: string;
  parameters?: any;
}

@Injectable()
export class IntegratedConflictDetectionService {
  constructor(
    private readonly basicConflictService: ScheduleConflictService,
    private readonly enhancedConflictService: EnhancedConflictDetectionService,
    private readonly groupShiftService: GroupShiftService,
  ) {}

  /**
   * 综合冲突检测主方法
   */
  async detectAllConflicts(
    date: string,
    positionId: number,
    employeeId?: number,
    groupId?: number,
    organizationType: OrganizationType = OrganizationType.GENERAL
  ): Promise<IntegratedConflictResult> {
    
    // 1. 基础冲突检测
    const basicConflicts = await this.basicConflictService.detectConflicts(
      date, employeeId, positionId
    );

    // 2. 增强冲突检测
    const enhancedConflicts = await this.enhancedConflictService.detectEnhancedConflicts(
      date, positionId, employeeId, organizationType
    );

    // 3. 编组相关冲突检测
    const groupConflicts = groupId ? 
      await this.detectGroupConflicts(groupId, date, positionId) :
      this.createEmptyGroupConflictResult();

    // 4. 综合评估
    const overallStatus = this.assessOverallStatus(basicConflicts, enhancedConflicts, groupConflicts);

    // 5. 生成建议
    const recommendations = await this.generateIntegratedRecommendations(
      basicConflicts, enhancedConflicts, groupConflicts, date, positionId, employeeId, groupId
    );

    return {
      basicConflicts,
      enhancedConflicts,
      groupConflicts,
      overallStatus,
      recommendations,
    };
  }

  /**
   * 检测编组相关冲突
   */
  private async detectGroupConflicts(
    groupId: number,
    date: string,
    positionId: number
  ): Promise<GroupConflictResult> {
    
    const groupIntegrityIssues = await this.checkGroupIntegrity(groupId, date);
    const rotationViolations = await this.checkRotationViolations(groupId, date);
    const workloadImbalances = await this.checkWorkloadBalance(groupId, date);

    return {
      hasGroupConflicts: groupIntegrityIssues.length > 0 || 
                        rotationViolations.length > 0 || 
                        workloadImbalances.length > 0,
      groupIntegrityIssues,
      rotationViolations,
      workloadImbalances,
    };
  }

  /**
   * 检查编组完整性
   */
  private async checkGroupIntegrity(groupId: number, date: string): Promise<GroupIntegrityIssue[]> {
    const issues: GroupIntegrityIssue[] = [];
    
    try {
      const availability = await this.groupShiftService.getGroupAvailability(groupId, date);
      const group = await this.groupShiftService.getGroupWithMembers(groupId);
      
      // 检查可用性是否满足最低要求
      if (availability.availabilityRate < 70) { // 70%以下认为有问题
        const missingMembers = availability.unavailableMembers.map(um => um.employee.name);
        
        issues.push({
          groupId,
          groupName: group.name,
          requiredMembers: availability.totalMembers,
          availableMembers: availability.availableMembers.length,
          missingMembers,
          severity: availability.availabilityRate < 50 ? 'critical' : 
                   availability.availabilityRate < 60 ? 'high' : 'medium',
        });
      }
    } catch (error) {
      console.error('检查编组完整性时出错:', error);
    }

    return issues;
  }

  /**
   * 检查轮换违规
   */
  private async checkRotationViolations(groupId: number, date: string): Promise<RotationViolation[]> {
    const violations: RotationViolation[] = [];
    
    try {
      const members = await this.groupShiftService.getGroupMembers(groupId);
      
      for (const member of members) {
        // 检查连续值班
        const consecutiveDays = await this.getConsecutiveShiftDays(member.id, date);
        if (consecutiveDays >= 3) {
          violations.push({
            groupId,
            employeeId: member.id,
            employeeName: member.name,
            violationType: 'consecutive_shifts',
            description: `连续值班${consecutiveDays}天，超过建议限制`,
            suggestedAction: '安排休息或调整值班计划',
          });
        }

        // 检查休息时间
        const restHours = await this.getRestHoursSinceLastShift(member.id, date);
        if (restHours < 12) {
          violations.push({
            groupId,
            employeeId: member.id,
            employeeName: member.name,
            violationType: 'insufficient_rest',
            description: `休息时间不足${restHours.toFixed(1)}小时，建议至少12小时`,
            suggestedAction: '延后值班时间或安排其他人员',
          });
        }
      }
    } catch (error) {
      console.error('检查轮换违规时出错:', error);
    }

    return violations;
  }

  /**
   * 检查工作负荷平衡
   */
  private async checkWorkloadBalance(groupId: number, date: string): Promise<WorkloadImbalance[]> {
    const imbalances: WorkloadImbalance[] = [];
    
    try {
      const members = await this.groupShiftService.getGroupMembers(groupId);
      const workloadStats = await this.calculateWorkloadStats(members, date);
      
      // 检查工作负荷分布
      const { mean, standardDeviation, overloadedEmployees, underutilizedEmployees } = workloadStats;
      
      if (standardDeviation > mean * 0.3) { // 标准差超过均值30%认为不平衡
        if (overloadedEmployees.length > 0) {
          imbalances.push({
            groupId,
            imbalanceType: 'overload',
            affectedEmployees: overloadedEmployees,
            severity: Math.min(10, Math.floor(standardDeviation / mean * 10)),
            recommendation: '减少高负荷员工的值班次数，增加其他员工的参与',
          });
        }

        if (underutilizedEmployees.length > 0) {
          imbalances.push({
            groupId,
            imbalanceType: 'underutilization',
            affectedEmployees: underutilizedEmployees,
            severity: Math.min(8, Math.floor(standardDeviation / mean * 8)),
            recommendation: '增加低负荷员工的值班机会，平衡工作分配',
          });
        }
      }
    } catch (error) {
      console.error('检查工作负荷平衡时出错:', error);
    }

    return imbalances;
  }

  /**
   * 评估整体状态
   */
  private assessOverallStatus(
    basicConflicts: ConflictResult,
    enhancedConflicts: EnhancedConflictResult,
    groupConflicts: GroupConflictResult
  ): ConflictStatus {
    
    const blockers: string[] = [];
    let level: ConflictStatus['level'] = 'none';
    let canProceed = true;
    let requiresApproval = false;

    // 检查严重冲突
    if (enhancedConflicts.criticalConflicts.length > 0) {
      level = 'critical';
      canProceed = false;
      blockers.push(...enhancedConflicts.criticalConflicts.map(c => c.title));
    }

    // 检查基础冲突
    if (basicConflicts.hasConflict) {
      const highSeverityConflicts = basicConflicts.conflicts.filter(c => c.severity === 'high');
      if (highSeverityConflicts.length > 0) {
        level = level === 'critical' ? 'critical' : 'high';
        if (level !== 'critical') {
          requiresApproval = true;
        }
        blockers.push(...highSeverityConflicts.map(c => c.title));
      } else {
        level = level === 'none' ? 'medium' : level;
        requiresApproval = true;
      }
    }

    // 检查编组冲突
    if (groupConflicts.hasGroupConflicts) {
      const criticalGroupIssues = groupConflicts.groupIntegrityIssues.filter(i => i.severity === 'critical');
      if (criticalGroupIssues.length > 0) {
        level = 'critical';
        canProceed = false;
        blockers.push(...criticalGroupIssues.map(i => `编组${i.groupName}人员严重不足`));
      } else {
        level = level === 'none' ? 'medium' : level;
        requiresApproval = true;
      }
    }

    return {
      level,
      canProceed,
      requiresApproval,
      blockers,
    };
  }

  /**
   * 生成综合建议
   */
  private async generateIntegratedRecommendations(
    basicConflicts: ConflictResult,
    enhancedConflicts: EnhancedConflictResult,
    groupConflicts: GroupConflictResult,
    date: string,
    positionId: number,
    employeeId?: number,
    groupId?: number
  ): Promise<ConflictRecommendation[]> {
    
    const recommendations: ConflictRecommendation[] = [];

    // 处理严重冲突的建议
    if (enhancedConflicts.criticalConflicts.length > 0) {
      recommendations.push({
        type: 'adjustment',
        priority: 10,
        description: '存在严重冲突，必须解决后才能继续',
        actions: enhancedConflicts.criticalConflicts.flatMap(c => 
          c.suggestedActions.map(action => ({ action }))
        ),
      });
    }

    // 处理编组相关建议
    if (groupConflicts.hasGroupConflicts) {
      if (groupConflicts.groupIntegrityIssues.length > 0) {
        recommendations.push({
          type: 'replacement',
          priority: 8,
          description: '编组人员不足，需要补充或调整',
          actions: groupConflicts.groupIntegrityIssues.map(issue => ({
            action: `为编组${issue.groupName}补充${issue.requiredMembers - issue.availableMembers}名人员`,
            targetGroupId: issue.groupId,
          })),
        });
      }

      if (groupConflicts.rotationViolations.length > 0) {
        recommendations.push({
          type: 'adjustment',
          priority: 7,
          description: '存在轮换违规，建议调整值班安排',
          actions: groupConflicts.rotationViolations.map(violation => ({
            action: violation.suggestedAction,
            targetEmployeeId: violation.employeeId,
            targetGroupId: violation.groupId,
          })),
        });
      }
    }

    // 处理基础冲突建议
    if (basicConflicts.hasConflict && basicConflicts.suggestions.length > 0) {
      recommendations.push({
        type: 'replacement',
        priority: 6,
        description: '建议的替代方案',
        actions: basicConflicts.suggestions.map(suggestion => ({
          action: suggestion.description,
          parameters: {
            availableEmployees: suggestion.availableEmployees?.map(e => e.id),
            alternativeDates: suggestion.alternativeDates,
          },
        })),
      });
    }

    // 如果需要审批
    if (enhancedConflicts.warnings.length > 0) {
      recommendations.push({
        type: 'approval_required',
        priority: 5,
        description: '存在警告项，建议获得主管审批',
        actions: [{ action: '提交审批申请，说明风险和应对措施' }],
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  // 辅助方法
  private createEmptyGroupConflictResult(): GroupConflictResult {
    return {
      hasGroupConflicts: false,
      groupIntegrityIssues: [],
      rotationViolations: [],
      workloadImbalances: [],
    };
  }

  private async getConsecutiveShiftDays(employeeId: number, date: string): Promise<number> {
    // 实现获取连续值班天数的逻辑
    // 这里是简化实现，实际应该查询数据库
    return 0;
  }

  private async getRestHoursSinceLastShift(employeeId: number, date: string): Promise<number> {
    // 实现获取休息时间的逻辑
    // 这里是简化实现，实际应该查询数据库
    return 24;
  }

  private async calculateWorkloadStats(members: any[], date: string): Promise<{
    mean: number;
    standardDeviation: number;
    overloadedEmployees: number[];
    underutilizedEmployees: number[];
  }> {
    // 实现工作负荷统计的逻辑
    // 这里是简化实现
    return {
      mean: 5,
      standardDeviation: 1,
      overloadedEmployees: [],
      underutilizedEmployees: [],
    };
  }
}