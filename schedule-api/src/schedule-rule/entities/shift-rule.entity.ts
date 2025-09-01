import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Position } from '../../position/entities/position.entity';

export enum ShiftPattern {
  DAILY = 'DAILY', // 每日轮班
  WEEKLY = 'WEEKLY', // 每周轮班
  MONTHLY = 'MONTHLY', // 每月轮班
  CUSTOM = 'CUSTOM', // 自定义周期
}

export enum WorkDayPattern {
  EVERYDAY = 'EVERYDAY', // 每天
  WEEKDAYS = 'WEEKDAYS', // 周一到周五
  WEEKDAYS_SATURDAY = 'WEEKDAYS_SATURDAY', // 周一到周六
  WEEKENDS = 'WEEKENDS', // 仅周末
  CUSTOM_DAYS = 'CUSTOM_DAYS', // 自定义工作日
}

@Entity()
export class ShiftRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  positionId: number;

  @Column({
    type: 'simple-enum',
    enum: ShiftPattern,
    default: ShiftPattern.DAILY,
  })
  shiftPattern: ShiftPattern; // 轮班模式

  @Column({
    type: 'simple-enum',
    enum: WorkDayPattern,
    default: WorkDayPattern.EVERYDAY,
  })
  workDayPattern: WorkDayPattern; // 工作日模式

  @Column('simple-array', { nullable: true })
  customWorkDays: number[]; // 自定义工作日 (0-6, 0=周日)

  @Column({ default: 1 })
  shiftDuration: number; // 每人值班持续天数/周数

  @Column({ default: false })
  enableGrouping: boolean; // 是否启用编组值班

  @Column({ nullable: true })
  groupSize: number; // 编组大小

  @Column({ default: true })
  autoRotation: boolean; // 是否自动轮换

  @Column('simple-json', { nullable: true })
  levelRequirements: { // 各级别人员要求
    level: number;
    count: number;
    required: boolean;
  }[];

  @Column('simple-json', { nullable: true })
  constraints: {
    maxContinuousDays?: number; // 最大连续值班天数
    minRestDays?: number; // 最小休息天数
    avoidConsecutiveWeekends?: boolean; // 避免连续周末值班
    maxShiftsPerMonth?: number; // 每月最大值班次数
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Position)
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}