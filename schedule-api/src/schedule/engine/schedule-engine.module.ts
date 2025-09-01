import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleEngineService } from './schedule-engine.service';
import { PersonnelSelectorService } from './personnel-selector.service';
import { RotationStateManagerService } from './rotation-state-manager.service';
import { ConflictDetectorService } from './conflict-detector.service';
import { ScheduleEngineController } from './schedule-engine.controller';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleRule } from '../../schedule-rule/entities/schedule-rule.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { Group } from '../../group/entities/group.entity';
import { Shift } from '../../shift/entities/shift.entity';
import { ShiftRole } from '../../shift-role/entities/shift-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      ScheduleRule,
      Employee,
      Group,
      Shift,
      ShiftRole,
    ]),
  ],
  controllers: [ScheduleEngineController],
  providers: [
    ScheduleEngineService,
    PersonnelSelectorService,
    RotationStateManagerService,
    ConflictDetectorService,
  ],
  exports: [
    ScheduleEngineService,
    PersonnelSelectorService,
    RotationStateManagerService,
    ConflictDetectorService,
  ],
})
export class ScheduleEngineModule {}