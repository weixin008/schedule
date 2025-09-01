import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from './employee.entity';

export enum EmployeeStatusType {
  AVAILABLE = 'AVAILABLE', // 可用
  ON_LEAVE = 'ON_LEAVE', // 请假
  BUSINESS_TRIP = 'BUSINESS_TRIP', // 出差
  SICK_LEAVE = 'SICK_LEAVE', // 病假
  VACATION = 'VACATION', // 休假
  TRAINING = 'TRAINING', // 培训
  TEMPORARY_UNAVAILABLE = 'TEMPORARY_UNAVAILABLE', // 临时不可用
}

@Entity()
export class EmployeeStatus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  employeeId: number;

  @Column({
    type: 'simple-enum',
    enum: EmployeeStatusType,
    default: EmployeeStatusType.AVAILABLE,
  })
  status: EmployeeStatusType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date; // null表示无限期

  @Column({ nullable: true })
  reason: string; // 状态变更原因

  @Column({ nullable: true })
  approvedBy: number; // 批准人ID

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date; // 批准时间

  @Column({ default: 'PENDING' })
  approvalStatus: string; // PENDING, APPROVED, REJECTED

  @Column({ nullable: true })
  remarks: string; // 备注

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}