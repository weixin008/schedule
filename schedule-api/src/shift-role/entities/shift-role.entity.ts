import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface SelectionCriteria {
  byPosition?: string[];    // 按组织岗位筛选：['院长', '科主任']
  byTags?: string[];        // 按标签筛选：['医生', '护士', '考勤监督员']
  byDepartment?: string[];  // 按部门筛选：['技术部', '运营部']
}

@Entity()
export class ShiftRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string; // 领导岗、值班员岗、安全员岗

  @Column({ type: 'json' })
  selectionCriteria: SelectionCriteria; // 人员筛选条件

  @Column({ 
    type: 'varchar',
    default: 'SINGLE'
  })
  assignmentType: 'SINGLE' | 'GROUP'; // 单人或编组

  @Column({ default: true })
  isRequired: boolean; // 是否必须有人

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number; // 排序字段

  @Column({ type: 'simple-array', nullable: true })
  personnelOrder: number[]; // 人员排序

  @Column({ type: 'json', nullable: true })
  extendedConfig?: any; // 扩展配置，包含时间配置、人员配置、规则配置等

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}