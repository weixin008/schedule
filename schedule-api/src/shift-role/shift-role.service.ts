import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftRole } from './entities/shift-role.entity';
import { CreateShiftRoleDto } from './dto/create-shift-role.dto';
import { UpdateShiftRoleDto } from './dto/update-shift-role.dto';
import { Employee } from '../employee/entities/employee.entity';

@Injectable()
export class ShiftRoleService {
  constructor(
    @InjectRepository(ShiftRole)
    private shiftRoleRepository: Repository<ShiftRole>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(createShiftRoleDto: CreateShiftRoleDto): Promise<ShiftRole> {
    // 设置默认值
    const roleData = {
      ...createShiftRoleDto,
      selectionCriteria: createShiftRoleDto.selectionCriteria || {
        byPosition: [],
        byTags: [],
        byDepartment: []
      },
      isRequired: createShiftRoleDto.isRequired ?? true,
      isActive: createShiftRoleDto.isActive ?? true,
      sortOrder: createShiftRoleDto.sortOrder ?? 0
    };

    const shiftRole = this.shiftRoleRepository.create(roleData);
    return await this.shiftRoleRepository.save(shiftRole);
  }

  async findAll(): Promise<ShiftRole[]> {
    return await this.shiftRoleRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });
  }

  async findActive(): Promise<ShiftRole[]> {
    return await this.shiftRoleRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });
  }

  async findOne(id: number): Promise<ShiftRole> {
    const shiftRole = await this.shiftRoleRepository.findOne({ where: { id } });
    if (!shiftRole) {
      throw new NotFoundException(`ShiftRole with ID ${id} not found`);
    }
    return shiftRole;
  }

  async update(id: number, updateShiftRoleDto: UpdateShiftRoleDto): Promise<ShiftRole> {
    const shiftRole = await this.findOne(id);
    Object.assign(shiftRole, updateShiftRoleDto);
    return await this.shiftRoleRepository.save(shiftRole);
  }

  async remove(id: number): Promise<void> {
    const shiftRole = await this.findOne(id);
    await this.shiftRoleRepository.remove(shiftRole);
  }

  async toggleActive(id: number): Promise<ShiftRole> {
    const shiftRole = await this.findOne(id);
    shiftRole.isActive = !shiftRole.isActive;
    return await this.shiftRoleRepository.save(shiftRole);
  }

  // 根据角色筛选可用人员
  async filterPersonnelForRole(roleId: number, date?: Date): Promise<Employee[]> {
    const role = await this.findOne(roleId);
    const allPersonnel = await this.employeeRepository.find();

    return allPersonnel.filter(person => {
      // 检查状态可用性
      if (!this.isPersonAvailable(person, date)) {
        return false;
      }

      // 按岗位筛选
      if (role.selectionCriteria.byPosition && role.selectionCriteria.byPosition.length > 0) {
        // 检查员工的组织职位或传统职位字段
        const empPosition = person.organizationNode?.name || person.organizationPosition || person.position;
        if (!empPosition || !role.selectionCriteria.byPosition.includes(empPosition)) {
          return false;
        }
      }

      // 按标签筛选
      if (role.selectionCriteria.byTags && role.selectionCriteria.byTags.length > 0) {
        // 检查员工的标签
        const empTags = person.tags || [];
        if (!empTags.some(tag => role.selectionCriteria.byTags!.includes(tag))) {
          return false;
        }
      }

      // 按部门筛选
      if (role.selectionCriteria.byDepartment && role.selectionCriteria.byDepartment.length > 0) {
        // 检查员工的部门
        const empDepartment = person.departmentInfo?.name || person.department;
        if (!empDepartment || !role.selectionCriteria.byDepartment!.includes(empDepartment)) {
          return false;
        }
      }

      return true;
    });
  }

  // 检查人员在指定日期是否可用
  private isPersonAvailable(person: Employee, date?: Date): boolean {
    // 基础状态检查
    if (person.status !== 'ON_DUTY') {
      return false;
    }

    // 如果没有指定日期，只检查基础状态
    if (!date) {
      return true;
    }

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

    return true;
  }

  // 获取角色分配类型统计
  async getAssignmentTypeStats(): Promise<{ type: string; count: number }[]> {
    return await this.shiftRoleRepository
      .createQueryBuilder('role')
      .select('role.assignmentType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('role.isActive = :isActive', { isActive: true })
      .groupBy('role.assignmentType')
      .getRawMany();
  }

  // 测试人员筛选条件
  async testPersonnelSelection(roleId: number, date: string): Promise<{ availablePersonnel: Employee[] }> {
    const checkDate = new Date(date);
    const availablePersonnel = await this.filterPersonnelForRole(roleId, checkDate);
    
    return {
      availablePersonnel
    };
  }

  // 保存人员排序
  async savePersonnelOrder(roleId: number, employeeIds: number[]): Promise<void> {
    const role = await this.findOne(roleId);
    if (!role) {
      throw new NotFoundException(`ShiftRole with ID ${roleId} not found`);
    }

    // 这里可以将排序信息保存到数据库
    // 暂时使用简单的方式，可以考虑创建一个专门的表来存储排序信息
    role.personnelOrder = employeeIds;
    await this.shiftRoleRepository.save(role);
  }

  // 获取人员排序
  async getPersonnelOrder(roleId: number): Promise<number[]> {
    const role = await this.findOne(roleId);
    if (!role) {
      throw new NotFoundException(`ShiftRole with ID ${roleId} not found`);
    }

    return role.personnelOrder || [];
  }
}