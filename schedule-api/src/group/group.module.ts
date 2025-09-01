import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupService } from './group.service';
import { GroupShiftService } from './group-shift.service';
import { GroupShiftRuleService } from './group-shift-rule.service';
import { GroupController } from './group.controller';
import { GroupShiftController } from './group-shift.controller';
import { GroupShiftRuleController } from './group-shift-rule.controller';
import { Group } from './entities/group.entity';
import { EmployeeGroup } from './entities/employee-group.entity';
import { GroupShiftRule } from './entities/group-shift-rule.entity';
import { GroupShiftHistory } from './entities/group-shift-history.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Schedule } from '../schedule/entities/schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      EmployeeGroup,
      GroupShiftRule,
      GroupShiftHistory,
      Employee,
      Schedule,
    ])
  ],
  controllers: [
    GroupController,
    GroupShiftController,
    GroupShiftRuleController,
  ],
  providers: [
    GroupService,
    GroupShiftService,
    GroupShiftRuleService,
  ],
  exports: [
    GroupService,
    GroupShiftService,
    GroupShiftRuleService,
  ]
})
export class GroupModule {}