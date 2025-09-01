import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsEnum, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SelectionCriteria } from '../entities/shift-role.entity';

class SelectionCriteriaDto implements SelectionCriteria {
  @IsOptional()
  @IsString({ each: true })
  byPosition?: string[];

  @IsOptional()
  @IsString({ each: true })
  byTags?: string[];

  @IsOptional()
  @IsString({ each: true })
  byDepartment?: string[];
}

export class CreateShiftRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SelectionCriteriaDto)
  selectionCriteria?: SelectionCriteria;

  @IsEnum(['SINGLE', 'GROUP'])
  assignmentType: 'SINGLE' | 'GROUP';

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsString()
  description?: string;



  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  extendedConfig?: any; // 扩展配置，包含时间配置、人员配置、规则配置等
}