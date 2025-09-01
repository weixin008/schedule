import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Position } from './position.entity';

@Entity()
export class PositionLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  positionId: number;

  @Column()
  level: number; // 级别数字，越小权限越高

  @Column()
  levelName: string; // 级别名称，如"带班领导"、"值班人员"

  @Column({ nullable: true })
  description: string; // 级别描述

  @Column({ default: 1 })
  requiredCount: number; // 该级别需要的人数

  @Column({ default: false })
  isRequired: boolean; // 是否必须有此级别的人值班

  @ManyToOne(() => Position)
  @JoinColumn({ name: 'positionId' })
  position: Position;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}