import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Department } from '../../department/entities/department.entity';
import { Employee } from '../../employee/entities/employee.entity';

@Entity()
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // 职位名称：局长、副局长、科长、副科长、职员等

  @Column({ nullable: true })
  departmentId: number;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 1 })
  maxCount: number; // 该职位最大人数

  @Column({ default: 0 })
  currentCount: number; // 当前人数

  @Column({ default: 'active' })
  status: string;

  @OneToMany(() => Employee, employee => employee.positionInfo)
  employees: Employee[];

  @Column({ nullable: true })
  organizationId: string; // 组织ID，用于数据隔离

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
