import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateScheduleRuleDto } from './dto/create-schedule-rule.dto';
import { UpdateScheduleRuleDto } from './dto/update-schedule-rule.dto';
import { ScheduleRule } from './entities/schedule-rule.entity';

@Injectable()
export class ScheduleRuleService {
  constructor(
    @InjectRepository(ScheduleRule)
    private scheduleRuleRepository: Repository<ScheduleRule>,
  ) {}

  create(createScheduleRuleDto: CreateScheduleRuleDto) {
    const rule = this.scheduleRuleRepository.create(createScheduleRuleDto);
    return this.scheduleRuleRepository.save(rule);
  }

  findAll() {
    return this.scheduleRuleRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  findOne(id: number) {
    return this.scheduleRuleRepository.findOneBy({ id });
  }

  update(id: number, updateScheduleRuleDto: UpdateScheduleRuleDto) {
    return this.scheduleRuleRepository.update(id, updateScheduleRuleDto);
  }

  remove(id: number) {
    return this.scheduleRuleRepository.delete(id);
  }
} 