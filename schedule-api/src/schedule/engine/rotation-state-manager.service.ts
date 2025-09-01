import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { Group } from '../../group/entities/group.entity';
import { ScheduleRule } from '../../schedule-rule/entities/schedule-rule.entity';

export interface RotationState {
  ruleId: number;
  currentIndex: Map<number, number>; // roleId -> currentIndex
  lastAssignmentDate: Date | null;
  assignmentHistory: AssignmentRecord[];
  groupRotationIndex: Map<number, number>; // groupId -> currentMemberIndex
}

export interface AssignmentRecord {
  date: Date;
  roleId: number;
  assignedPersonId?: number;
  assignedGroupId?: number;
  assignmentType: 'PERSON' | 'GROUP';
}

export interface Assignment {
  type: 'PERSON' | 'GROUP';
  person?: Employee;
  group?: Group;
  memberIndex?: number; // 用于轮换组内部轮换
}

@Injectable()
export class RotationStateManagerService {
  private rotationStates: Map<string, RotationState> = new Map();

  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  /**
   * 初始化轮换状态
   */
  async initializeRotationState(rule: ScheduleRule): Promise<RotationState> {
    const stateKey = `rule_${rule.id}`;
    
    const state: RotationState = {
      ruleId: rule.id,
      currentIndex: new Map(),
      lastAssignmentDate: null,
      assignmentHistory: [],
      groupRotationIndex: new Map(),
    };

    // 为每个角色初始化索引
    if (rule.roleConfig && rule.roleConfig.roles) {
      rule.roleConfig.roles.forEach(role => {
        state.currentIndex.set(role.id, 0);
      });
    }
    
    this.rotationStates.set(stateKey, state);
    return state;
  }

  /**
   * 获取下一个人员分配
   */
  async getNextPersonAssignment(
    availablePersonnel: Employee[],
    rotationState: RotationState,
    roleId: number
  ): Promise<Assignment | null> {
    if (availablePersonnel.length === 0) return null;
    
    const currentIndex = rotationState.currentIndex.get(roleId) || 0;
    const selectedPerson = availablePersonnel[currentIndex % availablePersonnel.length];
    
    // 更新状态
    rotationState.currentIndex.set(roleId, (currentIndex + 1) % availablePersonnel.length);
    rotationState.lastAssignmentDate = new Date();
    rotationState.assignmentHistory.push({
      date: new Date(),
      roleId,
      assignedPersonId: selectedPerson.id,
      assignmentType: 'PERSON',
    });
    
    return {
      type: 'PERSON',
      person: selectedPerson,
    };
  }

  /**
   * 获取下一个编组分配
   */
  async getNextGroupAssignment(
    availableGroups: Group[],
    rotationState: RotationState,
    roleId: number
  ): Promise<Assignment | null> {
    if (availableGroups.length === 0) return null;
    
    const currentIndex = rotationState.currentIndex.get(roleId) || 0;
    const selectedGroup = availableGroups[currentIndex % availableGroups.length];
    
    let memberIndex: number | undefined;
    
    // 如果是轮换组，需要处理组内轮换
    if (selectedGroup.type === 'ROTATION_GROUP') {
      const groupRotationIndex = rotationState.groupRotationIndex.get(selectedGroup.id) || 0;
      memberIndex = groupRotationIndex;
      
      // 更新组内轮换索引
      const memberCount = selectedGroup.memberIds?.length || 1;
      rotationState.groupRotationIndex.set(
        selectedGroup.id,
        (groupRotationIndex + 1) % memberCount
      );
    }
    
    // 更新状态
    rotationState.currentIndex.set(roleId, (currentIndex + 1) % availableGroups.length);
    rotationState.lastAssignmentDate = new Date();
    rotationState.assignmentHistory.push({
      date: new Date(),
      roleId,
      assignedGroupId: selectedGroup.id,
      assignmentType: 'GROUP',
    });
    
    return {
      type: 'GROUP',
      group: selectedGroup,
      memberIndex,
    };
  }

  /**
   * 更新轮换状态
   */
  async updateRotationState(rotationState: RotationState, rule: ScheduleRule): Promise<void> {
    // 根据轮换类型更新状态
    switch (rule.rotationType) {
      case 'DAILY':
        // 每日轮换，状态已在分配时更新
        break;
        
      case 'WEEKLY':
        // 每周轮换，检查是否需要重置
        if (this.isNewWeek(rotationState.lastAssignmentDate)) {
          this.resetRotationIndexes(rotationState, rule);
        }
        break;
        
      case 'MONTHLY':
        // 每月轮换，检查是否需要重置
        if (this.isNewMonth(rotationState.lastAssignmentDate)) {
          this.resetRotationIndexes(rotationState, rule);
        }
        break;
        
      case 'CONTINUOUS':
        // 连续轮换，不重置
        break;
        
      case 'SHIFT_BASED':
        // 基于班次的轮换，根据班次配置处理
        break;
    }
  }

  /**
   * 获取轮换状态统计
   */
  getRotationStatistics(rotationState: RotationState): {
    totalAssignments: number;
    assignmentsByRole: Map<number, number>;
    assignmentsByPerson: Map<number, number>;
    assignmentsByGroup: Map<number, number>;
    lastAssignmentDate: Date | null;
  } {
    const assignmentsByRole = new Map<number, number>();
    const assignmentsByPerson = new Map<number, number>();
    const assignmentsByGroup = new Map<number, number>();

    rotationState.assignmentHistory.forEach(record => {
      // 按角色统计
      const roleCount = assignmentsByRole.get(record.roleId) || 0;
      assignmentsByRole.set(record.roleId, roleCount + 1);

      // 按人员统计
      if (record.assignedPersonId) {
        const personCount = assignmentsByPerson.get(record.assignedPersonId) || 0;
        assignmentsByPerson.set(record.assignedPersonId, personCount + 1);
      }

      // 按编组统计
      if (record.assignedGroupId) {
        const groupCount = assignmentsByGroup.get(record.assignedGroupId) || 0;
        assignmentsByGroup.set(record.assignedGroupId, groupCount + 1);
      }
    });

    return {
      totalAssignments: rotationState.assignmentHistory.length,
      assignmentsByRole,
      assignmentsByPerson,
      assignmentsByGroup,
      lastAssignmentDate: rotationState.lastAssignmentDate,
    };
  }

  /**
   * 平衡轮换分配
   */
  async balanceRotationAssignment(
    availablePersonnel: Employee[],
    rotationState: RotationState,
    roleId: number
  ): Promise<Assignment | null> {
    if (availablePersonnel.length === 0) return null;

    // 计算每个人员的分配次数
    const assignmentCounts = new Map<number, number>();
    rotationState.assignmentHistory
      .filter(record => record.roleId === roleId && record.assignedPersonId)
      .forEach(record => {
        const count = assignmentCounts.get(record.assignedPersonId!) || 0;
        assignmentCounts.set(record.assignedPersonId!, count + 1);
      });

    // 找到分配次数最少的人员
    let minCount = Infinity;
    let selectedPersons: Employee[] = [];

    availablePersonnel.forEach(person => {
      const count = assignmentCounts.get(person.id) || 0;
      if (count < minCount) {
        minCount = count;
        selectedPersons = [person];
      } else if (count === minCount) {
        selectedPersons.push(person);
      }
    });

    // 如果有多个人员分配次数相同，使用轮换索引选择
    const currentIndex = rotationState.currentIndex.get(roleId) || 0;
    const selectedPerson = selectedPersons[currentIndex % selectedPersons.length];

    // 更新状态
    rotationState.currentIndex.set(roleId, (currentIndex + 1) % selectedPersons.length);
    rotationState.lastAssignmentDate = new Date();
    rotationState.assignmentHistory.push({
      date: new Date(),
      roleId,
      assignedPersonId: selectedPerson.id,
      assignmentType: 'PERSON',
    });

    return {
      type: 'PERSON',
      person: selectedPerson,
    };
  }

  /**
   * 随机轮换分配
   */
  async randomRotationAssignment(
    availablePersonnel: Employee[],
    rotationState: RotationState,
    roleId: number
  ): Promise<Assignment | null> {
    if (availablePersonnel.length === 0) return null;

    // 随机选择人员
    const randomIndex = Math.floor(Math.random() * availablePersonnel.length);
    const selectedPerson = availablePersonnel[randomIndex];

    // 更新状态
    rotationState.lastAssignmentDate = new Date();
    rotationState.assignmentHistory.push({
      date: new Date(),
      roleId,
      assignedPersonId: selectedPerson.id,
      assignmentType: 'PERSON',
    });

    return {
      type: 'PERSON',
      person: selectedPerson,
    };
  }

  /**
   * 获取编组内当前轮换成员
   */
  async getCurrentGroupMember(group: Group, rotationState: RotationState): Promise<Employee | null> {
    if (!group.memberIds || group.memberIds.length === 0) {
      return null;
    }

    if (group.type === 'ROTATION_GROUP') {
      const memberIndex = rotationState.groupRotationIndex.get(group.id) || 0;
      const memberId = group.memberIds[memberIndex % group.memberIds.length];
      return await this.employeeRepository.findOne({ where: { id: memberId } });
    }

    // 对于固定搭配，返回第一个成员作为代表
    const memberId = group.memberIds[0];
    return await this.employeeRepository.findOne({ where: { id: memberId } });
  }

  /**
   * 重置轮换索引
   */
  private resetRotationIndexes(rotationState: RotationState, rule: ScheduleRule): void {
    // 根据轮换配置重置索引
    if (rule.rotationConfig.mode === 'SEQUENTIAL') {
      // 顺序轮换，重置为0
      rotationState.currentIndex.forEach((_, roleId) => {
        rotationState.currentIndex.set(roleId, 0);
      });
    } else if (rule.rotationConfig.mode === 'BALANCED') {
      // 平衡轮换，不重置索引，保持平衡状态
    } else if (rule.rotationConfig.mode === 'RANDOM') {
      // 随机轮换，随机设置索引
      rotationState.currentIndex.forEach((_, roleId) => {
        rotationState.currentIndex.set(roleId, Math.floor(Math.random() * 100));
      });
    }
  }

  /**
   * 检查是否是新的一周
   */
  private isNewWeek(lastDate: Date | null): boolean {
    if (!lastDate) return true;
    
    const now = new Date();
    const lastWeek = this.getWeekNumber(lastDate);
    const currentWeek = this.getWeekNumber(now);
    
    return lastWeek !== currentWeek;
  }

  /**
   * 检查是否是新的一月
   */
  private isNewMonth(lastDate: Date | null): boolean {
    if (!lastDate) return true;
    
    const now = new Date();
    return lastDate.getMonth() !== now.getMonth() || lastDate.getFullYear() !== now.getFullYear();
  }

  /**
   * 获取周数
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * 清理过期的轮换状态
   */
  cleanupExpiredStates(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
    const now = new Date();
    
    this.rotationStates.forEach((state, key) => {
      if (state.lastAssignmentDate) {
        const age = now.getTime() - state.lastAssignmentDate.getTime();
        if (age > maxAge) {
          this.rotationStates.delete(key);
        }
      }
    });
  }
}