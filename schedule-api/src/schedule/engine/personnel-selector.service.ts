import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { Group } from '../../group/entities/group.entity';
import { ShiftRole } from '../../shift-role/entities/shift-role.entity';

export interface PersonnelSelectionResult {
  availablePersonnel: Employee[];
  unavailablePersonnel: {
    employee: Employee;
    reason: string;
  }[];
  selectionCriteria: any;
}

export interface GroupSelectionResult {
  availableGroups: Group[];
  unavailableGroups: {
    group: Group;
    reason: string;
  }[];
}

@Injectable()
export class PersonnelSelectorService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
  ) {}

  /**
   * 根据角色要求筛选可用人员
   */
  async selectPersonnelForRole(
    role: ShiftRole,
    date: Date,
    excludeEmployeeIds: number[] = []
  ): Promise<Employee[]> {
    // 获取所有员工
    const allPersonnel = await this.employeeRepository.find();
    
    return allPersonnel.filter(person => {
      // 排除指定的员工
      if (excludeEmployeeIds.includes(person.id)) {
        return false;
      }

      // 检查状态可用性
      if (!this.isPersonAvailable(person, date)) {
        return false;
      }
      
      // 检查岗位匹配
      if (role.selectionCriteria.byPosition && role.selectionCriteria.byPosition.length > 0) {
        const empPosition = person.organizationNode?.name || person.organizationPosition || person.position;
        if (!empPosition || !role.selectionCriteria.byPosition.includes(empPosition)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * 获取详细的人员筛选结果
   */
  async getDetailedPersonnelSelection(
    role: ShiftRole,
    date: Date,
    excludeEmployeeIds: number[] = []
  ): Promise<PersonnelSelectionResult> {
    const allPersonnel = await this.employeeRepository.find();
    const availablePersonnel: Employee[] = [];
    const unavailablePersonnel: { employee: Employee; reason: string }[] = [];

    for (const person of allPersonnel) {
      // 排除指定的员工
      if (excludeEmployeeIds.includes(person.id)) {
        unavailablePersonnel.push({
          employee: person,
          reason: '已被排除',
        });
        continue;
      }

      // 检查状态可用性
      if (!this.isPersonAvailable(person, date)) {
        unavailablePersonnel.push({
          employee: person,
          reason: this.getUnavailabilityReason(person, date),
        });
        continue;
      }
      
      // 检查岗位匹配
      if (role.selectionCriteria.byPosition && role.selectionCriteria.byPosition.length > 0) {
        const empPosition = person.organizationNode?.name || person.organizationPosition || person.position;
        if (!empPosition || !role.selectionCriteria.byPosition.includes(empPosition)) {
          unavailablePersonnel.push({
            employee: person,
            reason: `岗位不匹配，需要: ${role.selectionCriteria.byPosition.join(', ')}`,
          });
          continue;
        }
      }
      
      // 通过所有检查
      availablePersonnel.push(person);
    }

    return {
      availablePersonnel,
      unavailablePersonnel,
      selectionCriteria: role.selectionCriteria,
    };
  }

  /**
   * 根据角色要求筛选可用编组
   */
  async selectGroupsForRole(
    role: ShiftRole,
    date: Date,
    excludeGroupIds: number[] = []
  ): Promise<Group[]> {
    // 获取所有编组
    const allGroups = await this.groupRepository.find({
      where: { isActive: true },
    });
    
    const availableGroups: Group[] = [];

    for (const group of allGroups) {
      // 排除指定的编组
      if (excludeGroupIds.includes(group.id)) {
        continue;
      }

      // 检查编组是否适用于当前角色
      if (group.applicableRoles && group.applicableRoles.length > 0) {
        if (!group.applicableRoles.includes(role.name)) {
          continue;
        }
      }

      // 检查编组成员可用性
      const groupAvailability = await this.checkGroupAvailability(group, date);
      if (groupAvailability.isAvailable) {
        availableGroups.push(group);
      }
    }

    return availableGroups;
  }

  /**
   * 获取详细的编组筛选结果
   */
  async getDetailedGroupSelection(
    role: ShiftRole,
    date: Date,
    excludeGroupIds: number[] = []
  ): Promise<GroupSelectionResult> {
    const allGroups = await this.groupRepository.find({
      where: { isActive: true },
    });
    
    const availableGroups: Group[] = [];
    const unavailableGroups: { group: Group; reason: string }[] = [];

    for (const group of allGroups) {
      // 排除指定的编组
      if (excludeGroupIds.includes(group.id)) {
        unavailableGroups.push({
          group,
          reason: '已被排除',
        });
        continue;
      }

      // 检查编组是否适用于当前角色
      if (group.applicableRoles && group.applicableRoles.length > 0) {
        if (!group.applicableRoles.includes(role.name)) {
          unavailableGroups.push({
            group,
            reason: `不适用于角色: ${role.name}`,
          });
          continue;
        }
      }

      // 检查编组成员可用性
      const groupAvailability = await this.checkGroupAvailability(group, date);
      if (groupAvailability.isAvailable) {
        availableGroups.push(group);
      } else {
        unavailableGroups.push({
          group,
          reason: groupAvailability.reason,
        });
      }
    }

    return {
      availableGroups,
      unavailableGroups,
    };
  }

  /**
   * 检查人员在指定日期是否可用
   */
  private isPersonAvailable(person: Employee, date: Date): boolean {
    if (person.status === 'ON_DUTY') return true;
    
    // 检查状态时间段
    if (person.statusStartDate) {
      const checkDate = new Date(date);
      const startDate = new Date(person.statusStartDate);
      
      // 如果是长期状态或没有结束日期
      if (person.isLongTerm || !person.statusEndDate) {
        return checkDate < startDate;
      }
      
      // 有结束日期的情况
      const endDate = new Date(person.statusEndDate);
      return checkDate < startDate || checkDate > endDate;
    }
    
    return false;
  }

  /**
   * 获取人员不可用的原因
   */
  private getUnavailabilityReason(person: Employee, date: Date): string {
    switch (person.status) {
      case 'LEAVE':
        return '请假中';
      case 'BUSINESS_TRIP':
        return '出差中';
      case 'TRANSFER':
        return '调动中';
      case 'RESIGNED':
        return '已离职';
    }
    
    if (person.statusStartDate) {
      const checkDate = new Date(date);
      const startDate = new Date(person.statusStartDate);
      
      if (person.isLongTerm || !person.statusEndDate) {
        if (checkDate >= startDate) {
          return `${this.getStatusText(person.status)}中 (长期)`;
        }
      } else {
        const endDate = new Date(person.statusEndDate);
        if (checkDate >= startDate && checkDate <= endDate) {
          return `${this.getStatusText(person.status)}中 (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;
        }
      }
    }
    
    return '状态不可用';
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'ON_DUTY': return '在岗';
      case 'LEAVE': return '请假';
      case 'BUSINESS_TRIP': return '出差';
      case 'TRANSFER': return '调动';
      case 'RESIGNED': return '离职';
      default: return '未知状态';
    }
  }

  /**
   * 检查编组可用性
   */
  private async checkGroupAvailability(
    group: Group,
    date: Date
  ): Promise<{ isAvailable: boolean; reason: string; availableMembers: number; totalMembers: number }> {
    if (!group.memberIds || group.memberIds.length === 0) {
      return {
        isAvailable: false,
        reason: '编组无成员',
        availableMembers: 0,
        totalMembers: 0,
      };
    }

    // 获取编组成员
    const members = await this.employeeRepository.findByIds(group.memberIds);
    const availableMembers = members.filter(member => this.isPersonAvailable(member, date));

    const totalMembers = members.length;
    const availableCount = availableMembers.length;

    // 根据编组类型判断可用性
    if (group.type === 'FIXED_PAIR') {
      // 固定搭配需要所有成员都可用
      const isAvailable = availableCount === totalMembers;
      return {
        isAvailable,
        reason: isAvailable ? '编组可用' : `固定搭配缺少成员 (${availableCount}/${totalMembers})`,
        availableMembers: availableCount,
        totalMembers,
      };
    } else if (group.type === 'ROTATION_GROUP') {
      // 轮换组至少需要一个成员可用
      const isAvailable = availableCount > 0;
      return {
        isAvailable,
        reason: isAvailable ? '编组可用' : '轮换组无可用成员',
        availableMembers: availableCount,
        totalMembers,
      };
    }

    return {
      isAvailable: false,
      reason: '未知编组类型',
      availableMembers: availableCount,
      totalMembers,
    };
  }

  /**
   * 按优先级排序人员
   */
  sortPersonnelByPriority(
    personnel: Employee[],
    criteria: {
      preferredTags?: string[];
      preferredDepartments?: string[];
      sortByLevel?: boolean;
      sortByWorkload?: boolean;
    } = {}
  ): Employee[] {
    return personnel.sort((a, b) => {
      // 按级别排序（数字越小权限越高）
      if (criteria.sortByLevel) {
        if (a.level !== b.level) {
          return a.level - b.level;
        }
      }

      // 按优先标签排序
      if (criteria.preferredTags && criteria.preferredTags.length > 0) {
        const aHasPreferred = criteria.preferredTags.some(tag => a.tags && a.tags.includes(tag));
        const bHasPreferred = criteria.preferredTags.some(tag => b.tags && b.tags.includes(tag));
        
        if (aHasPreferred && !bHasPreferred) return -1;
        if (!aHasPreferred && bHasPreferred) return 1;
      }

      // 按优先部门排序
      if (criteria.preferredDepartments && criteria.preferredDepartments.length > 0) {
        const aInPreferred = a.department && criteria.preferredDepartments.includes(a.department);
        const bInPreferred = b.department && criteria.preferredDepartments.includes(b.department);
        
        if (aInPreferred && !bInPreferred) return -1;
        if (!aInPreferred && bInPreferred) return 1;
      }

      // 默认按姓名排序
      return a.name.localeCompare(b.name);
    });
  }
}