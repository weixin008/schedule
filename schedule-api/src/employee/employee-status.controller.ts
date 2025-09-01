import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { EmployeeStatusService } from './employee-status.service';
import { CreateEmployeeStatusDto } from './dto/create-employee-status.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('employee-status')
@UseGuards(AuthGuard, RolesGuard)
export class EmployeeStatusController {
  constructor(private readonly employeeStatusService: EmployeeStatusService) {}

  @Post()
  create(@Body() createEmployeeStatusDto: CreateEmployeeStatusDto) {
    return this.employeeStatusService.create(createEmployeeStatusDto);
  }

  @Get()
  findAll() {
    return this.employeeStatusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeeStatusService.findOne(+id);
  }

  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.employeeStatusService.findByEmployee(+employeeId);
  }

  @Get('employee/:employeeId/current')
  findCurrentStatus(@Param('employeeId') employeeId: string) {
    return this.employeeStatusService.findCurrentStatus(+employeeId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmployeeStatusDto: UpdateEmployeeStatusDto) {
    return this.employeeStatusService.update(+id, updateEmployeeStatusDto);
  }

  @Post(':id/approve')
  @Roles(Role.Admin, Role.Manager)
  approve(@Param('id') id: string, @Request() req) {
    return this.employeeStatusService.approve(+id, req.user.sub);
  }

  @Post(':id/reject')
  @Roles(Role.Admin, Role.Manager)
  reject(@Param('id') id: string, @Request() req) {
    return this.employeeStatusService.reject(+id, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Manager)
  remove(@Param('id') id: string) {
    return this.employeeStatusService.remove(+id);
  }
}