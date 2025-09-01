import { IsString, IsNotEmpty, IsEnum, IsObject, IsOptional, IsBoolean, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TimeConfig, RoleConfig, RotationConfig, Constraints } from '../entities/schedule-rule.entity';

class TimeConfigDto implements TimeConfig {
  @IsObject({ each: true })
  shifts: any[];

  @IsInt({ each: true })
  workDays: number[];

  @IsBoolean()
  skipHolidays: boolean;
}

class RoleConfigDto implements RoleConfig {
  @IsObject({ each: true })
  roles: any[];

  @IsBoolean()
  allowEmpty: boolean;
}

class RotationConfigDto implements RotationConfig {
  @IsEnum(['SEQUENTIAL', 'BALANCED', 'RANDOM'])
  mode: 'SEQUENTIAL' | 'BALANCED' | 'RANDOM';

  @IsInt()
  cycle: number;

  @IsNotEmpty()
  startDate: Date;
}

class ConstraintsDto implements Constraints {
  @IsInt()
  maxConsecutiveDays: number;

  @IsInt()
  minRestHours: number;

  @IsInt()
  maxWorkHoursPerWeek: number;

  @IsString({ each: true })
  forbiddenCombinations: string[];
}

export class CreateScheduleRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'CONTINUOUS', 'SHIFT_BASED'])
  rotationType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CONTINUOUS' | 'SHIFT_BASED';

  @IsObject()
  @ValidateNested()
  @Type(() => TimeConfigDto)
  timeConfig: TimeConfig;

  @IsObject()
  @ValidateNested()
  @Type(() => RoleConfigDto)
  roleConfig: RoleConfig;

  @IsObject()
  @ValidateNested()
  @Type(() => RotationConfigDto)
  rotationConfig: RotationConfig;

  @IsObject()
  @ValidateNested()
  @Type(() => ConstraintsDto)
  constraints: Constraints;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 