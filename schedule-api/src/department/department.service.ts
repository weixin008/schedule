import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Department } from './entities/department.entity';
import { Position } from '../position/entities/position.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto, organizationId?: string) {
    const department = this.departmentRepository.create({
      ...createDepartmentDto,
      organizationId: organizationId || 'default'
    });
    return this.departmentRepository.save(department);
  }

  async findAll(organizationId?: string) {
    const whereCondition = organizationId ? { organizationId } : {};
    return this.departmentRepository.find({
      where: whereCondition,
      relations: ['parent', 'children']
    });
  }

  async findTree(organizationId?: string) {
    try {
      // 获取所有部门
      const whereCondition = organizationId ? { organizationId } : {};
      const departments = await this.departmentRepository.find({ where: whereCondition });

      // 获取所有职位（暂时不加载员工关系）
      const positionWhereCondition = organizationId ? { organizationId } : {};
      const allPositions = await this.positionRepository.find({ where: positionWhereCondition });

      // 构建树形结构
      const buildTree = (parentId: number | null = null): any[] => {
        return departments
          .filter(dept => dept.parentId === parentId)
          .map(dept => {
            // 获取该部门的职位
            const positions = allPositions.filter(pos => pos.departmentId === dept.id);
            
            return {
              ...dept,
              positions,
              children: buildTree(dept.id)
            };
          });
      };

      return buildTree();
    } catch (error) {
      console.error('Error in findTree:', error);
      throw error;
    }
  }

  async findWithPositions(id: number) {
    const department = await this.departmentRepository.findOne({
      where: { id },
      relations: ['parent', 'children']
    });

    if (department) {
      const positions = await this.positionRepository.find({
        where: { departmentId: id },
        relations: ['employees']
      });
      
      return {
        ...department,
        positions
      };
    }

    return null;
  }

  async findOne(id: number) {
    return this.departmentRepository.findOne({
      where: { id },
      relations: ['parent', 'children']
    });
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    await this.departmentRepository.update(id, updateDepartmentDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    // 检查是否有子部门
    const children = await this.departmentRepository.find({
      where: { parentId: id }
    });

    if (children.length > 0) {
      throw new BadRequestException(`无法删除部门，该部门下还有 ${children.length} 个子部门，请先删除子部门`);
    }

    // 检查是否有职位
    const positions = await this.positionRepository.find({
      where: { departmentId: id }
    });

    if (positions.length > 0) {
      throw new BadRequestException(`无法删除部门，该部门下还有 ${positions.length} 个职位，请先删除职位`);
    }

    return this.departmentRepository.delete(id);
  }
}