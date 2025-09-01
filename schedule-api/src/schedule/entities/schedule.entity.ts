import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { Group } from '../../group/entities/group.entity';

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'integer', nullable: true })
  shiftId: number | null;

  @Column({ type: 'integer', nullable: true })
  roleId: number | null;

  @Column({ type: 'integer', nullable: true })
  assignedPersonId: number | null; // 单人分配

  @Column({ type: 'integer', nullable: true })
  assignedGroupId: number | null; // 编组分配

  @Column({ 
    type: 'varchar',
    default: 'SINGLE'
  })
  assignmentType: 'SINGLE' | 'GROUP';

  @Column({ 
    type: 'varchar',
    default: 'NORMAL'
  })
  status: 'NORMAL' | 'CONFLICT' | 'EMPTY';

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'assignedPersonId' })
  assignedPerson: Employee;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'assignedGroupId' })
  assignedGroup: Group;

  @ManyToOne(() => Employee, { eager: true, nullable: true }) // 保留以便兼容
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 保留一些原有字段以便兼容
  @Column({ nullable: true })
  title: string;

  @Column({ type: 'datetime', nullable: true })
  start: Date;

  @Column({ type: 'datetime', nullable: true })
  end: Date;

  @Column({ nullable: true })
  employeeId: number; // 保留以便兼容

  @Column({ nullable: true })
  shift: string; // 保留以便兼容

  @Column({ nullable: true })
  startTime: string;

  @Column({ nullable: true })
  endTime: string;

  @Column({ type: 'text', nullable: true })
  replacementHistory: string;

  @Column({ nullable: true })
  positionId: number; // 保留以便兼容

  @Column({ nullable: true })
  replacementEmployeeId?: number;

  @Column({ type: 'text', nullable: true })
  replacementReason?: string;

  @Column({ nullable: true })
  organizationId: string; // 组织ID，用于数据隔离
}