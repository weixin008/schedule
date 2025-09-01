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
import { Employee } from '../../employee/entities/employee.entity';

@Entity('organization_node')
export class OrganizationNode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // 节点名称：院长、副院长、心内科、心内科主任、心内科副主任、职员等

  @Column({ 
    type: 'varchar',
    default: 'mixed'
  })
  type: 'department' | 'position' | 'mixed'; // 节点类型：部门、职位、混合（既是部门又是职位）

  @Column({ nullable: true })
  description: string; // 描述

  @Column({ nullable: true })
  parentId: number; // 上级节点ID

  @Column({ 
    type: 'varchar',
    default: 'direct'
  })
  relationshipType: 'direct' | 'guidance'; // 关系类型：direct(实线-直接管辖) | guidance(虚线-业务指导)

  @ManyToOne(() => OrganizationNode, node => node.children)
  @JoinColumn({ name: 'parentId' })
  parent: OrganizationNode;

  @OneToMany(() => OrganizationNode, node => node.parent)
  children: OrganizationNode[];

  // 业务指导关系（虚线连接）
  @Column({ nullable: true })
  guidanceFromId: number; // 接受业务指导的来源节点ID

  @ManyToOne(() => OrganizationNode, node => node.guidanceTargets)
  @JoinColumn({ name: 'guidanceFromId' })
  guidanceFrom: OrganizationNode;

  @OneToMany(() => OrganizationNode, node => node.guidanceFrom)
  guidanceTargets: OrganizationNode[];

  @Column({ default: 1 })
  maxCount: number; // 该节点最大人数（对于职位类型有效）

  @Column({ default: 0 })
  currentCount: number; // 当前人数

  @Column({ 
    type: 'varchar',
    default: 'medium'
  })
  level: 'high' | 'medium' | 'low'; // 层级：高级（院长级）、中级（科主任级）、低级（职员级）

  @Column({ default: 1 })
  sortOrder: number; // 排序顺序

  @Column({ default: 'active' })
  status: string; // 状态

  @OneToMany(() => Employee, employee => employee.organizationNode)
  employees: Employee[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}