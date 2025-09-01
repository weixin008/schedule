import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleRuleService } from './schedule-rule.service';
import { ScheduleRuleController } from './schedule-rule.controller';
import { ScheduleRule } from './entities/schedule-rule.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduleRule])],
  controllers: [ScheduleRuleController],
  providers: [ScheduleRuleService],
})
export class ScheduleRuleModule {} 