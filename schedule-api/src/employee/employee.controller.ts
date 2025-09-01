import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, UseInterceptors, UploadedFile, Res, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  create(@Body() createEmployeeDto: CreateEmployeeDto, @Request() req) {
    const organizationId = req.user?.organizationId;
    return this.employeeService.create(createEmployeeDto, organizationId);
  }

  @Get()
  findAll(@Request() req) {
    const organizationId = req.user?.organizationId;
    return this.employeeService.findAll(organizationId);
  }

  // 导出员工信息 - 必须放在 :id 路由之前
  @Get('export')
  async exportEmployees(@Res() res: Response) {
    try {
      const buffer = await this.employeeService.exportToExcel();
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="employees_${new Date().toISOString().split('T')[0]}.xlsx"`,
      });
      
      res.send(buffer);
    } catch (error) {
      throw new HttpException('导出失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const organizationId = req.user?.organizationId;
    return this.employeeService.findOne(+id, organizationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto, @Request() req) {
    const organizationId = req.user?.organizationId;
    return this.employeeService.update(+id, updateEmployeeDto, organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    const organizationId = req.user?.organizationId;
    return this.employeeService.remove(+id, organizationId);
  }

  // 智能删除员工（处理关联数据）
  @Post(':id/smart-delete')
  smartRemove(@Param('id') id: string, @Body() options: any, @Request() req) {
    const organizationId = req.user?.organizationId;
    return this.employeeService.smartRemove(+id, organizationId, options);
  }

  // 检查员工删除冲突
  @Get(':id/deletion-conflicts')
  checkDeletionConflicts(@Param('id') id: string, @Request() req) {
    const organizationId = req.user?.organizationId;
    return this.employeeService.checkEmployeeDeletionConflicts(+id);
  }

  // 下载导入模板
  @Post('export-template')
  async downloadTemplate(@Body() templateData: any[], @Res() res: Response) {
    try {
      const buffer = await this.employeeService.generateTemplate();
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="employee_template.xlsx"',
      });
      
      res.send(buffer);
    } catch (error) {
      throw new HttpException('模板生成失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 预览导入数据
  @Post('preview-import')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('请上传文件', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.employeeService.previewImportData(file.buffer);
    } catch (error) {
      throw new HttpException('文件解析失败', HttpStatus.BAD_REQUEST);
    }
  }

  // 批量导入员工
  @Post('import')
  async importEmployees(@Body() body: { employees: any[] }) {
    try {
      return await this.employeeService.batchImport(body.employees);
    } catch (error) {
      throw new HttpException('导入失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
