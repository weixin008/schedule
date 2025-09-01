import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Shift } from '../../shift/entities/shift.entity';
import { ShiftRole } from '../../shift-role/entities/shift-role.entity';

export interface TimeConfig {
  shifts: Shift[];           // 班次列表
  workDays: number[];        // 工作日：[1,2,3,4,5] 周一到周五
  skipHolidays: boolean;     // 是否跳过节假日
}

export interface RoleConfig {
  roles: ShiftRole[];        // 每个班次需要的角色
  allowEmpty: boolean;       // 是否允许空班
}

export interface RotationConfig {
  mode: 'SEQUENTIAL' | 'BALANCED' | 'RANDOM';
  cycle: number;             // 轮换周期（天数）
  startDate: Date;           // 开始日期
}

export interface Constraints {
  maxConsecutiveDays: number;    // 最大连续工作天数
  minRestHours: number;          // 最小休息时间
  maxWorkHoursPerWeek: number;   // 每周最大工作时间
  forbiddenCombinations: string[]; // 禁止的班次组合
}

@Entity()
export class ScheduleRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'varchar',
    default: 'DAILY'
  })
  rotationType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CONTINUOUS' | 'SHIFT_BASED';

  @Column({ type: 'json' })
  timeConfig: TimeConfig; // 时间配置

  @Column({ type: 'json' })
  roleConfig: RoleConfig; // 角色配置

  @Column({ type: 'json' })
  rotationConfig: RotationConfig; // 轮换配置

  @Column({ type: 'json' })
  constraints: Constraints; // 约束条件

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number; // 排序字段

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}