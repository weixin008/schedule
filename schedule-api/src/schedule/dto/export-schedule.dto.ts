import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';

export class ExportScheduleDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  positionId?: number;

  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @IsOptional()
  @IsNumber()
  employeeId?: number;

  @IsOptional()
  @IsIn(['excel', 'csv', 'json'])
  format?: 'excel' | 'csv' | 'json' = 'excel';
}