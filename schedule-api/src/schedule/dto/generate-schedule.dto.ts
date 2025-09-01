import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { ShiftPattern, WorkDayPattern } from '../entities/shift-rule.entity';

export class GenerateScheduleDto {
  @IsNotEmpty()
  positionId: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsEnum(ShiftPattern)
  @IsOptional()
  shiftPattern?: ShiftPattern;

  @IsEnum(WorkDayPattern)
  @IsOptional()
  workDayPattern?: WorkDayPattern;

  @IsBoolean()
  @IsOptional()
  forceGenerate?: boolean = false;

  @IsOptional()
  customWorkDays?: number[]; // 自定义工作日 (0-6)

  @IsOptional()
  excludeEmployeeIds?: number[]; // 排除的员工ID列表

  @IsOptional()
  preferredEmployeeIds?: number[]; // 优先考虑的员工ID列表
}