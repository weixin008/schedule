import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class ReplaceScheduleDto {
  @IsNotEmpty()
  @IsNumber()
  scheduleId: number;

  @IsNotEmpty()
  @IsNumber()
  replacementEmployeeId: number;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  changedBy?: number;
}