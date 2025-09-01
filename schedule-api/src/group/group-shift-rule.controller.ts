import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { GroupShiftRuleService } from './group-shift-rule.service';
import { CreateGroupShiftRuleDto } from './dto/create-group-shift-rule.dto';
import { UpdateGroupShiftRuleDto } from './dto/update-group-shift-rule.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('group-shift-rules')
export class GroupShiftRuleController {
  constructor(private readonly groupShiftRuleService: GroupShiftRuleService) {}

  @Post()
  create(@Body() createGroupShiftRuleDto: CreateGroupShiftRuleDto) {
    return this.groupShiftRuleService.create(createGroupShiftRuleDto);
  }

  @Get()
  findAll(
    @Query('groupId') groupId?: string,
    @Query('positionId') positionId?: string,
    @Query('isActive') isActive?: string
  ) {
    const filters = {
      groupId: groupId ? +groupId : undefined,
      positionId: positionId ? +positionId : undefined,
      isActive: isActive ? isActive === 'true' : undefined,
    };
    return this.groupShiftRuleService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupShiftRuleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupShiftRuleDto: UpdateGroupShiftRuleDto) {
    return this.groupShiftRuleService.update(+id, updateGroupShiftRuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupShiftRuleService.remove(+id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.groupShiftRuleService.activate(+id);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.groupShiftRuleService.deactivate(+id);
  }

  @Get(':id/preview')
  previewRule(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.groupShiftRuleService.previewRuleApplication(+id, startDate, endDate);
  }
}