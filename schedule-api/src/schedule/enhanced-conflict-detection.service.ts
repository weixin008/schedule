import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Position } from '../position/entities/position.entity';
import { EmployeeStatus, EmployeeStatusType } from '../employee/entities/employee-status.entity';
import { GroupShiftRule } from '../group/entities/group-shift-rule.entity';
import { GroupShiftHistory } from '../group/entities/group-shift-history.entity';

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: BusinessRuleCategory;
  severity: ConflictSeverity;
  organizationType: OrganizationType[];
  checkFunction: (context: RuleCheckContext) => Promise<RuleCheckResult>;
}

export enum BusinessRuleCategory {
  PERSONNEL_LEVEL = 'PERSONNEL_LEVEL',     // 人员级别规则
  WORKLOAD_BALANCE = 'WORKLOAD_BALANCE',   // 工作负荷平衡
  TIME_CONSTRAINTS = 'TIME_CONSTRAINTS',   // 时间约束
  GROUP_REQUIREMENTS = 'GROUP_REQUIREMENTS', // 编组要求
  SAFETY_COMPLIANCE = 'SAFETY_COMPLIANCE', // 安全合规
  OPERATIONAL_EFFICIENCY = 'OPERATIONAL_EFFICIENCY', // 运营效率
}

export enum ConflictSeverity {
  CRITICAL = 'CRITICAL',   // 严重冲突，必须解决
  HIGH = 'HIGH',          // 高优先级，强烈建议解决
  MEDIUM = 'MEDIUM',      // 中等优先级，建议解决
  LOW = 'LOW',            // 低优先级，可选解决
  INFO = 'INFO',          // 信息提示
}

export enum OrganizationType {
  HOSPITAL = 'HOSPITAL',   // 医院
  SCHOOL = 'SCHOOL',       // 学校
  RETAIL = 'RETAIL',       // 超市/零售
  FACTORY = 'FACTORY',     // 工厂
  OFFICE = 'OFFICE',       // 办公室
  SECURITY = 'SECURITY',   // 安保
  GENERAL = 'GENERAL',     // 通用
}

export interface RuleCheckContext {
  scheduleDate: string;
  positionId: number;
  position: Position;
  employeeId?: number;
  employee?: Employee;
  proposedSchedules: Schedule[];
  existingSchedules: Schedule[];
  groupRules: GroupShiftRule[];
  organizationType: OrganizationType;
}

export interface RuleCheckResult {
  passed: boolean;
  conflictId?: string;
  message: string;
  details?: string;
  suggestedActions: string[];
  affectedEmployees?: number[];
  relatedData?: any;
}

export interface EnhancedConflictResult {
  hasConflict: boolean;
  criticalConflicts: ConflictDetail[];
  warnings: ConflictDetail[];
  suggestions: ConflictDetail[];
  businessRuleViolations: BusinessRuleViolation[];
  overallRiskScore: number; // 0-100
  complianceStatus: ComplianceStatus;
}

export interface BusinessRuleViolation {
  ruleId: string;
  ruleName: string;
  category: BusinessRuleCategory;
  severity: ConflictSeverity;
  message: string;
  details: string;
  suggestedActions: string[];
  affectedEmployees: number[];
  canBeOverridden: boolean;
  overrideReason?: string;
}

export interface ConflictDetail {
  id: string;
  type: string;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedDate: string;
  affectedEmployees: number[];
  suggestedActions: string[];
  priority: number; // 1-10, 10最高
}

export interface ComplianceStatus {
  isCompliant: boolean;
  complianceScore: number; // 0-100
  violatedRules: string[];
  requiredActions: string[];
}

@Injectable()
export class EnhancedConflictDetectionService {
  private businessRules: Map<string, BusinessRule> = new Map();

  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(EmployeeStatus)
    private employeeStatusRepository: Repository<EmployeeStatus>,
    @InjectRepository(GroupShiftRule)
    private groupShiftRuleRepository: Repository<GroupShiftRule>,
    @InjectRepository(GroupShiftHistory)
    private groupShiftHistoryRepository: Repository<GroupShiftHistory>,
  ) {
    this.initializeBusinessRules();
  }

  /**
   * 增强的冲突检测主方法
   */
  async detectEnhancedConflicts(
    date: string,
    positionId: number,
    employeeId?: number,
    organizationType: OrganizationType = OrganizationType.GENERAL
  ): Promise<EnhancedConflictResult> {
    
    // 1. 准备检测上下文
    const context = await this.prepareRuleCheckContext(date, positionId, employeeId, organizationType);
    
    // 2. 执行业务规则检查
    const ruleViolations = await this.checkBusinessRules(context);
    
    // 3. 分类冲突
    const { criticalConflicts, warnings, suggestions } = this.categorizeConflicts(ruleViolations);
    
    // 4. 计算风险评分
    const riskScore = this.calculateRiskScore(ruleViolations);
    
    // 5. 评估合规状态
    const complianceStatus = this.assessCompliance(ruleViolations);

    return {
      hasConflict: ruleViolations.length > 0,
      criticalConflicts,
      warnings,
      suggestions,
      businessRuleViolations: ruleViolations,
      overallRiskScore: riskScore,
      complianceStatus,
    };
  }

  /**
   * 初始化业务规则
   */
  private initializeBusinessRules(): void {
    // 医院专用规则
    this.addBusinessRule({
      id: 'HOSPITAL_NIGHT_SHIFT_SUPERVISION',
      name: '医院夜班监督要求',
      description: '夜班必须有至少一名主任级别(1-2级)人员值班',
      category: BusinessRuleCategory.PERSONNEL_LEVEL,
      severity: ConflictSeverity.CRITICAL,
      organizationType: [OrganizationType.HOSPITAL],
      checkFunction: this.checkHospitalNightShiftSupervision.bind(this),
    });

    this.addBusinessRule({
      id: 'HOSPITAL_MINIMUM_STAFF',
      name: '医院最低人员配置',
      description: '每个科室夜班至少需要1名医生+2名护士',
      category: BusinessRuleCategory.PERSONNEL_LEVEL,
      severity: ConflictSeverity.CRITICAL,
      organizationType: [OrganizationType.HOSPITAL],
      checkFunction: this.checkHospitalMinimumStaff.bind(this),
    });

    // 学校专用规则
    this.addBusinessRule({
      id: 'SCHOOL_LEADERSHIP_PRESENCE',
      name: '学校值班领导要求',
      description: '学校值班必须有至少一名校级领导(1级)在岗',
      category: BusinessRuleCategory.PERSONNEL_LEVEL,
      severity: ConflictSeverity.CRITICAL,
      organizationType: [OrganizationType.SCHOOL],
      checkFunction: this.checkSchoolLeadershipPresence.bind(this),
    });

    this.addBusinessRule({
      id: 'SCHOOL_TEACHER_COVERAGE',
      name: '学校教师值班覆盖',
      description: '值班期间至少需要2名教师，覆盖不同学科',
      category: BusinessRuleCategory.PERSONNEL_LEVEL,
      severity: ConflictSeverity.HIGH,
      organizationType: [OrganizationType.SCHOOL],
      checkFunction: this.checkSchoolTeacherCoverage.bind(this),
    });

    // 通用工作负荷规则
    this.addBusinessRule({
      id: 'CONSECUTIVE_SHIFTS_LIMIT',
      name: '连续值班限制',
      description: '员工连续值班不得超过3天',
      category: BusinessRuleCategory.WORKLOAD_BALANCE,
      severity: ConflictSeverity.HIGH,
      organizationType: [OrganizationType.GENERAL],
      checkFunction: this.checkConsecutiveShiftsLimit.bind(this),
    });

    this.addBusinessRule({
      id: 'WEEKLY_WORKLOAD_BALANCE',
      name: '周工作负荷平衡',
      description: '员工每周值班次数应相对均衡',
      category: BusinessRuleCategory.WORKLOAD_BALANCE,
      severity: ConflictSeverity.MEDIUM,
      organizationType: [OrganizationType.GENERAL],
      checkFunction: this.checkWeeklyWorkloadBalance.bind(this),
    });

    // 编组规则
    this.addBusinessRule({
      id: 'GROUP_INTEGRITY',
      name: '编组完整性',
      description: '编组值班时应保持组员完整性',
      category: BusinessRuleCategory.GROUP_REQUIREMENTS,
      severity: ConflictSeverity.MEDIUM,
      organizationType: [OrganizationType.GENERAL],
      checkFunction: this.checkGroupIntegrity.bind(this),
    });

    // 时间约束规则
    this.addBusinessRule({
      id: 'MINIMUM_REST_PERIOD',
      name: '最小休息时间',
      description: '员工值班间隔至少需要12小时休息',
      category: BusinessRuleCategory.TIME_CONSTRAINTS,
      severity: ConflictSeverity.HIGH,
      organizationType: [OrganizationType.GENERAL],
      checkFunction: this.checkMinimumRestPeriod.bind(this),
    });

    // 安全合规规则
    this.addBusinessRule({
      id: 'EMERGENCY_RESPONSE_CAPABILITY',
      name: '应急响应能力',
      description: '值班期间必须有具备应急处理能力的人员',
      category: BusinessRuleCategory.SAFETY_COMPLIANCE,
      severity: ConflictSeverity.CRITICAL,
      organizationType: [OrganizationType.HOSPITAL, OrganizationType.SCHOOL, OrganizationType.FACTORY],
      checkFunction: this.checkEmergencyResponseCapability.bind(this),
    });
  }

  /**
   * 添加业务规则
   */
  private addBusinessRule(rule: BusinessRule): void {
    this.businessRules.set(rule.id, rule);
  }

  /**
   * 准备规则检查上下文
   */
  private async prepareRuleCheckContext(
    date: string,
    positionId: number,
    employeeId?: number,
    organizationType: OrganizationType = OrganizationType.GENERAL
  ): Promise<RuleCheckContext> {
    
    const position = await this.positionRepository.findOne({
      where: { id: positionId },
      relations: ['levels'],
    });

    if (!position) {
      throw new Error(`Position with ID ${positionId} not found`);
    }

    const employee = employeeId ? await this.employeeRepository.findOne({
      where: { id: employeeId },
      relations: ['positions'],
    }) : undefined;

    const existingSchedules = await this.getSchedulesForDate(date);
    const groupRules = await this.getGroupRulesForPosition(positionId);

    return {
      scheduleDate: date,
      positionId,
      position,
      employeeId,
      employee: employee || undefined,
      proposedSchedules: [], // 将由调用方提供
      existingSchedules,
      groupRules,
      organizationType,
    };
  }

  /**
   * 执行业务规则检查
   */
  private async checkBusinessRules(context: RuleCheckContext): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];

    for (const [ruleId, rule] of this.businessRules) {
      // 检查规则是否适用于当前组织类型
      if (!rule.organizationType.includes(context.organizationType) && 
          !rule.organizationType.includes(OrganizationType.GENERAL)) {
        continue;
      }

      try {
        const result = await rule.checkFunction(context);
        
        if (!result.passed) {
          violations.push({
            ruleId,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            message: result.message,
            details: result.details || '',
            suggestedActions: result.suggestedActions,
            affectedEmployees: result.affectedEmployees || [],
            canBeOverridden: rule.severity !== ConflictSeverity.CRITICAL,
          });
        }
      } catch (error) {
        // 业务规则检查失败，跳过此规则
      }
    }

    return violations;
  }

  // 具体的业务规则检查方法

  /**
   * 检查医院夜班监督要求
   */
  private async checkHospitalNightShiftSupervision(context: RuleCheckContext): Promise<RuleCheckResult> {
    const nightShiftSchedules = context.existingSchedules.filter(s => 
      this.isNightShift(s) && this.isSameDate(s.start, context.scheduleDate)
    );

    const supervisors = nightShiftSchedules.filter(s => 
      s.employee && s.employee.level <= 2 // 1-2级为主任级别
    );

    if (supervisors.length === 0) {
      return {
        passed: false,
        message: '夜班缺少主任级别监督人员',
        details: '医院夜班必须有至少一名主任级别(1-2级)人员值班，以确保医疗安全',
        suggestedActions: [
          '安排1-2级主任人员值夜班',
          '调整现有人员级别',
          '申请临时主任值班授权'
        ],
        affectedEmployees: nightShiftSchedules.map(s => s.employeeId),
      };
    }

    return { passed: true, message: '夜班监督要求满足', suggestedActions: [] };
  }

  /**
   * 检查医院最低人员配置
   */
  private async checkHospitalMinimumStaff(context: RuleCheckContext): Promise<RuleCheckResult> {
    const daySchedules = context.existingSchedules.filter(s => 
      this.isSameDate(s.start, context.scheduleDate)
    );

    // 按岗位分组统计 - 这里需要根据实际的Employee实体结构调整
    const positionCounts = new Map<string, number>();
    daySchedules.forEach(s => {
      if (s.employee) {
        // 假设通过其他方式获取岗位信息，比如通过级别判断
        let positionName = '未知';
        if (s.employee.level <= 2) {
          positionName = '医生';
        } else if (s.employee.level <= 4) {
          positionName = '护士';
        }
        const count = positionCounts.get(positionName) || 0;
        positionCounts.set(positionName, count + 1);
      }
    });

    const doctors = positionCounts.get('医生') || 0;
    const nurses = positionCounts.get('护士') || 0;

    if (doctors < 1 || nurses < 2) {
      return {
        passed: false,
        message: `人员配置不足: 医生${doctors}名(需要≥1), 护士${nurses}名(需要≥2)`,
        details: '医院科室值班最低要求为1名医生+2名护士，以保证基本医疗服务',
        suggestedActions: [
          doctors < 1 ? '增加医生值班人员' : '',
          nurses < 2 ? '增加护士值班人员' : '',
          '考虑调配其他科室人员支援',
          '启用备班人员'
        ].filter(Boolean),
        affectedEmployees: daySchedules.map(s => s.employeeId),
      };
    }

    return { passed: true, message: '人员配置满足要求', suggestedActions: [] };
  }

  /**
   * 检查学校值班领导要求
   */
  private async checkSchoolLeadershipPresence(context: RuleCheckContext): Promise<RuleCheckResult> {
    const daySchedules = context.existingSchedules.filter(s => 
      this.isSameDate(s.start, context.scheduleDate)
    );

    const leaders = daySchedules.filter(s => 
      s.employee && s.employee.level === 1 // 1级为校级领导
    );

    if (leaders.length === 0) {
      return {
        passed: false,
        message: '缺少校级领导值班',
        details: '学校值班期间必须有校级领导在岗，以处理重要事务和突发情况',
        suggestedActions: [
          '安排校级领导(1级)值班',
          '联系校领导确认值班安排',
          '启用领导轮值制度'
        ],
        affectedEmployees: daySchedules.map(s => s.employeeId),
      };
    }

    return { passed: true, message: '校级领导值班安排正常', suggestedActions: [] };
  }

  /**
   * 检查连续值班限制
   */
  private async checkConsecutiveShiftsLimit(context: RuleCheckContext): Promise<RuleCheckResult> {
    if (!context.employeeId) {
      return { passed: true, message: '无需检查连续值班', suggestedActions: [] };
    }

    const consecutiveDays = await this.getConsecutiveShiftDays(context.employeeId, context.scheduleDate);
    
    if (consecutiveDays >= 3) {
      return {
        passed: false,
        message: `员工已连续值班${consecutiveDays}天，超过限制`,
        details: '连续值班超过3天可能影响工作效率和身体健康',
        suggestedActions: [
          '安排员工休息',
          '寻找替班人员',
          '调整值班计划'
        ],
        affectedEmployees: [context.employeeId],
      };
    }

    return { passed: true, message: '连续值班天数正常', suggestedActions: [] };
  }

  /**
   * 检查编组完整性
   */
  private async checkGroupIntegrity(context: RuleCheckContext): Promise<RuleCheckResult> {
    const groupRules = context.groupRules.filter(rule => rule.isActive);
    
    for (const rule of groupRules) {
      if (rule.shiftType === 'FULL_GROUP' && !rule.allowPartialGroup) {
        const groupMembers = await this.getGroupMembers(rule.groupId);
        const availableMembers = await this.getAvailableGroupMembers(rule.groupId, context.scheduleDate);
        
        if (availableMembers.length < groupMembers.length) {
          return {
            passed: false,
            message: `编组${rule.groupId}成员不完整`,
            details: `编组要求全员值班，但只有${availableMembers.length}/${groupMembers.length}名成员可用`,
            suggestedActions: [
              '联系缺席成员确认状态',
              '寻找临时替代人员',
              '调整为部分编组值班'
            ],
            affectedEmployees: groupMembers.map(m => m.id),
          };
        }
      }
    }

    return { passed: true, message: '编组完整性正常', suggestedActions: [] };
  }

  /**
   * 检查最小休息时间
   */
  private async checkMinimumRestPeriod(context: RuleCheckContext): Promise<RuleCheckResult> {
    if (!context.employeeId) {
      return { passed: true, message: '无需检查休息时间', suggestedActions: [] };
    }

    const lastShift = await this.getLastShift(context.employeeId, context.scheduleDate);
    
    if (lastShift) {
      const restHours = this.calculateRestHours(lastShift.end, new Date(context.scheduleDate));
      
      if (restHours < 12) {
        return {
          passed: false,
          message: `休息时间不足: ${restHours.toFixed(1)}小时 (需要≥12小时)`,
          details: '员工需要充足的休息时间以保证工作状态',
          suggestedActions: [
            '延后值班开始时间',
            '寻找其他员工替班',
            '调整值班计划'
          ],
          affectedEmployees: [context.employeeId],
        };
      }
    }

    return { passed: true, message: '休息时间充足', suggestedActions: [] };
  }

  /**
   * 检查应急响应能力
   */
  private async checkEmergencyResponseCapability(context: RuleCheckContext): Promise<RuleCheckResult> {
    const daySchedules = context.existingSchedules.filter(s => 
      this.isSameDate(s.start, context.scheduleDate)
    );

    // 检查是否有具备应急处理能力的人员（假设1-2级人员具备此能力）
    const emergencyCapableStaff = daySchedules.filter(s => 
      s.employee && s.employee.level <= 2
    );

    if (emergencyCapableStaff.length === 0) {
      return {
        passed: false,
        message: '缺少具备应急处理能力的人员',
        details: '值班期间必须有能够处理突发情况的高级别人员在岗',
        suggestedActions: [
          '安排1-2级人员值班',
          '提供应急处理培训',
          '建立应急联系机制'
        ],
        affectedEmployees: daySchedules.map(s => s.employeeId),
      };
    }

    return { passed: true, message: '应急响应能力充足', suggestedActions: [] };
  }

  // 其他检查方法的占位符
  private async checkSchoolTeacherCoverage(context: RuleCheckContext): Promise<RuleCheckResult> {
    return { passed: true, message: '教师覆盖检查通过', suggestedActions: [] };
  }

  private async checkWeeklyWorkloadBalance(context: RuleCheckContext): Promise<RuleCheckResult> {
    return { passed: true, message: '工作负荷平衡检查通过', suggestedActions: [] };
  }

  // 辅助方法

  private categorizeConflicts(violations: BusinessRuleViolation[]): {
    criticalConflicts: ConflictDetail[];
    warnings: ConflictDetail[];
    suggestions: ConflictDetail[];
  } {
    const criticalConflicts: ConflictDetail[] = [];
    const warnings: ConflictDetail[] = [];
    const suggestions: ConflictDetail[] = [];

    violations.forEach((violation, index) => {
      const conflict: ConflictDetail = {
        id: `conflict_${violation.ruleId}_${index}`,
        type: violation.category,
        severity: violation.severity,
        title: violation.ruleName,
        description: violation.message,
        affectedDate: '', // 需要从context获取
        affectedEmployees: violation.affectedEmployees,
        suggestedActions: violation.suggestedActions,
        priority: this.getSeverityPriority(violation.severity),
      };

      switch (violation.severity) {
        case ConflictSeverity.CRITICAL:
          criticalConflicts.push(conflict);
          break;
        case ConflictSeverity.HIGH:
        case ConflictSeverity.MEDIUM:
          warnings.push(conflict);
          break;
        case ConflictSeverity.LOW:
        case ConflictSeverity.INFO:
          suggestions.push(conflict);
          break;
      }
    });

    return { criticalConflicts, warnings, suggestions };
  }

  private calculateRiskScore(violations: BusinessRuleViolation[]): number {
    let score = 0;
    
    violations.forEach(violation => {
      switch (violation.severity) {
        case ConflictSeverity.CRITICAL:
          score += 30;
          break;
        case ConflictSeverity.HIGH:
          score += 20;
          break;
        case ConflictSeverity.MEDIUM:
          score += 10;
          break;
        case ConflictSeverity.LOW:
          score += 5;
          break;
        case ConflictSeverity.INFO:
          score += 1;
          break;
      }
    });

    return Math.min(100, score);
  }

  private assessCompliance(violations: BusinessRuleViolation[]): ComplianceStatus {
    const criticalViolations = violations.filter(v => v.severity === ConflictSeverity.CRITICAL);
    const isCompliant = criticalViolations.length === 0;
    
    const totalRules = this.businessRules.size;
    const violatedRules = violations.length;
    const complianceScore = Math.max(0, ((totalRules - violatedRules) / totalRules) * 100);

    return {
      isCompliant,
      complianceScore,
      violatedRules: violations.map(v => v.ruleId),
      requiredActions: criticalViolations.flatMap(v => v.suggestedActions),
    };
  }

  private getSeverityPriority(severity: ConflictSeverity): number {
    switch (severity) {
      case ConflictSeverity.CRITICAL: return 10;
      case ConflictSeverity.HIGH: return 8;
      case ConflictSeverity.MEDIUM: return 6;
      case ConflictSeverity.LOW: return 4;
      case ConflictSeverity.INFO: return 2;
      default: return 1;
    }
  }

  // 数据获取辅助方法
  private async getSchedulesForDate(date: string): Promise<Schedule[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.scheduleRepository.find({
      where: { start: Between(startOfDay, endOfDay) },
      relations: ['employee'],
    });
  }

  private async getGroupRulesForPosition(positionId: number): Promise<GroupShiftRule[]> {
    return await this.groupShiftRuleRepository.find({
      where: { positionId, isActive: true },
    });
  }

  private async getConsecutiveShiftDays(employeeId: number, currentDate: string): Promise<number> {
    // 实现获取连续值班天数的逻辑
    return 0; // 占位符
  }

  private async getGroupMembers(groupId: number): Promise<Employee[]> {
    // 实现获取编组成员的逻辑
    return []; // 占位符
  }

  private async getAvailableGroupMembers(groupId: number, date: string): Promise<Employee[]> {
    // 实现获取可用编组成员的逻辑
    return []; // 占位符
  }

  private async getLastShift(employeeId: number, beforeDate: string): Promise<Schedule | null> {
    return await this.scheduleRepository.findOne({
      where: { employeeId },
      order: { start: 'DESC' },
    });
  }

  private isNightShift(schedule: Schedule): boolean {
    const hour = schedule.start.getHours();
    return hour >= 18 || hour < 6; // 18:00-06:00 算夜班
  }

  private isSameDate(date1: Date, date2: string): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  }

  private calculateRestHours(endTime: Date, startTime: Date): number {
    return (startTime.getTime() - endTime.getTime()) / (1000 * 60 * 60);
  }
}