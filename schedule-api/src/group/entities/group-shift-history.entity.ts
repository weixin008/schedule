import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { Employee } from '../../employee/entities/employee.entity';

@Entity()
export class GroupShiftHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column({ type: 'date' })
  shiftDate: Date;

  @Column()
  shiftName: string; // "白班", "夜班", "全天"

  @Column('simple-array')
  participantEmployeeIds: number[]; // 参与值班的组员ID列表

  @Column('simple-array', { nullable: true })
  absentEmployeeIds: number[]; // 缺席的组员ID列表

  @Column('simple-array', { nullable: true })
  replacementEmployeeIds: number[]; // 替班的组员ID列表（可能来自其他组）

  @Column({ nullable: true })
  ruleId: number; // 应用的规则ID

  @Column({ default: 'COMPLETED' })
  status: string; // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED

  @Column('simple-json', { nullable: true })
  performance: {
    attendanceRate: number; // 出勤率
    punctualityRate: number; // 准时率
    satisfactionScore: number; // 满意度评分
    issues: string[]; // 问题记录
  };

  @Column({ nullable: true })
  notes: string; // 备注

  @Column({ nullable: true })
  createdBy: number; // 创建人ID

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @CreateDateColumn()
  createdAt: Date;
}