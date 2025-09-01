import { Controller, Get, Post, Body, Patch, Param, Delete, Put, BadRequestException } from '@nestjs/common';
import { ShiftRoleService } from './shift-role.service';
import { CreateShiftRoleDto } from './dto/create-shift-role.dto';
import { UpdateShiftRoleDto } from './dto/update-shift-role.dto';

@Controller('shift-roles')
export class ShiftRoleController {
  constructor(private readonly shiftRoleService: ShiftRoleService) {}

  @Post()
  create(@Body() createShiftRoleDto: CreateShiftRoleDto) {
    return this.shiftRoleService.create(createShiftRoleDto);
  }

  @Get()
  findAll() {
    return this.shiftRoleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`Invalid shift role ID: ${id}`);
    }
    return this.shiftRoleService.findOne(numericId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateShiftRoleDto: UpdateShiftRoleDto) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException(`Invalid shift role ID: ${id}`);
    }
    return this.shiftRoleService.update(numericId, updateShiftRoleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shiftRoleService.remove(+id);
  }

  /**
   * 测试角色的人员筛选条件
   */
  @Post(':id/test-criteria')
  async testCriteria(@Param('id') id: string, @Body() body: { date?: string }) {
    const date = body.date || new Date().toISOString().split('T')[0];
    return this.shiftRoleService.testPersonnelSelection(+id, date);
  }

  /**
   * 获取角色的人员排序
   */
  @Get(':id/personnel-order')
  getPersonnelOrder(@Param('id') id: string) {
    return this.shiftRoleService.getPersonnelOrder(+id);
  }

  /**
   * 保存角色的人员排序
   */
  @Post(':id/personnel-order')
  savePersonnelOrder(@Param('id') id: string, @Body() body: { employeeIds: number[] }) {
    return this.shiftRoleService.savePersonnelOrder(+id, body.employeeIds);
  }
}