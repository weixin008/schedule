import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Shift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 5 })
  startTime: string; // "08:00"

  @Column({ length: 5 })
  endTime: string; // "16:00"

  @Column({ default: false })
  isOvernight: boolean; // 自动判断是否跨夜

  @Column({ length: 50 })
  type: string; // 自动生成：早班/晚班/夜班/白班

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number; // 排序字段

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 计算班次类型的方法
  static detectShiftType(startTime: string, endTime: string): string {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    
    // 判断是否跨夜
    const isOvernight = start > end || (start === end && startTime !== endTime);
    
    if (isOvernight) {
      return '夜班';
    }
    
    if (start >= 6 && end <= 14) return '早班';
    if (start >= 14 && end <= 22) return '晚班';
    if (start >= 22 || end <= 6) return '夜班';
    return '白班';
  }

  // 判断是否跨夜的方法
  static isOvernightShift(startTime: string, endTime: string): boolean {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    return start > end || (start === end && startTime !== endTime);
  }
}