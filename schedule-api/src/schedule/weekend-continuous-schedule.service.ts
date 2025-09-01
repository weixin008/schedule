import { Injectable } from '@nestjs/common';
import { Employee } from '../employee/entities/employee.entity';

export interface WeekendContinuousConfig {
  personnelIds: number[];
  startDate: Date;
  endDate: Date;
}

export interface DayAssignment {
  date: Date;
  dayOfWeek: number;
  assignedPersonId: number;
  assignmentType: 'WEEKDAY' | 'WEEKEND';
  weekNumber: number;
}

@Injectable()
export class WeekendContinuousScheduleService {
  
  /**
   * 生成周末连续值班的排班安排
   * 核心逻辑：
   * - 周一至周四：每日轮换不同人员
   * - 周五至周日：同一人连续值班3天
   * - 每周轮换周末值班人员
   */
  generateWeekendContinuousSchedule(
    personnel: Employee[],
    startDate: Date,
    endDate: Date
  ): DayAssignment[] {
    const assignments: DayAssignment[] = [];
    const currentDate = new Date(startDate);
    
    // 记录工作日轮换索引
    let weekdayRotationIndex = 0;
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=周日, 1=周一, ..., 6=周六
      const weekNumber = this.getWeekNumber(currentDate);
      
      let assignedPersonId: number;
      let assignmentType: 'WEEKDAY' | 'WEEKEND';
      
      if (this.isWeekday(dayOfWeek)) {
        // 周一至周四：每日轮换
        assignedPersonId = personnel[weekdayRotationIndex % personnel.length].id;
        assignmentType = 'WEEKDAY';
        weekdayRotationIndex++;
      } else {
        // 周五至周日：同一人连续值班
        const weekendPersonIndex = weekNumber % personnel.length;
        assignedPersonId = personnel[weekendPersonIndex].id;
        assignmentType = 'WEEKEND';
      }
      
      assignments.push({
        date: new Date(currentDate),
        dayOfWeek,
        assignedPersonId,
        assignmentType,
        weekNumber
      });
      
      // 移动到下一天
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return assignments;
  }
  
  /**
   * 判断是否为工作日（周一至周四）
   */
  private isWeekday(dayOfWeek: number): boolean {
    return dayOfWeek >= 1 && dayOfWeek <= 4;
  }
  
  /**
   * 判断是否为周末（周五至周日）
   */
  private isWeekend(dayOfWeek: number): boolean {
    return dayOfWeek >= 5 || dayOfWeek === 0;
  }
  
  /**
   * 获取周数（从年初开始计算）
   */
  private getWeekNumber(date: Date): number {
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const weekStart = this.getWeekStart(yearStart);
    const diffTime = date.getTime() - weekStart.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks;
  }
  
  /**
   * 获取一周的开始日期（周一）
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整到周一
    return new Date(d.setDate(diff));
  }
  
  /**
   * 验证排班结果的正确性
   */
  validateSchedule(assignments: DayAssignment[]): {
    valid: boolean;
    errors: string[];
    weekendContinuityCheck: boolean;
  } {
    const errors: string[] = [];
    let weekendContinuityCheck = true;
    
    // 按周分组检查
    const weekGroups = this.groupByWeek(assignments);
    
    for (const [weekNumber, weekAssignments] of weekGroups.entries()) {
      // 检查周末连续性
      const weekendAssignments = weekAssignments.filter(a => a.assignmentType === 'WEEKEND');
      if (weekendAssignments.length > 0) {
        const weekendPersonIds = [...new Set(weekendAssignments.map(a => a.assignedPersonId))];
        if (weekendPersonIds.length > 1) {
          errors.push(`第${weekNumber}周的周末值班人员不一致`);
          weekendContinuityCheck = false;
        }
      }
      
      // 检查工作日轮换
      const weekdayAssignments = weekAssignments.filter(a => a.assignmentType === 'WEEKDAY');
      const weekdayPersonIds = weekdayAssignments.map(a => a.assignedPersonId);
      const uniqueWeekdayPersons = [...new Set(weekdayPersonIds)];
      
      if (weekdayPersonIds.length !== uniqueWeekdayPersons.length) {
        errors.push(`第${weekNumber}周的工作日存在重复值班人员`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      weekendContinuityCheck
    };
  }
  
  /**
   * 按周分组排班记录
   */
  private groupByWeek(assignments: DayAssignment[]): Map<number, DayAssignment[]> {
    const weekGroups = new Map<number, DayAssignment[]>();
    
    for (const assignment of assignments) {
      const weekNumber = assignment.weekNumber;
      if (!weekGroups.has(weekNumber)) {
        weekGroups.set(weekNumber, []);
      }
      weekGroups.get(weekNumber)!.push(assignment);
    }
    
    return weekGroups;
  }
  
  /**
   * 生成排班统计报告
   */
  generateReport(assignments: DayAssignment[], personnel: Employee[]): {
    totalDays: number;
    weekdayDays: number;
    weekendDays: number;
    personnelWorkload: Array<{
      personId: number;
      personName: string;
      weekdayDays: number;
      weekendDays: number;
      totalDays: number;
    }>;
  } {
    const totalDays = assignments.length;
    const weekdayDays = assignments.filter(a => a.assignmentType === 'WEEKDAY').length;
    const weekendDays = assignments.filter(a => a.assignmentType === 'WEEKEND').length;
    
    const personnelWorkload = personnel.map(person => {
      const personAssignments = assignments.filter(a => a.assignedPersonId === person.id);
      const personWeekdayDays = personAssignments.filter(a => a.assignmentType === 'WEEKDAY').length;
      const personWeekendDays = personAssignments.filter(a => a.assignmentType === 'WEEKEND').length;
      
      return {
        personId: person.id,
        personName: person.name,
        weekdayDays: personWeekdayDays,
        weekendDays: personWeekendDays,
        totalDays: personWeekdayDays + personWeekendDays
      };
    });
    
    return {
      totalDays,
      weekdayDays,
      weekendDays,
      personnelWorkload
    };
  }
}