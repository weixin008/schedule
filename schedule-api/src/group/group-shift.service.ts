import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Group } from './entities/group.entity';
import { EmployeeGroup } from './entities/employee-group.entity';
import { GroupShiftRule, GroupRotationPattern, GroupShiftType } from './entities/group-shift-rule.entity';
import { GroupShiftHistory } from './entities/group-shift-history.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Schedule } from '../schedule/entities/schedule.entity';

export interface GroupShiftAssignment {
  groupId: number;
  group: Group;
  shiftDate: string;
  shiftName: string;
  assignedMembers: Employee[];
  backupMembers: Employee[];
  ruleApplied: GroupShiftRule;
  confidence: number; // 分配置信度 0-1
  warnings: string[]; // 警告信息
}

export interface GroupShiftRequest {
  groupId: number;
  positionId: number;
  startDate: string;
  endDate: string;
  shiftType?: string;
  forceAssignment?: boolean;
}

@Injectable()
export class GroupShiftService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(EmployeeGroup)
    private employeeGroupRepository: Repository<EmployeeGroup>,
    @InjectRepository(GroupShiftRule)
    private groupShiftRuleRepository: Repository<GroupShiftRule>,
    @InjectRepository(GroupShiftHistory)
    private groupShiftHistoryRepository: Repository<GroupShiftHistory>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
  ) {}

  /**
   * 为编组生成值班安排
   */
  async generateGroupShifts(request: GroupShiftRequest): Promise<GroupShiftAssignment[]> {
    // 1. 获取编组信息和规则
    const group = await this.getGroupWithMembers(request.groupId);
    const rules = await this.getActiveGroupRules(request.groupId, request.positionId);
    
    if (rules.length === 0) {
      throw new NotFoundException(`未找到编组 ${request.groupId} 的有效排班规则`);
    }

    // 2. 生成日期范围
    const dateRange = this.generateDateRange(request.startDate, request.endDate);
    const assignments: GroupShiftAssignment[] = [];

    // 3. 应用主要规则
    const primaryRule = rules[0];
    
    for (const date of dateRange) {
      // 检查是否为工作日
      if (!this.isWorkDay(date, primaryRule.workDays)) {
        continue;
      }

      // 生成当日编组值班安排
      const dayAssignment = await this.generateDayGroupShift(
        group,
        primaryRule,
        date,
        request.forceAssignment
      );

      if (dayAssignment) {
        assignments.push(dayAssignment);
      }
    }

    return assignments;
  }

  /**
   * 生成单日编组值班安排
   */
  private async generateDayGroupShift(
    group: Group,
    rule: GroupShiftRule,
    date: string,
    forceAssignment: boolean = false
  ): Promise<GroupShiftAssignment | null> {
    const warnings: string[] = [];
    
    // 1. 获取可用组员
    const availableMembers = await this.getAvailableGroupMembers(group.id, date);
    
    if (availableMembers.length === 0) {
      if (!forceAssignment) {
        return null;
      }
      warnings.push('当日无可用组员，强制分配模式');
    }

    // 2. 根据规则类型分配组员
    let assignedMembers: Employee[] = [];
    let backupMembers: Employee[] = [];

    switch (rule.shiftType) {
      case GroupShiftType.FULL_GROUP:
        assignedMembers = await this.assignFullGroup(group, availableMembers, rule);
        break;
      
      case GroupShiftType.PARTIAL_GROUP:
        assignedMembers = await this.assignPartialGroup(availableMembers, rule);
        break;
      
      case GroupShiftType.ROTATING_MEMBERS:
        const rotationResult = await this.assignRotatingMembers(group, availableMembers, rule, date);
        assignedMembers = rotationResult.assigned;
        backupMembers = rotationResult.backup;
        break;
    }

    // 3. 验证分配结果
    const validation = this.validateGroupAssignment(assignedMembers, rule);
    if (!validation.isValid && !forceAssignment) {
      warnings.push(...validation.warnings);
      if (validation.isCritical) {
        return null;
      }
    }

    // 4. 计算置信度
    const confidence = this.calculateAssignmentConfidence(assignedMembers, rule, availableMembers.length);

    return {
      groupId: group.id,
      group,
      shiftDate: date,
      shiftName: this.determineShiftName(rule),
      assignedMembers,
      backupMembers,
      ruleApplied: rule,
      confidence,
      warnings,
    };
  }

  /**
   * 整组值班分配
   */
  private async assignFullGroup(
    group: Group,
    availableMembers: Employee[],
    rule: GroupShiftRule
  ): Promise<Employee[]> {
    // 整组值班要求所有组员都参与
    const allMembers = await this.getAllGroupMembers(group.id);
    
    if (rule.allowPartialGroup && availableMembers.length < allMembers.length) {
      // 允许部分组员值班
      return availableMembers.slice(0, Math.max(rule.minMemberCount, rule.requiredMemberCount));
    }
    
    return availableMembers.length >= allMembers.length ? allMembers : [];
  }

  /**
   * 部分组员值班分配
   */
  private async assignPartialGroup(
    availableMembers: Employee[],
    rule: GroupShiftRule
  ): Promise<Employee[]> {
    // 按优先级和工作负荷选择组员
    const scoredMembers = await Promise.all(
      availableMembers.map(async (member) => {
        const score = await this.calculateMemberScore(member, rule);
        return { member, score };
      })
    );

    // 按评分排序
    scoredMembers.sort((a, b) => b.score - a.score);
    
    // 选择所需数量的组员
    const selectedCount = Math.min(rule.requiredMemberCount, scoredMembers.length);
    return scoredMembers.slice(0, selectedCount).map(item => item.member);
  }

  /**
   * 轮换组员值班分配
   */
  private async assignRotatingMembers(
    group: Group,
    availableMembers: Employee[],
    rule: GroupShiftRule,
    date: string
  ): Promise<{ assigned: Employee[]; backup: Employee[] }> {
    // 获取轮换历史
    const rotationHistory = await this.getGroupRotationHistory(group.id, rule.id);
    
    // 计算当前轮换位置
    const rotationIndex = this.calculateRotationIndex(date, rule, rotationHistory);
    
    // 获取所有组员并排序
    const allMembers = await this.getAllGroupMembers(group.id);
    const sortedMembers = this.sortMembersByRotation(allMembers, rotationHistory, rule.strictRotation);
    
    // 选择当前轮换的组员
    const assigned: Employee[] = [];
    const backup: Employee[] = [];
    
    for (let i = 0; i < rule.requiredMemberCount && i < sortedMembers.length; i++) {
      const memberIndex = (rotationIndex + i) % sortedMembers.length;
      const member = sortedMembers[memberIndex];
      
      if (availableMembers.includes(member)) {
        assigned.push(member);
      } else {
        // 寻找替代组员
        const replacement = this.findReplacementMember(availableMembers, member, rule);
        if (replacement) {
          assigned.push(replacement);
          backup.push(member); // 原组员作为备选
        }
      }
    }

    return { assigned, backup };
  }

  /**
   * 计算组员评分
   */
  private async calculateMemberScore(member: Employee, rule: GroupShiftRule): Promise<number> {
    let score = 100; // 基础分数

    // 1. 级别评分
    if (rule.constraints?.priorityLevels) {
      const levelIndex = rule.constraints.priorityLevels.indexOf(member.level);
      if (levelIndex >= 0) {
        score += (rule.constraints.priorityLevels.length - levelIndex) * 10;
      }
    }

    // 2. 工作负荷评分
    const recentShifts = await this.getRecentShiftCount(member.id, 30); // 最近30天
    score -= recentShifts * 5; // 值班次数越多扣分越多

    // 3. 连续值班评分
    const consecutiveShifts = await this.getConsecutiveShiftCount(member.id);
    if (consecutiveShifts >= (rule.constraints?.maxConsecutiveShifts || 3)) {
      score -= 50; // 连续值班过多大幅扣分
    }

    // 4. 休息时间评分
    const daysSinceLastShift = await this.getDaysSinceLastShift(member.id);
    const minRestDays = rule.constraints?.minRestDaysBetweenShifts || 1;
    if (daysSinceLastShift < minRestDays) {
      score -= 30; // 休息时间不足扣分
    } else {
      score += Math.min(daysSinceLastShift * 2, 20); // 休息时间充足加分
    }

    return Math.max(0, score);
  }

  /**
   * 验证编组分配
   */
  private validateGroupAssignment(
    assignedMembers: Employee[],
    rule: GroupShiftRule
  ): { isValid: boolean; isCritical: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;
    let isCritical = false;

    // 检查人数要求
    if (assignedMembers.length < rule.minMemberCount) {
      warnings.push(`分配人数(${assignedMembers.length})少于最低要求(${rule.minMemberCount})`);
      isValid = false;
      isCritical = true;
    } else if (assignedMembers.length < rule.requiredMemberCount) {
      warnings.push(`分配人数(${assignedMembers.length})少于建议人数(${rule.requiredMemberCount})`);
      isValid = false;
    }

    // 检查级别分布
    if (rule.constraints?.priorityLevels) {
      const levelCounts = new Map<number, number>();
      assignedMembers.forEach(member => {
        levelCounts.set(member.level, (levelCounts.get(member.level) || 0) + 1);
      });

      const highestPriorityLevel = Math.min(...rule.constraints.priorityLevels);
      if (!levelCounts.has(highestPriorityLevel)) {
        warnings.push(`缺少${highestPriorityLevel}级人员`);
        isValid = false;
      }
    }

    return { isValid, isCritical, warnings };
  }

  /**
   * 计算分配置信度
   */
  private calculateAssignmentConfidence(
    assignedMembers: Employee[],
    rule: GroupShiftRule,
    totalAvailableCount: number
  ): number {
    let confidence = 0.8; // 基础置信度

    // 人数充足度
    const memberRatio = assignedMembers.length / rule.requiredMemberCount;
    confidence += Math.min(memberRatio - 1, 0.2); // 人数充足加分，最多+0.2

    // 可选择性
    const choiceRatio = totalAvailableCount / rule.requiredMemberCount;
    if (choiceRatio > 2) {
      confidence += 0.1; // 有充足选择余地
    } else if (choiceRatio < 1.2) {
      confidence -= 0.2; // 选择余地不足
    }

    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * 保存编组值班历史
   */
  async saveGroupShiftHistory(assignment: GroupShiftAssignment): Promise<GroupShiftHistory> {
    const history = this.groupShiftHistoryRepository.create({
      groupId: assignment.groupId,
      shiftDate: new Date(assignment.shiftDate),
      shiftName: assignment.shiftName,
      participantEmployeeIds: assignment.assignedMembers.map(m => m.id),
      ruleId: assignment.ruleApplied.id,
      status: 'SCHEDULED',
      notes: assignment.warnings.length > 0 ? assignment.warnings.join('; ') : undefined,
    });

    return await this.groupShiftHistoryRepository.save(history);
  }

  /**
   * 获取编组值班历史
   */
  async getGroupShiftHistory(
    groupId: number,
    startDate?: string,
    endDate?: string,
    limit: number = 50
  ): Promise<GroupShiftHistory[]> {
    const queryBuilder = this.groupShiftHistoryRepository
      .createQueryBuilder('history')
      .where('history.groupId = :groupId', { groupId })
      .leftJoinAndSelect('history.group', 'group')
      .orderBy('history.shiftDate', 'DESC')
      .take(limit);

    if (startDate) {
      queryBuilder.andWhere('history.shiftDate >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('history.shiftDate <= :endDate', { endDate: new Date(endDate) });
    }

    return await queryBuilder.getMany();
  }

  /**
   * 获取编组成员信息
   */
  async getGroupMembers(groupId: number): Promise<Employee[]> {
    return await this.getAllGroupMembers(groupId);
  }

  /**
   * 获取编组可用性信息
   */
  async getGroupAvailability(groupId: number, date: string): Promise<{
    totalMembers: number;
    availableMembers: Employee[];
    unavailableMembers: { employee: Employee; reason: string }[];
    availabilityRate: number;
  }> {
    const allMembers = await this.getAllGroupMembers(groupId);
    const availableMembers = await this.getAvailableGroupMembers(groupId, date);
    
    const unavailableMembers = allMembers
      .filter(member => !availableMembers.find(am => am.id === member.id))
      .map(member => ({
        employee: member,
        reason: '已有排班或状态不可用' // 这里可以进一步细化原因
      }));

    const availabilityRate = allMembers.length > 0 ? 
      (availableMembers.length / allMembers.length) * 100 : 0;

    return {
      totalMembers: allMembers.length,
      availableMembers,
      unavailableMembers,
      availabilityRate: Math.round(availabilityRate * 100) / 100,
    };
  }

  /**
   * 获取编组轮换历史
   */
  private async getGroupRotationHistory(groupId: number, ruleId: number): Promise<GroupShiftHistory[]> {
    return await this.groupShiftHistoryRepository.find({
      where: { groupId, ruleId },
      order: { shiftDate: 'DESC' },
      take: 50, // 最近50次记录
    });
  }

  // 辅助方法
  async getGroupWithMembers(groupId: number): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['employeeGroups', 'employeeGroups.employee'],
    });

    if (!group) {
      throw new NotFoundException(`编组 ${groupId} 不存在`);
    }

    return group;
  }

  private async getActiveGroupRules(groupId: number, positionId: number): Promise<GroupShiftRule[]> {
    return await this.groupShiftRuleRepository.find({
      where: { groupId, positionId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async getAllGroupMembers(groupId: number): Promise<Employee[]> {
    const employeeGroups = await this.employeeGroupRepository.find({
      where: { group: { id: groupId } },
      relations: ['employee'],
    });

    return employeeGroups.map(eg => eg.employee);
  }

  private async getAvailableGroupMembers(groupId: number, date: string): Promise<Employee[]> {
    const allMembers = await this.getAllGroupMembers(groupId);
    const availableMembers: Employee[] = [];

    for (const member of allMembers) {
      // 检查员工状态和已有排班
      const isAvailable = await this.isEmployeeAvailable(member.id, date);
      if (isAvailable) {
        availableMembers.push(member);
      }
    }

    return availableMembers;
  }

  private async isEmployeeAvailable(employeeId: number, date: string): Promise<boolean> {
    const checkDate = new Date(date);
    const startOfDay = new Date(checkDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(checkDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 检查是否已有排班
    const existingSchedule = await this.scheduleRepository.findOne({
      where: {
        employeeId,
        start: Between(startOfDay, endOfDay),
      },
    });

    return !existingSchedule;
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

  private isWorkDay(date: string, workDays?: number[]): boolean {
    if (!workDays || workDays.length === 0) {
      return true; // 默认每天都是工作日
    }

    const dayOfWeek = new Date(date).getDay(); // 0=Sunday, 1=Monday, ...
    return workDays.includes(dayOfWeek);
  }

  private calculateRotationIndex(date: string, rule: GroupShiftRule, history: GroupShiftHistory[]): number {
    // 根据轮换模式计算当前应该轮换到哪个位置
    const baseDate = rule.effectiveStartDate || new Date('2024-01-01');
    const currentDate = new Date(date);
    const daysDiff = Math.floor((currentDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

    switch (rule.rotationPattern) {
      case GroupRotationPattern.WEEKLY:
        return Math.floor(daysDiff / 7) % (history.length || 1);
      case GroupRotationPattern.BIWEEKLY:
        return Math.floor(daysDiff / 14) % (history.length || 1);
      case GroupRotationPattern.MONTHLY:
        return Math.floor(daysDiff / 30) % (history.length || 1);
      case GroupRotationPattern.CUSTOM_DAYS:
        return Math.floor(daysDiff / rule.rotationDays) % (history.length || 1);
      default:
        return 0;
    }
  }

  private sortMembersByRotation(
    members: Employee[],
    history: GroupShiftHistory[],
    strictRotation: boolean
  ): Employee[] {
    if (!strictRotation || history.length === 0) {
      // 非严格轮换，按级别和ID排序
      return members.sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level; // 级别低的优先
        }
        return a.id - b.id; // 同级别按ID排序
      });
    }

    // 严格轮换，根据历史记录排序
    const lastShift = history[0];
    if (!lastShift) {
      return members;
    }

    // 找到上次值班的最后一个人，从下一个人开始
    const lastParticipants = lastShift.participantEmployeeIds;
    const lastMemberId = lastParticipants[lastParticipants.length - 1];
    const lastMemberIndex = members.findIndex(m => m.id === lastMemberId);

    if (lastMemberIndex >= 0) {
      // 重新排列，从下一个人开始
      return [
        ...members.slice(lastMemberIndex + 1),
        ...members.slice(0, lastMemberIndex + 1)
      ];
    }

    return members;
  }

  private findReplacementMember(
    availableMembers: Employee[],
    originalMember: Employee,
    rule: GroupShiftRule
  ): Employee | null {
    // 寻找最相似的替代组员
    const candidates = availableMembers.filter(m => m.id !== originalMember.id);
    
    if (candidates.length === 0) {
      return null;
    }

    // 优先选择同级别的
    const sameLevelCandidates = candidates.filter(m => m.level === originalMember.level);
    if (sameLevelCandidates.length > 0) {
      return sameLevelCandidates[0];
    }

    // 其次选择相近级别的
    candidates.sort((a, b) => {
      const aDiff = Math.abs(a.level - originalMember.level);
      const bDiff = Math.abs(b.level - originalMember.level);
      return aDiff - bDiff;
    });

    return candidates[0];
  }

  private determineShiftName(rule: GroupShiftRule): string {
    if (rule.timeSlots && rule.timeSlots.length > 0) {
      return rule.timeSlots[0].name;
    }
    return '值班';
  }

  // 统计方法
  private async getRecentShiftCount(employeeId: number, days: number): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.scheduleRepository.count({
      where: {
        employeeId,
        start: Between(startDate, new Date()),
      },
    });
  }

  private async getConsecutiveShiftCount(employeeId: number): Promise<number> {
    // 计算连续值班天数的逻辑
    // 这里简化实现，实际应该检查连续的日期
    return 0;
  }

  private async getDaysSinceLastShift(employeeId: number): Promise<number> {
    const lastSchedule = await this.scheduleRepository.findOne({
      where: { employeeId },
      order: { start: 'DESC' },
    });

    if (!lastSchedule) {
      return 30; // 没有历史记录，假设30天
    }

    const daysDiff = Math.floor((Date.now() - lastSchedule.start.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  }
}