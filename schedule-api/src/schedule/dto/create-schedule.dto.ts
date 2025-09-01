import { IsNotEmpty, IsDateString, IsString, IsOptional, IsIn, IsNumber } from 'class-validator';

export class CreateScheduleDto {
  @IsNotEmpty()
  @IsNumber()
  employeeId: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  shift?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  @IsIn(['confirmed', 'pending', 'rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  start: string;

  @IsDateString()
  @IsNotEmpty()
  end: string;

  @IsNotEmpty()
  @IsNumber()
  positionId: number;

  @IsOptional()
  @IsNumber()
  replacementEmployeeId?: number;

  @IsOptional()
  @IsString()
  replacementReason?: string;
}