import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { Schedule } from '../schedule/entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';

@UseGuards(AuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  @Get('workload')
  @Roles(Role.Admin, Role.Manager)
  async getWorkload() {
    // This is a simplified example. A real implementation would involve more complex queries.
    const employeeCount = await this.employeeRepository.count();
    const scheduleCount = await this.scheduleRepository.count();
    return {
      totalEmployees: employeeCount,
      totalSchedules: scheduleCount,
      avgSchedulesPerEmployee: employeeCount > 0 ? scheduleCount / employeeCount : 0,
    };
  }

  @Get('attendance')
  @Roles(Role.Admin, Role.Manager)
  async getAttendance() {
    // Simplified: counts schedules with 'confirmed' status as attended.
    const confirmed = await this.scheduleRepository.count({ where: { status: 'NORMAL' } });
    const total = await this.scheduleRepository.count();
    return {
      confirmedSchedules: confirmed,
      totalSchedules: total,
      attendanceRate: total > 0 ? (confirmed / total) * 100 : 0,
    };
  }
} 