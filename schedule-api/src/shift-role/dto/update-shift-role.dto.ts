import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftRoleDto } from './create-shift-role.dto';

export class UpdateShiftRoleDto extends PartialType(CreateShiftRoleDto) {}