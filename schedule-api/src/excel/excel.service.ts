import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { Schedule } from '../schedule/entities/schedule.entity';
import { Employee } from '../employee/entities/employee.entity';

@Injectable()
export class ExcelService {
  exportSchedules(schedules: Schedule[]): Buffer {
    const rows = schedules.map(schedule => ({
      '员工ID': schedule.employeeId,
      '岗位ID': schedule.positionId,
      '开始时间': schedule.start,
      '结束时间': schedule.end,
      '状态': schedule.status,
      '备注': schedule.notes,
      '替班历史': schedule.replacementHistory 
        ? JSON.stringify(schedule.replacementHistory)
        : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '排班表');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  exportEmployees(employees: Employee[]): Buffer {
    const rows = employees.map(employee => ({
      '员工ID': employee.id,
      '姓名': employee.name,
      '部门ID': employee.departmentId,
      '职位ID': employee.positionId,
      '状态': employee.status,
      '联系方式': [employee.phone, employee.email].filter(Boolean).join(' / ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '员工表');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  importSchedules(buffer: Buffer): Partial<Schedule>[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return data.map((row: any) => {
      const schedule: Partial<Schedule> = {
        employeeId: row['员工ID'],
        positionId: row['岗位ID'],
        start: new Date(row['开始时间']),
        end: new Date(row['结束时间']),
        status: row['状态'] || 'pending',
        notes: row['备注'] || '',
        title: row['标题'] || '',
        shift: row['班次'] || 'morning',
        date: new Date(row['日期'] || row['开始时间']),
        startTime: row['开始时间段'] || '09:00',
        endTime: row['结束时间段'] || '17:00'
      };
      
      if (row['替班历史']) {
        try {
          schedule.replacementHistory = JSON.parse(row['替班历史']);
        } catch (e) {
          schedule.replacementHistory = '[]';
        }
      }
      
      return schedule;
    });
  }
}