import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Put } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupShiftService, GroupShiftRequest } from './group-shift.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('group')
export class GroupController {
  constructor(
    private readonly groupService: GroupService,
    private readonly groupShiftService: GroupShiftService,
  ) {}

  @Post()
  create(@Body() createGroupDto: CreateGroupDto) {
    return this.groupService.create(createGroupDto);
  }

  @Get()
  findAll() {
    return this.groupService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupService.update(+id, updateGroupDto);
  }

  @Put(':id')
  updateByPut(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto) {
    return this.groupService.update(+id, updateGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.groupService.remove(+id);
  }

  // 编组值班相关接口
  @Post(':id/shifts/generate')
  async generateGroupShifts(
    @Param('id') id: string,
    @Body() request: Omit<GroupShiftRequest, 'groupId'>
  ) {
    const groupShiftRequest: GroupShiftRequest = {
      ...request,
      groupId: +id,
    };
    return this.groupShiftService.generateGroupShifts(groupShiftRequest);
  }

  @Get(':id/shifts/history')
  async getGroupShiftHistory(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string
  ) {
    return this.groupShiftService.getGroupShiftHistory(+id, startDate, endDate, limit ? +limit : 50);
  }

  @Get(':id/members')
  async getGroupMembers(@Param('id') id: string) {
    return this.groupShiftService.getGroupMembers(+id);
  }

  @Get(':id/availability')
  async getGroupAvailability(
    @Param('id') id: string,
    @Query('date') date: string
  ) {
    return this.groupShiftService.getGroupAvailability(+id, date);
  }

  @Post(':id/shifts/save')
  async saveGroupShiftAssignment(
    @Param('id') id: string,
    @Body() assignment: any
  ) {
    return this.groupShiftService.saveGroupShiftHistory(assignment);
  }
}