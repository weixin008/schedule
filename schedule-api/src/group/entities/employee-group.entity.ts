import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { Group } from './group.entity';

@Entity()
export class EmployeeGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Employee, employee => employee.groups)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @ManyToOne(() => Group, group => group.employeeGroups)
  @JoinColumn({ name: 'groupId' })
  group: Group;
}