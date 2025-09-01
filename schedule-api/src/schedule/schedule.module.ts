import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { Schedule } from './entities/schedule.entity';
import { ScheduleRule } from '../schedule-rule/entities/schedule-rule.entity';
import { Employee } from '../employee/entities/employee.entity';
import { EmployeeStatus } from '../employee/entities/employee-status.entity';
import { Position } from '../position/entities/position.entity';
import { ShiftRule } from '../schedule-rule/entities/shift-rule.entity';
import { GroupShiftRule } from '../group/entities/group-shift-rule.entity';
import { GroupShiftHistory } from '../group/entities/group-shift-history.entity';
import { ScheduleValidationService } from './schedule-validation.service';
import { ScheduleConflictService } from './schedule-conflict.service';
import { EnhancedConflictDetectionService } from './enhanced-conflict-detection.service';
import { IntegratedConflictDetectionService } from './integrated-conflict-detection.service';
import { SmartSchedulingService } from './smart-scheduling.service';
import { SimplifiedScheduleEngineService } from './simplified-schedule-engine.service';
import { SimplifiedScheduleEngineController } from './simplified-schedule-engine.controller';
import { AdvancedScheduleService } from './advanced-schedule.service';
import { AdvancedScheduleController } from './advanced-schedule.controller';
import { WeekendContinuousScheduleService } from './weekend-continuous-schedule.service';

import { Shift } from '../shift/entities/shift.entity';
import { ShiftRole } from '../shift-role/entities/shift-role.entity';
import { Group } from '../group/entities/group.entity';
import { ExcelModule } from '../excel/excel.module';
import { GroupModule } from '../group/group.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule, 
      ScheduleRule, 
      Employee, 
      EmployeeStatus,
      Position,
      ShiftRule,
      GroupShiftRule,
      GroupShiftHistory,
      Shift,
      ShiftRole,
      Group,
    ]),
    ExcelModule,
    GroupModule,
  ],
  controllers: [
    ScheduleController,
    SimplifiedScheduleEngineController,
    AdvancedScheduleController,

  ],
  providers: [
    ScheduleService, 
    ScheduleValidationService,
    ScheduleConflictService,
    EnhancedConflictDetectionService,
    IntegratedConflictDetectionService,
    SmartSchedulingService,
    SimplifiedScheduleEngineService,
    AdvancedScheduleService,
    WeekendContinuousScheduleService,
  ],
  exports: [
    ScheduleService,
    ScheduleValidationService,
    ScheduleConflictService,
    EnhancedConflictDetectionService,
    IntegratedConflictDetectionService,
    SmartSchedulingService,
    SimplifiedScheduleEngineService,
    AdvancedScheduleService,
    WeekendContinuousScheduleService,
  ],
})
export class ScheduleModule {} 