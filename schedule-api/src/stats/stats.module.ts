import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from '../schedule/entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Schedule, Employee])
  ],
  controllers: [StatsController]
})
export class StatsModule {}