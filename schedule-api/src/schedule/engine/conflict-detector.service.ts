import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { Employee } from '../../employee/entities/employee.entity';
import { Shift } from '../../shift/entities/shift.entity';

export interface ConflictInfo {
  type: 'TIME_CONFLICT' | 'STATUS_CONFLICT' | 'EMPTY_ROLE' | 'WORKLOAD_VIOLATION' | 'REST_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  affectedSchedules: Schedule[];
  affectedEmployees: Employee[];
  suggestedSolution: string;
  suggestedActions: string[];
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictInfo[];
  warnings: string[];
  canProceed: boolean;
  requiresApproval: boolean;
}

@Injectable()
export class ConflictDetectorService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
  ) {}

  /**
   * 检测排班冲突
   */
  async detectConflicts(schedules: Schedule[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    
    // 按日期分组
    const schedulesByDate = this.groupSchedulesByDate(schedules);
    
    for (const [date, dailySchedules] of schedulesByDate) {
      // 检测人员时间冲突
      conflicts.push(...await this.detectTimeConflicts(dailySchedules));
      
      // 检测人员状态冲突
      conflicts.push(...await this.detectStatusConflicts(dailySchedules, new Date(date)));
      
      // 检测角色空缺
      conflicts.push(...this.detectEmptyRoles(dailySchedules));
      
      // 检测连续工作违规
      conflicts.push(...await this.detectConsecutiveWorkViolations(schedules, new Date(date)));
      
      // 检测工作负荷违规
      conflicts.push(...await this.detectWorkloadViolations(dailySchedules));
    }
    
    return conflicts;
  }

  /**
   * 检测单日冲突
   */
  async detectDailyConflicts(schedules: Schedule[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    
    if (schedules.length === 0) return conflicts;
    
    const date = schedules[0].date;
    
    // 检测时间冲突
    conflicts.push(...await this.detectTimeConflicts(schedules));
    
    // 检测状态冲突
    conflicts.push(...await this.detectStatusConflicts(schedules, date));
    
    // 检测空角色
    conflicts.push(...this.detectEmptyRoles(schedules));
    
    return conflicts;
  }

  /**
   * 检测时间冲突
   */
  private async detectTimeConflicts(schedules: Schedule[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    const personSchedules = new Map<number, Schedule[]>();
    
    // 按人员分组
    schedules.forEach(schedule => {
      if (schedule.assignedPersonId) {
        if (!personSchedules.has(schedule.assignedPersonId)) {
          personSchedules.set(schedule.assignedPersonId, []);
        }
        personSchedules.get(schedule.assignedPersonId)!.push(schedule);
      }
    });
    
    // 检查每个人的时间冲突
    for (const [personId, personScheduleList] of personSchedules) {
      if (personScheduleList.length > 1) {
        const employee = await this.employeeRepository.findOne({ where: { id: personId } });
        if (!employee) continue;

        // 获取班次信息
        const schedulesWithShifts = await Promise.all(
          personScheduleList.map(async schedule => {
            const shift = schedule.shiftId 
              ? await this.shiftRepository.findOne({ where: { id: schedule.shiftId } })
              : null;
            return { schedule, shift };
          })
        );

        // 检查时间重叠
        for (let i = 0; i < schedulesWithShifts.length; i++) {
          for (let j = i + 1; j < schedulesWithShifts.length; j++) {
            const item1 = schedulesWithShifts[i];
            const item2 = schedulesWithShifts[j];
            
            if (item1.shift && item2.shift && this.hasTimeOverlap(item1.shift, item2.shift)) {
              conflicts.push({
                type: 'TIME_CONFLICT',
                severity: 'HIGH',
                title: `${employee.name}时间冲突`,
                description: `${employee.name}在同一时间段有多个排班：${item1.shift.name}(${item1.shift.startTime}-${item1.shift.endTime}) 与 ${item2.shift.name}(${item2.shift.startTime}-${item2.shift.endTime})`,
                affectedSchedules: [item1.schedule, item2.schedule],
                affectedEmployees: [employee],
                suggestedSolution: '重新分配其中一个班次给其他人员',
                suggestedActions: [
                  '取消其中一个排班',
                  '调整班次时间',
                  '分配给其他可用人员'
                ],
              });
            }
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * 检测状态冲突
   */
  private async detectStatusConflicts(schedules: Schedule[], date: Date): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    
    for (const schedule of schedules) {
      if (schedule.assignedPersonId) {
        const employee = await this.employeeRepository.findOne({ 
          where: { id: schedule.assignedPersonId } 
        });
        
        if (employee && !this.isPersonAvailable(employee, date)) {
          conflicts.push({
            type: 'STATUS_CONFLICT',
            severity: 'HIGH',
            title: `${employee.name}状态冲突`,
            description: `${employee.name}在${date.toDateString()}不可用，当前状态：${this.getStatusDescription(employee)}`,
            affectedSchedules: [schedule],
            affectedEmployees: [employee],
            suggestedSolution: '分配给其他可用人员或调整排班日期',
            suggestedActions: [
              '选择其他可用人员',
              '调整排班到员工可用日期',
              '申请特殊审批'
            ],
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * 检测角色空缺
   */
  private detectEmptyRoles(schedules: Schedule[]): ConflictInfo[] {
    const conflicts: ConflictInfo[] = [];
    
    const emptySchedules = schedules.filter(schedule => 
      schedule.status === 'EMPTY' || 
      (!schedule.assignedPersonId && !schedule.assignedGroupId)
    );
    
    emptySchedules.forEach(schedule => {
      conflicts.push({
        type: 'EMPTY_ROLE',
        severity: 'MEDIUM',
        title: '角色空缺',
        description: `角色ID ${schedule.roleId}在${schedule.date.toDateString()}无人分配`,
        affectedSchedules: [schedule],
        affectedEmployees: [],
        suggestedSolution: '寻找符合条件的人员或编组进行分配',
        suggestedActions: [
          '放宽筛选条件',
          '从其他部门调配人员',
          '申请临时人员支援'
        ],
      });
    });
    
    return conflicts;
  }

  /**
   * 检测连续工作违规
   */
  private async detectConsecutiveWorkViolations(
    allSchedules: Schedule[], 
    currentDate: Date
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    const maxConsecutiveDays = 3; // 可以从配置中获取
    
    // 获取当前日期前后几天的排班
    const checkStartDate = new Date(currentDate);
    checkStartDate.setDate(checkStartDate.getDate() - maxConsecutiveDays);
    
    const checkEndDate = new Date(currentDate);
    checkEndDate.setDate(checkEndDate.getDate() + maxConsecutiveDays);
    
    const relevantSchedules = allSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.date);
      return scheduleDate >= checkStartDate && scheduleDate <= checkEndDate;
    });
    
    // 按人员分组
    const personSchedules = new Map<number, Schedule[]>();
    relevantSchedules.forEach(schedule => {
      if (schedule.assignedPersonId) {
        if (!personSchedules.has(schedule.assignedPersonId)) {
          personSchedules.set(schedule.assignedPersonId, []);
        }
        personSchedules.get(schedule.assignedPersonId)!.push(schedule);
      }
    });
    
    // 检查每个人的连续工作天数
    for (const [personId, schedules] of personSchedules) {
      const employee = await this.employeeRepository.findOne({ where: { id: personId } });
      if (!employee) continue;
      
      // 按日期排序
      const sortedSchedules = schedules.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let consecutiveDays = 1;
      let consecutiveStart = sortedSchedules[0];
      
      for (let i = 1; i < sortedSchedules.length; i++) {
        const prevDate = new Date(sortedSchedules[i - 1].date);
        const currDate = new Date(sortedSchedules[i].date);
        
        // 检查是否连续
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          consecutiveDays++;
        } else {
          // 检查是否违规
          if (consecutiveDays > maxConsecutiveDays) {
            conflicts.push({
              type: 'WORKLOAD_VIOLATION',
              severity: 'MEDIUM',
              title: `${employee.name}连续工作超限`,
              description: `${employee.name}连续工作${consecutiveDays}天，超过建议的${maxConsecutiveDays}天限制`,
              affectedSchedules: sortedSchedules.slice(
                sortedSchedules.indexOf(consecutiveStart), 
                i
              ),
              affectedEmployees: [employee],
              suggestedSolution: '安排休息日或调整排班计划',
              suggestedActions: [
                '在连续工作期间安排休息日',
                '与其他人员轮换',
                '申请加班审批'
              ],
            });
          }
          
          // 重置计数
          consecutiveDays = 1;
          consecutiveStart = sortedSchedules[i];
        }
      }
      
      // 检查最后一段连续工作
      if (consecutiveDays > maxConsecutiveDays) {
        conflicts.push({
          type: 'WORKLOAD_VIOLATION',
          severity: 'MEDIUM',
          title: `${employee.name}连续工作超限`,
          description: `${employee.name}连续工作${consecutiveDays}天，超过建议的${maxConsecutiveDays}天限制`,
          affectedSchedules: sortedSchedules.slice(
            sortedSchedules.indexOf(consecutiveStart)
          ),
          affectedEmployees: [employee],
          suggestedSolution: '安排休息日或调整排班计划',
          suggestedActions: [
            '在连续工作期间安排休息日',
            '与其他人员轮换',
            '申请加班审批'
          ],
        });
      }
    }
    
    return conflicts;
  }

  /**
   * 检测工作负荷违规
   */
  private async detectWorkloadViolations(schedules: Schedule[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];
    
    // 统计每个人的工作负荷
    const workloadMap = new Map<number, number>();
    
    for (const schedule of schedules) {
      if (schedule.assignedPersonId) {
        const currentLoad = workloadMap.get(schedule.assignedPersonId) || 0;
        workloadMap.set(schedule.assignedPersonId, currentLoad + 1);
      }
    }
    
    // 检查是否有人工作负荷过重
    for (const [personId, workload] of workloadMap) {
      if (workload > 2) { // 一天超过2个班次认为过重
        const employee = await this.employeeRepository.findOne({ where: { id: personId } });
        if (employee) {
          const affectedSchedules = schedules.filter(s => s.assignedPersonId === personId);
          
          conflicts.push({
            type: 'WORKLOAD_VIOLATION',
            severity: 'MEDIUM',
            title: `${employee.name}工作负荷过重`,
            description: `${employee.name}在同一天被分配了${workload}个班次，可能导致过度疲劳`,
            affectedSchedules,
            affectedEmployees: [employee],
            suggestedSolution: '重新分配部分班次给其他人员',
            suggestedActions: [
              '减少该员工的班次数量',
              '分配给其他可用人员',
              '申请额外人员支援'
            ],
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * 自动解决冲突
   */
  async resolveConflicts(schedules: Schedule[]): Promise<Schedule[]> {
    const conflicts = await this.detectConflicts(schedules);
    let resolvedSchedules = [...schedules];
    
    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'TIME_CONFLICT':
          resolvedSchedules = await this.resolveTimeConflict(resolvedSchedules, conflict);
          break;
        case 'STATUS_CONFLICT':
          resolvedSchedules = await this.resolveStatusConflict(resolvedSchedules, conflict);
          break;
        case 'EMPTY_ROLE':
          resolvedSchedules = await this.resolveEmptyRole(resolvedSchedules, conflict);
          break;
        case 'WORKLOAD_VIOLATION':
          resolvedSchedules = await this.resolveWorkloadViolation(resolvedSchedules, conflict);
          break;
      }
    }
    
    return resolvedSchedules;
  }

  // 辅助方法
  private groupSchedulesByDate(schedules: Schedule[]): Map<string, Schedule[]> {
    const grouped = new Map<string, Schedule[]>();
    
    schedules.forEach(schedule => {
      const dateKey = schedule.date.toDateString();
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(schedule);
    });
    
    return grouped;
  }

  private hasTimeOverlap(shift1: Shift, shift2: Shift): boolean {
    // 简化的时间重叠检测
    const start1 = this.timeToMinutes(shift1.startTime);
    const end1 = this.timeToMinutes(shift1.endTime);
    const start2 = this.timeToMinutes(shift2.startTime);
    const end2 = this.timeToMinutes(shift2.endTime);
    
    // 处理跨夜班次
    if (shift1.isOvernight) {
      return start2 >= start1 || end2 <= end1;
    }
    if (shift2.isOvernight) {
      return start1 >= start2 || end1 <= end2;
    }
    
    return start1 < end2 && start2 < end1;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isPersonAvailable(person: Employee, date: Date): boolean {
    if (person.status === 'ON_DUTY') return true;
    
    // 检查状态时间段
    if (person.statusStartDate) {
      const checkDate = new Date(date);
      const startDate = new Date(person.statusStartDate);
      
      // 如果是长期状态或没有结束日期
      if (person.isLongTerm || !person.statusEndDate) {
        return checkDate < startDate;
      }
      
      // 有结束日期的情况
      const endDate = new Date(person.statusEndDate);
      return checkDate < startDate || checkDate > endDate;
    }
    
    return false;
  }

  private getStatusDescription(employee: Employee): string {
    switch (employee.status) {
      case 'ON_DUTY': return '在岗';
      case 'LEAVE': return '请假';
      case 'BUSINESS_TRIP': return '出差';
      case 'TRANSFER': return '调动';
      case 'RESIGNED': return '离职';
      default: return '未知状态';
    }
  }

  // 冲突解决方法（简化实现）
  private async resolveTimeConflict(schedules: Schedule[], conflict: ConflictInfo): Promise<Schedule[]> {
    // 简化实现：标记冲突状态
    conflict.affectedSchedules.forEach(schedule => {
      const index = schedules.findIndex(s => s.id === schedule.id);
      if (index !== -1) {
        schedules[index].status = 'CONFLICT';
        schedules[index].notes = conflict.description;
      }
    });
    return schedules;
  }

  private async resolveStatusConflict(schedules: Schedule[], conflict: ConflictInfo): Promise<Schedule[]> {
    // 简化实现：标记冲突状态
    conflict.affectedSchedules.forEach(schedule => {
      const index = schedules.findIndex(s => s.id === schedule.id);
      if (index !== -1) {
        schedules[index].status = 'CONFLICT';
        schedules[index].notes = conflict.description;
      }
    });
    return schedules;
  }

  private async resolveEmptyRole(schedules: Schedule[], conflict: ConflictInfo): Promise<Schedule[]> {
    // 简化实现：保持空状态
    return schedules;
  }

  private async resolveWorkloadViolation(schedules: Schedule[], conflict: ConflictInfo): Promise<Schedule[]> {
    // 简化实现：标记警告
    conflict.affectedSchedules.forEach(schedule => {
      const index = schedules.findIndex(s => s.id === schedule.id);
      if (index !== -1) {
        schedules[index].notes = (schedules[index].notes || '') + '; ' + conflict.description;
      }
    });
    return schedules;
  }
}