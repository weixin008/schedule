import { IsDateString, IsOptional, IsString } from 'class-validator';

export class StatusPeriodDto {
  @IsDateString()
  startDate: Date;

  @IsDateString()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  reason?: string;
}