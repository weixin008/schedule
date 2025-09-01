import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ReplaceScheduleDto } from './dto/replace-schedule.dto';
import { Schedule } from './entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';
import { ScheduleValidationService } from './schedule-validation.service';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private readonly validationService: ScheduleValidationService,
  ) {}

  async create(createScheduleDto: CreateScheduleDto) {
    try {
            // 验证员工是否存在
      const employee = await this.employeeRepository.findOneBy({ id: createScheduleDto.employeeId });
      if (!employee) {
        throw new NotFoundException(`Employee with ID ${createScheduleDto.employeeId} not found.`);
      }
      
                  // 创建最基本的排班记录
      const scheduleData = {
        date: new Date(createScheduleDto.start).toISOString().split('T')[0],
        assignmentType: 'SINGLE' as const,
        status: 'NORMAL' as const,
        employeeId: createScheduleDto.employeeId,
        title: createScheduleDto.title,
        start: new Date(createScheduleDto.start),
        end: new Date(createScheduleDto.end),
        positionId: createScheduleDto.positionId
      };
      
            const schedule = this.scheduleRepository.create(scheduleData);
      
            const savedSchedule = await this.scheduleRepository.save(schedule);
            return savedSchedule;
    } catch (error) {
      console.error('❌ 创建排班失败:', error);
      console.error('❌ 错误详情:', error.message);
      console.error('❌ 错误堆栈:', error.stack);
      throw error;
    }
  }

  async update(id: number, updateScheduleDto: UpdateScheduleDto) {
    const scheduleToUpdate = await this.scheduleRepository.findOneBy({ id });
    if (!scheduleToUpdate) {
      throw new NotFoundException(`Schedule with ID ${id} not found.`);
    }

    const employeeId = updateScheduleDto.employeeId || scheduleToUpdate.employeeId;
    const employee = await this.employeeRepository.findOneBy({ id: employeeId });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found.`);
    }

    const scheduleDataForValidation = {
      id,
      start: updateScheduleDto.start ? new Date(updateScheduleDto.start) : scheduleToUpdate.start,
      end: updateScheduleDto.end ? new Date(updateScheduleDto.end) : scheduleToUpdate.end,
      requiredPositionIds: [updateScheduleDto.positionId || scheduleToUpdate.positionId]
    };
    await this.validationService.validate(scheduleDataForValidation, employeeId);

    Object.assign(scheduleToUpdate, updateScheduleDto);
    return this.scheduleRepository.save(scheduleToUpdate);
  }

  async replaceSchedule(replaceScheduleDto: ReplaceScheduleDto) {
    const schedule = await this.scheduleRepository.findOneBy({ id: replaceScheduleDto.scheduleId });
    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${replaceScheduleDto.scheduleId} not found.`);
    }

    const replacementEmployee = await this.employeeRepository.findOneBy({ id: replaceScheduleDto.replacementEmployeeId });
    if (!replacementEmployee) {
      throw new NotFoundException(`Employee with ID ${replaceScheduleDto.replacementEmployeeId} not found.`);
    }

    // 记录原员工信息
    const originalEmployeeId = schedule.employeeId;

    // 更新排班记录
    schedule.employeeId = replaceScheduleDto.replacementEmployeeId;
    schedule.replacementEmployeeId = replaceScheduleDto.replacementEmployeeId;
    schedule.replacementReason = replaceScheduleDto.reason;

    // 添加替班历史记录
    const historyEntry = {
      date: new Date(),
      originalEmployeeId,
      replacementEmployeeId: replaceScheduleDto.replacementEmployeeId,
      reason: replaceScheduleDto.reason,
      changedBy: replaceScheduleDto.changedBy || 0 // 从请求中获取用户ID，默认为0
    };

    if (!schedule.replacementHistory) {
      schedule.replacementHistory = '[]';
    }
    const history = JSON.parse(schedule.replacementHistory || '[]');
    history.push(historyEntry);
    schedule.replacementHistory = JSON.stringify(history);

    return this.scheduleRepository.save(schedule);
  }

  async findAll() {
    const schedules = await this.scheduleRepository.find({ 
      relations: ['assignedPerson', 'assignedGroup', 'employee'] 
    });
    
    // 转换数据格式以兼容前端
    return schedules.map(schedule => {
      // 优先使用assignedPerson，然后是employee字段
      const employee = schedule.assignedPerson || schedule.employee || null;
      
      return {
        ...schedule,
        employee: employee, // 兼容旧格式
        employeeName: employee?.name || schedule.assignedGroup?.name || '未分配',
        // 确保employeeId字段存在
        employeeId: schedule.assignedPersonId || schedule.employeeId || null
      };
    });
  }

  findOne(id: number) {
    return this.scheduleRepository.findOne({ where: { id }, relations: ['employee'] });
  }

  remove(id: number) {
    return this.scheduleRepository.delete(id);
  }

  async removeAll() {
    try {
      // 先获取所有记录的数量
      const count = await this.scheduleRepository.count();
      
      if (count === 0) {
        return {
          success: true,
          deletedCount: 0,
          message: '没有排班记录需要删除'
        };
      }
      
      // 使用clear()方法删除所有记录
      await this.scheduleRepository.clear();
      
      return {
        success: true,
        deletedCount: count,
        message: `已删除 ${count} 条排班记录`
      };
    } catch (error) {
      console.error('批量删除排班记录失败:', error);
      throw new Error(`删除失败: ${error.message}`);
    }
  }

  async clearAllForDevelopment() {
    try {
      // 清空所有排班记录
      await this.scheduleRepository.clear();
      
      return {
        success: true,
        message: '开发模式：已清空所有排班数据'
      };
    } catch (error) {
      console.error('开发模式清空失败:', error);
      throw new Error(`清空失败: ${error.message}`);
    }
  }

  // 根据日期查找排班
  async findByDate(date: string) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const schedules = await this.scheduleRepository.find({
      relations: ['assignedPerson', 'assignedGroup', 'employee']
    });
    
    // 筛选指定日期的排班
    const daySchedules = schedules.filter(schedule => {
      if (schedule.date) {
        const scheduleDate = new Date(schedule.date);
        scheduleDate.setHours(0, 0, 0, 0);
        return scheduleDate.getTime() === targetDate.getTime();
      }
      return false;
    });
    
    // 转换数据格式以兼容前端
    return daySchedules.map(schedule => {
      const employee = schedule.assignedPerson || schedule.employee || null;
      
      return {
        ...schedule,
        employee: employee,
        employeeName: employee?.name || schedule.assignedGroup?.name || '未分配',
        employeeId: schedule.assignedPersonId || schedule.employeeId || null
      };
    });
  }

  // 导出排班数据
  async exportSchedules(
    startDate?: string,
    endDate?: string,
    positionId?: number,
    departmentId?: number,
    employeeId?: number,
    format: 'excel' | 'csv' | 'json' = 'excel'
  ) {
    // 构建查询条件
    const whereConditions: any = {};
    
    if (startDate && endDate) {
      whereConditions.start = Between(new Date(startDate), new Date(endDate));
    }
    
    if (positionId) {
      whereConditions.positionId = positionId;
    }
    
    if (employeeId) {
      whereConditions.employeeId = employeeId;
    }

    // 查询排班数据并关联相关信息
    const schedules = await this.scheduleRepository.find({
      where: whereConditions,
      relations: ['employee'],
      order: { start: 'ASC' }
    });

    // 过滤部门条件（如果指定）
    const filteredSchedules = departmentId 
      ? schedules.filter(schedule => schedule.employee?.departmentId === departmentId)
      : schedules;

    // 格式化导出数据
    const exportData = filteredSchedules.map(schedule => ({
      '员工姓名': schedule.employee?.name || '未知',
      '员工工号': schedule.employee?.employeeNumber || '未知',
      '岗位名称': schedule.employee?.position || '未指定',
      '部门名称': schedule.employee?.department || '未指定',
      '值班日期': schedule.start.toLocaleDateString('zh-CN'),
      '开始时间': schedule.start.toLocaleTimeString('zh-CN'),
      '结束时间': schedule.end.toLocaleTimeString('zh-CN'),
      '值班类型': this.getShiftType(schedule.start, schedule.end),
      '替班员工': schedule.replacementEmployeeId ? '是' : '否',
      '替班原因': schedule.replacementReason || '',
      '备注': schedule.notes || ''
    }));

    // 根据格式返回数据
    switch (format) {
      case 'json':
        return {
          data: exportData,
          total: exportData.length,
          exportTime: new Date().toISOString()
        };
      
      case 'csv':
        return this.generateCSV(exportData);
      
      case 'excel':
      default:
        return this.generateExcel(exportData);
    }
  }

  private getShiftType(start: Date, end: Date): string {
    const hour = start.getHours();
    if (hour >= 6 && hour < 14) return '白班';
    if (hour >= 14 && hour < 22) return '中班';
    return '夜班';
  }

  private generateCSV(data: any[]): { buffer: Buffer; filename: string } {
    if (data.length === 0) {
      return { buffer: Buffer.from(''), filename: `schedule_export_${Date.now()}.csv` };
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    return {
      buffer: Buffer.from('\ufeff' + csvContent, 'utf8'), // 添加BOM以支持中文
      filename: `schedule_export_${Date.now()}.csv`
    };
  }

  private generateExcel(data: any[]): { buffer: Buffer; filename: string } {
    const XLSX = require('xlsx');
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 员工姓名
      { wch: 12 }, // 员工工号
      { wch: 15 }, // 岗位名称
      { wch: 15 }, // 部门名称
      { wch: 12 }, // 值班日期
      { wch: 10 }, // 开始时间
      { wch: 10 }, // 结束时间
      { wch: 8 },  // 值班类型
      { wch: 8 },  // 替班员工
      { wch: 20 }, // 替班原因
      { wch: 20 }  // 备注
    ];
    worksheet['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '排班数据');
    
    // 生成Excel文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return {
      buffer: Buffer.from(buffer),
      filename: `schedule_export_${Date.now()}.xlsx`
    };
  }

  async importSchedules(schedules: Partial<Schedule>[]) {
    const results: any[] = [];
    for (const scheduleData of schedules) {
      try {
        // 验证员工是否存在
        if (!scheduleData.employeeId) {
          results.push({ 
            success: false, 
            error: 'Employee ID is required',
            data: scheduleData 
          });
          continue;
        }

        const employee = await this.employeeRepository.findOneBy({ id: scheduleData.employeeId });
        if (!employee) {
          results.push({ 
            success: false, 
            error: `Employee with ID ${scheduleData.employeeId} not found`,
            data: scheduleData 
          });
          continue;
        }

        // 验证排班规则
        if (scheduleData.start && scheduleData.end) {
          const validationData = {
            start: scheduleData.start,
            end: scheduleData.end,
            requiredPositionIds: [scheduleData.positionId || 1]
          };
          await this.validationService.validate(validationData, scheduleData.employeeId);
        }

        // 创建并保存排班
        const schedule = this.scheduleRepository.create(scheduleData);
        const savedSchedule = await this.scheduleRepository.save(schedule);
        results.push({ success: true, data: savedSchedule });
      } catch (error: any) {
        results.push({ 
          success: false, 
          error: error.message || 'Unknown error',
          data: scheduleData 
        });
      }
    }
    return results;
  }
}
