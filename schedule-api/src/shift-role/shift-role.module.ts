import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftRoleService } from './shift-role.service';
import { ShiftRoleController } from './shift-role.controller';
import { ShiftRole } from './entities/shift-role.entity';
import { Employee } from '../employee/entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftRole, Employee])],
  controllers: [ShiftRoleController],
  providers: [ShiftRoleService],
  exports: [ShiftRoleService],
})
export class ShiftRoleModule {}