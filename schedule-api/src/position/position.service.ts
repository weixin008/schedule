import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { Position } from './entities/position.entity';
import { Employee } from '../employee/entities/employee.entity';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(createPositionDto: CreatePositionDto, organizationId?: string) {
    const position = this.positionRepository.create({
      ...createPositionDto,
      organizationId: organizationId || 'default'
    });
    return this.positionRepository.save(position);
  }

  async findAll(organizationId?: string) {
    const whereCondition = organizationId ? { organizationId } : {};
    return this.positionRepository.find({
      where: whereCondition,
      relations: ['department', 'employees']
    });
  }

  async findByDepartment(departmentId: number) {
    return this.positionRepository.find({
      where: { departmentId },
      relations: ['employees']
    });
  }

  async findOne(id: number) {
    return this.positionRepository.findOne({
      where: { id },
      relations: ['department', 'employees']
    });
  }

  async update(id: number, updatePositionDto: UpdatePositionDto) {
    await this.positionRepository.update(id, updatePositionDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    // 检查是否有员工分配到此职位
    const employees = await this.employeeRepository.find({
      where: { positionId: id }
    });

    if (employees.length > 0) {
      throw new BadRequestException(`无法删除职位，该职位下还有 ${employees.length} 名员工，请先调整员工职位`);
    }

    return this.positionRepository.delete(id);
  }

  async updateEmployeeCount(positionId: number) {
    const count = await this.employeeRepository.count({
      where: { positionId }
    });

    await this.positionRepository.update(positionId, {
      currentCount: count
    });

    return count;
  }
}