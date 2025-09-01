import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupShiftRule } from './entities/group-shift-rule.entity';
import { CreateGroupShiftRuleDto } from './dto/create-group-shift-rule.dto';
import { UpdateGroupShiftRuleDto } from './dto/update-group-shift-rule.dto';
import { GroupShiftService } from './group-shift.service';

export interface GroupShiftRuleFilters {
  groupId?: number;
  positionId?: number;
  isActive?: boolean;
}

@Injectable()
export class GroupShiftRuleService {
  constructor(
    @InjectRepository(GroupShiftRule)
    private groupShiftRuleRepository: Repository<GroupShiftRule>,
    private groupShiftService: GroupShiftService,
  ) {}

  async create(createGroupShiftRuleDto: CreateGroupShiftRuleDto): Promise<GroupShiftRule> {
    const rule = this.groupShiftRuleRepository.create(createGroupShiftRuleDto);
    return this.groupShiftRuleRepository.save(rule);
  }

  async findAll(filters: GroupShiftRuleFilters = {}): Promise<GroupShiftRule[]> {
    const queryBuilder = this.groupShiftRuleRepository
      .createQueryBuilder('rule')
      .leftJoinAndSelect('rule.group', 'group')
      .leftJoinAndSelect('rule.position', 'position');

    if (filters.groupId !== undefined) {
      queryBuilder.andWhere('rule.groupId = :groupId', { groupId: filters.groupId });
    }

    if (filters.positionId !== undefined) {
      queryBuilder.andWhere('rule.positionId = :positionId', { positionId: filters.positionId });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('rule.isActive = :isActive', { isActive: filters.isActive });
    }

    return queryBuilder
      .orderBy('rule.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: number): Promise<GroupShiftRule> {
    const rule = await this.groupShiftRuleRepository.findOne({
      where: { id },
      relations: ['group', 'position'],
    });

    if (!rule) {
      throw new NotFoundException(`编组值班规则 ${id} 不存在`);
    }

    return rule;
  }

  async update(id: number, updateGroupShiftRuleDto: UpdateGroupShiftRuleDto): Promise<GroupShiftRule> {
    const rule = await this.findOne(id);
    Object.assign(rule, updateGroupShiftRuleDto);
    return this.groupShiftRuleRepository.save(rule);
  }

  async remove(id: number): Promise<void> {
    const result = await this.groupShiftRuleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`编组值班规则 ${id} 不存在`);
    }
  }

  async activate(id: number): Promise<GroupShiftRule> {
    const rule = await this.findOne(id);
    rule.isActive = true;
    return this.groupShiftRuleRepository.save(rule);
  }

  async deactivate(id: number): Promise<GroupShiftRule> {
    const rule = await this.findOne(id);
    rule.isActive = false;
    return this.groupShiftRuleRepository.save(rule);
  }

  /**
   * 预览规则应用效果
   */
  async previewRuleApplication(
    ruleId: number,
    startDate: string,
    endDate: string
  ): Promise<{
    rule: GroupShiftRule;
    previewAssignments: any[];
    potentialConflicts: any[];
    statistics: {
      totalDays: number;
      workDays: number;
      assignedDays: number;
      coverageRate: number;
    };
  }> {
    const rule = await this.findOne(ruleId);
    
    // 生成预览分配
    const previewAssignments = await this.groupShiftService.generateGroupShifts({
      groupId: rule.groupId,
      positionId: rule.positionId,
      startDate,
      endDate,
    });

    // 计算统计信息
    const totalDays = this.calculateDaysBetween(startDate, endDate);
    const workDays = this.calculateWorkDays(startDate, endDate, rule.workDays);
    const assignedDays = previewAssignments.length;
    const coverageRate = workDays > 0 ? (assignedDays / workDays) * 100 : 0;

    return {
      rule,
      previewAssignments,
      potentialConflicts: [], // 这里可以集成冲突检测
      statistics: {
        totalDays,
        workDays,
        assignedDays,
        coverageRate: Math.round(coverageRate * 100) / 100,
      },
    };
  }

  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  private calculateWorkDays(startDate: string, endDate: string, workDays?: number[]): number {
    if (!workDays || workDays.length === 0) {
      return this.calculateDaysBetween(startDate, endDate);
    }

    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (workDays.includes(dayOfWeek)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }
}