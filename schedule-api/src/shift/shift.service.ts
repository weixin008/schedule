import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
  ) {}

  async create(createShiftDto: CreateShiftDto): Promise<Shift> {
    const shift = this.shiftRepository.create({
      ...createShiftDto,
      type: Shift.detectShiftType(createShiftDto.startTime, createShiftDto.endTime),
      isOvernight: Shift.isOvernightShift(createShiftDto.startTime, createShiftDto.endTime),
    });

    return await this.shiftRepository.save(shift);
  }

  async findAll(): Promise<Shift[]> {
    return await this.shiftRepository.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });
  }

  async findActive(): Promise<Shift[]> {
    return await this.shiftRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });
  }

  async findOne(id: number): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({ where: { id } });
    if (!shift) {
      throw new NotFoundException(`Shift with ID ${id} not found`);
    }
    return shift;
  }

  async update(id: number, updateShiftDto: UpdateShiftDto): Promise<Shift> {
    const shift = await this.findOne(id);
    
    // 如果更新了时间，重新计算类型和跨夜标识
    if (updateShiftDto.startTime || updateShiftDto.endTime) {
      const startTime = updateShiftDto.startTime || shift.startTime;
      const endTime = updateShiftDto.endTime || shift.endTime;
      
      (updateShiftDto as any).type = Shift.detectShiftType(startTime, endTime);
      (updateShiftDto as any).isOvernight = Shift.isOvernightShift(startTime, endTime);
    }

    Object.assign(shift, updateShiftDto);
    return await this.shiftRepository.save(shift);
  }

  async remove(id: number): Promise<void> {
    const shift = await this.findOne(id);
    await this.shiftRepository.remove(shift);
  }

  async toggleActive(id: number): Promise<Shift> {
    const shift = await this.findOne(id);
    shift.isActive = !shift.isActive;
    return await this.shiftRepository.save(shift);
  }

  // 获取班次类型统计
  async getShiftTypeStats(): Promise<{ type: string; count: number }[]> {
    return await this.shiftRepository
      .createQueryBuilder('shift')
      .select('shift.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('shift.isActive = :isActive', { isActive: true })
      .groupBy('shift.type')
      .getRawMany();
  }
}