import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';
import { GroupRotationPattern, GroupShiftType } from '../entities/group-shift-rule.entity';

export class CreateGroupShiftRuleDto {
  @IsString()
  name: string;

  @IsNumber()
  groupId: number;

  @IsNumber()
  positionId: number;

  @IsEnum(GroupRotationPattern)
  @IsOptional()
  rotationPattern?: GroupRotationPattern = GroupRotationPattern.WEEKLY;

  @IsEnum(GroupShiftType)
  @IsOptional()
  shiftType?: GroupShiftType = GroupShiftType.FULL_GROUP;

  @IsNumber()
  @IsOptional()
  rotationDays?: number = 7;

  @IsNumber()
  requiredMemberCount: number;

  @IsNumber()
  @IsOptional()
  minMemberCount?: number = 0;

  @IsBoolean()
  @IsOptional()
  allowPartialGroup?: boolean = false;

  @IsBoolean()
  @IsOptional()
  strictRotation?: boolean = false;

  @IsArray()
  @IsOptional()
  workDays?: number[];

  @IsArray()
  @IsOptional()
  timeSlots?: {
    start: string;
    end: string;
    name: string;
  }[];

  @IsObject()
  @IsOptional()
  constraints?: {
    maxConsecutiveShifts: number;
    minRestDaysBetweenShifts: number;
    allowCrossGroupReplacement: boolean;
    priorityLevels: number[];
  };

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  effectiveStartDate?: Date;

  @IsOptional()
  effectiveEndDate?: Date;
}