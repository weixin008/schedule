import { IsNotEmpty, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { EmployeeStatusType } from '../entities/employee-status.entity';

export class CreateEmployeeStatusDto {
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @IsNotEmpty()
  @IsEnum(EmployeeStatusType)
  status: EmployeeStatusType;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  reason?: string;

  @IsOptional()
  remarks?: string;
}