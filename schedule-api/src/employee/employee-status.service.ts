import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeStatus, EmployeeStatusType } from './entities/employee-status.entity';
import { CreateEmployeeStatusDto } from './dto/create-employee-status.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';

@Injectable()
export class EmployeeStatusService {
  constructor(
    @InjectRepository(EmployeeStatus)
    private employeeStatusRepository: Repository<EmployeeStatus>,
  ) {}

  async create(createEmployeeStatusDto: CreateEmployeeStatusDto): Promise<EmployeeStatus> {
    const employeeStatus = this.employeeStatusRepository.create(createEmployeeStatusDto);
    return await this.employeeStatusRepository.save(employeeStatus);
  }

  async findAll(): Promise<EmployeeStatus[]> {
    return await this.employeeStatusRepository.find({
      relations: ['employee'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<EmployeeStatus | null> {
    return await this.employeeStatusRepository.findOne({
      where: { id },
      relations: ['employee'],
    });
  }

  async findByEmployee(employeeId: number): Promise<EmployeeStatus[]> {
    return await this.employeeStatusRepository.find({
      where: { employeeId },
      relations: ['employee'],
      order: { startDate: 'DESC' },
    });
  }

  async findCurrentStatus(employeeId: number): Promise<EmployeeStatus | null> {
    const today = new Date().toISOString().split('T')[0];
    return await this.employeeStatusRepository
      .createQueryBuilder('status')
      .leftJoinAndSelect('status.employee', 'employee')
      .where('status.employeeId = :employeeId', { employeeId })
      .andWhere('status.startDate <= :today', { today })
      .andWhere('(status.endDate IS NULL OR status.endDate >= :today)', { today })
      .orderBy('status.startDate', 'DESC')
      .getOne();
  }

  async update(id: number, updateEmployeeStatusDto: UpdateEmployeeStatusDto): Promise<EmployeeStatus | null> {
    await this.employeeStatusRepository.update(id, updateEmployeeStatusDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.employeeStatusRepository.delete(id);
  }

  async approve(id: number, approvedBy: number): Promise<EmployeeStatus | null> {
    await this.employeeStatusRepository.update(id, {
      approvalStatus: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
    });
    return this.findOne(id);
  }

  async reject(id: number, approvedBy: number): Promise<EmployeeStatus | null> {
    await this.employeeStatusRepository.update(id, {
      approvalStatus: 'REJECTED',
      approvedBy,
      approvedAt: new Date(),
    });
    return this.findOne(id);
  }
}