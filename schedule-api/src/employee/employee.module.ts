import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { EmployeeStatusService } from './employee-status.service';
import { EmployeeStatusController } from './employee-status.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { EmployeeStatus } from './entities/employee-status.entity';
import { OrganizationNode } from '../organization/entities/organization-node.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, EmployeeStatus, OrganizationNode])],
  controllers: [EmployeeController, EmployeeStatusController],
  providers: [EmployeeService, EmployeeStatusService],
})
export class EmployeeModule {}
