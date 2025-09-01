import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@UseGuards(AuthGuard, RolesGuard)
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Roles(Role.Admin, Role.Manager)
  create(@Body() createDepartmentDto: CreateDepartmentDto, @Request() req) {
    const organizationId = req.user?.organizationId;
    return this.departmentService.create(createDepartmentDto, organizationId);
  }

  @Get()
  findAll(@Request() req) {
    const organizationId = req.user?.organizationId;
    return this.departmentService.findAll(organizationId);
  }

  @Get('tree')
  findTree(@Request() req) {
    const organizationId = req.user?.organizationId;
    return this.departmentService.findTree(organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(+id);
  }

  @Get(':id/with-positions')
  findWithPositions(@Param('id') id: string) {
    return this.departmentService.findWithPositions(+id);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Manager)
  update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentService.update(+id, updateDepartmentDto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  remove(@Param('id') id: string) {
    return this.departmentService.remove(+id);
  }
}
