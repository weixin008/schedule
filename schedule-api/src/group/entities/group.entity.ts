import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EmployeeGroup } from './employee-group.entity';

@Entity()
export class Group {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ 
    type: 'varchar',
    default: 'FIXED_PAIR'
  })
  type: 'FIXED_PAIR' | 'ROTATION_GROUP'; // 固定搭配 | 轮换组

  @Column({ type: 'simple-array', nullable: true })
  memberIds: number[]; // 成员ID列表

  @Column({ type: 'simple-array', nullable: true })
  applicableRoles: string[]; // 适用的值班角色

  @Column({ type: 'simple-array', nullable: true })
  rotationOrder: number[]; // 组内轮换顺序（可选）

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => EmployeeGroup, employeeGroup => employeeGroup.group)
  employeeGroups: EmployeeGroup[];

  @Column({ nullable: true })
  organizationId: string; // 组织ID，用于数据隔离
}