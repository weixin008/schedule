import { IsString, IsNotEmpty, IsOptional, IsDateString, IsInt, IsEmail, IsArray, IsBoolean } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  position?: string;
  
  @IsInt()
  @IsOptional()
  departmentId?: number;

  @IsInt()
  @IsOptional()
  positionId?: number;
  
  @IsInt()
  @IsOptional()
  organizationNodeId?: number;
  
  @IsInt()
  @IsOptional()
  userId?: number;

  @IsString()
  @IsOptional()
  status?: 'ON_DUTY' | 'LEAVE' | 'BUSINESS_TRIP' | 'TRANSFER' | 'RESIGNED';

  @IsDateString()
  @IsOptional()
  statusStartDate?: string;

  @IsDateString()
  @IsOptional()
  statusEndDate?: string;

  @IsBoolean()
  @IsOptional()
  isLongTerm?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  level?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsDateString()
  @IsOptional()
  joinDate?: string;

  @IsArray()
  @IsOptional()
  groupIds?: number[];
}
