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

@Entity()
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  parentId: number;

  @ManyToOne(() => Department, department => department.children)
  @JoinColumn({ name: 'parentId' })
  parent: Department;

  @OneToMany(() => Department, department => department.parent)
  children: Department[];



  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  organizationId: string; // 组织ID，用于数据隔离

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
