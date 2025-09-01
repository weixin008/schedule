import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { EmployeeGroup } from '../../group/entities/employee-group.entity';
import { Position } from '../../position/entities/position.entity';
import { Department } from '../../department/entities/department.entity';
import { EmployeeStatus } from './employee-status.entity';
import { OrganizationNode } from '../../organization/entities/organization-node.entity';



@Entity()
export class Employee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  employeeNumber: string | null;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({ type: 'varchar', nullable: true })
  position: string | null;

  @Column({ type: 'varchar', nullable: true })
  organizationPosition: string | null; // 组织岗位

  @Column({ 
    type: 'varchar',
    default: 'ON_DUTY'
  })
  status: 'ON_DUTY' | 'LEAVE' | 'BUSINESS_TRIP' | 'TRANSFER' | 'RESIGNED'; // 员工状态

  @Column({ type: 'date', nullable: true })
  statusStartDate: Date | null; // 状态开始日期

  @Column({ type: 'date', nullable: true })
  statusEndDate: Date | null; // 状态结束日期，null表示长期

  @Column({ type: 'boolean', default: false })
  isLongTerm: boolean; // 是否长期状态

  @Column({ type: 'int', default: 3 })
  level: number; // 员工级别，数字越小权限越高

  @Column({ nullable: true })
  organizationId: string; // 组织ID，用于数据隔离

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'integer', nullable: true })
  departmentId: number | null;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'departmentId' })
  departmentInfo: Department;

  @Column({ type: 'integer', nullable: true })
  positionId: number | null;

  @ManyToOne(() => Position)
  @JoinColumn({ name: 'positionId' })
  positionInfo: Position;

  // 新的组织节点关联
  @Column({ type: 'integer', nullable: true })
  organizationNodeId: number | null;

  @ManyToOne(() => OrganizationNode, node => node.employees)
  @JoinColumn({ name: 'organizationNodeId' })
  organizationNode: OrganizationNode;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @Column({ type: 'date', nullable: true })
  joinDate: Date | null;

  @OneToMany(() => EmployeeGroup, employeeGroup => employeeGroup.employee)
  groups: EmployeeGroup[];

  @OneToMany(() => EmployeeStatus, status => status.employee)
  statusHistory: EmployeeStatus[];
}