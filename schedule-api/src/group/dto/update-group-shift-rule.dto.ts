import { PartialType } from '@nestjs/mapped-types';
import { CreateGroupShiftRuleDto } from './create-group-shift-rule.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateGroupShiftRuleDto extends PartialType(CreateGroupShiftRuleDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}