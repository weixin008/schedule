import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Res, HttpStatus, BadRequestException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ReplaceScheduleDto } from './dto/replace-schedule.dto';
import { ExportScheduleDto } from './dto/export-schedule.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Response } from 'express';

@UseGuards(AuthGuard)
@Controller('schedules')
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
  ) {}

  @Post()
  create(@Body() createScheduleDto: CreateScheduleDto) {
    return this.scheduleService.create(createScheduleDto);
  }

  @Get()
  findAll() {
    return this.scheduleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`Invalid schedule ID: ${id}`);
    }
    return this.scheduleService.findOne(numericId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateScheduleDto: UpdateScheduleDto) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`Invalid schedule ID: ${id}`);
    }
    return this.scheduleService.update(numericId, updateScheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.scheduleService.remove(+id);
  }

  @Delete()
  removeAll() {
    return this.scheduleService.removeAll();
  }

  @Delete('dev/clear-all')
  clearAllForDev() {
    return this.scheduleService.clearAllForDevelopment();
  }

  @Post('replace')
  replaceSchedule(@Body() replaceScheduleDto: ReplaceScheduleDto) {
    return this.scheduleService.replaceSchedule(replaceScheduleDto);
  }

  // 获取指定日期的排班详情
  @Get('date/:date')
  async getSchedulesByDate(@Param('date') date: string) {
    return this.scheduleService.findByDate(date);
  }

  // 检测排班冲突
  @Get('conflicts/:date')
  async getConflicts(@Param('date') date: string) {
    return { conflicts: [], message: '冲突检测功能开发中' };
  }

  // 获取员工在指定日期的冲突
  @Get('conflicts/employee/:employeeId')
  async getEmployeeConflicts(
    @Param('employeeId') employeeId: string,
    @Query('date') date: string,
  ) {
    return { conflicts: [], message: '员工冲突检测功能开发中' };
  }

  // 批量导入排班
  @Post('import')
  async importSchedules(@Body() schedules: CreateScheduleDto[]) {
    return this.scheduleService.importSchedules(schedules as any);
  }

  // 导出排班数据
  @Get('export')
  async exportSchedules(
    @Query() exportDto: ExportScheduleDto,
    @Res() res: Response,
  ) {
    const result = await this.scheduleService.exportSchedules(
      exportDto.startDate,
      exportDto.endDate,
      exportDto.positionId,
      exportDto.departmentId,
      exportDto.employeeId,
      exportDto.format || 'excel'
    );

    // 如果是JSON格式，直接返回数据
    if (exportDto.format === 'json') {
      return res.status(HttpStatus.OK).json(result);
    }

    // 对于文件格式，设置响应头并返回文件
    const { buffer, filename } = result as { buffer: Buffer; filename: string };
    
    const contentType = exportDto.format === 'csv' 
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    
    return res.end(buffer);
  }
}