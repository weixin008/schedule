import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Position } from '../../position/entities/position.entity';

export enum GroupRotationPattern {
  WEEKLY = 'WEEKLY',           // 每周轮换
  BIWEEKLY = 'BIWEEKLY',       // 每两周轮换
  MONTHLY = 'MONTHLY',         // 每月轮换
  CUSTOM_DAYS = 'CUSTOM_DAYS', // 自定义天数轮换
}

export enum GroupShiftType {
  FULL_GROUP = 'FULL_GROUP',     // 整组值班
  PARTIAL_GROUP = 'PARTIAL_GROUP', // 部分组员值班
  ROTATING_MEMBERS = 'ROTATING_MEMBERS', // 组内成员轮换
}

@Entity()
export class GroupShiftRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // 规则名称，如"护理组夜班轮换"

  @Column()
  groupId: number;

  @Column()
  positionId: number;

  @Column({
    type: 'simple-enum',
    enum: GroupRotationPattern,
    default: GroupRotationPattern.WEEKLY,
  })
  rotationPattern: GroupRotationPattern;

  @Column({
    type: 'simple-enum',
    enum: GroupShiftType,
    default: GroupShiftType.FULL_GROUP,
  })
  shiftType: GroupShiftType;

  @Column({ default: 7 })
  rotationDays: number; // 轮换周期天数

  @Column()
  requiredMemberCount: number; // 每次值班需要的组员数量

  @Column({ default: 0 })
  minMemberCount: number; // 最少组员数量（可以少于required但不能为0）

  @Column({ default: false })
  allowPartialGroup: boolean; // 是否允许不足人数时部分组员值班

  @Column({ default: false })
  strictRotation: boolean; // 是否严格按顺序轮换

  @Column('simple-array', { nullable: true })
  workDays: number[]; // 工作日配置 [1,2,3,4,5] 表示周一到周五

  @Column('simple-json', { nullable: true })
  timeSlots: {
    start: string; // "08:00"
    end: string;   // "20:00"
    name: string;  // "白班"
  }[];

  @Column('simple-json', { nullable: true })
  constraints: {
    maxConsecutiveShifts: number; // 组员最大连续值班次数
    minRestDaysBetweenShifts: number; // 组员值班间最小休息天数
    allowCrossGroupReplacement: boolean; // 是否允许跨组替班
    priorityLevels: number[]; // 优先级别，按顺序选择组员
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  effectiveStartDate: Date; // 规则生效开始日期

  @Column({ type: 'date', nullable: true })
  effectiveEndDate: Date; // 规则生效结束日期

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => Position)
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}