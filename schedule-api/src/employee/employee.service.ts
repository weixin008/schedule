import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { OrganizationNode } from '../organization/entities/organization-node.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(OrganizationNode)
    private organizationNodeRepository: Repository<OrganizationNode>,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto, organizationId?: string) {
    try {
      const employeeData: any = {
        ...createEmployeeDto,
        level: typeof createEmployeeDto.level === 'string' ? parseInt(createEmployeeDto.level) : createEmployeeDto.level || 3,
        status: (createEmployeeDto.status as 'ON_DUTY' | 'LEAVE' | 'BUSINESS_TRIP' | 'TRANSFER' | 'RESIGNED') || 'ON_DUTY',
        isLongTerm: createEmployeeDto.isLongTerm || false,
        organizationId: organizationId || 'default' // 设置组织ID
      };

      // 只在有值时设置日期字段
      if (createEmployeeDto.status !== 'ON_DUTY' && createEmployeeDto.statusStartDate) {
        employeeData.statusStartDate = new Date(createEmployeeDto.statusStartDate);
      }
      
      if (!createEmployeeDto.isLongTerm && createEmployeeDto.statusEndDate) {
        employeeData.statusEndDate = new Date(createEmployeeDto.statusEndDate);
      }
      const employee = this.employeeRepository.create(employeeData);
      const result = await this.employeeRepository.save(employee);
      return result;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE')) {
        throw new ConflictException('员工工号已存在');
      }
      throw new InternalServerErrorException('创建员工失败，请检查数据格式是否正确');
    }
  }

  async findAll(organizationId?: string) {
    const whereCondition = organizationId ? { organizationId } : {};
    return this.employeeRepository.find({
      where: whereCondition,
      relations: ['groups', 'departmentInfo', 'positionInfo', 'organizationNode']
    });
  }

  async findOne(id: number, organizationId?: string) {
    const whereCondition = organizationId ? { id, organizationId } : { id };
    return this.employeeRepository.findOne({
      where: whereCondition,
      relations: ['groups', 'departmentInfo', 'positionInfo']
    });
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto, organizationId?: string) {
        const whereCondition = organizationId ? { id, organizationId } : { id };
    const existing = await this.employeeRepository.findOne({ where: whereCondition });
    if (!existing) {
      throw new NotFoundException(`Employee #${id} not found`);
    }

    try {
      const updateData: any = {
        ...updateEmployeeDto,
        level: typeof updateEmployeeDto.level === 'string' ? parseInt(updateEmployeeDto.level) : updateEmployeeDto.level,
        isLongTerm: updateEmployeeDto.isLongTerm || false
      };

      // 显式处理 organizationNodeId，确保 null 值被正确处理
      if (updateEmployeeDto.hasOwnProperty('organizationNodeId')) {
        updateData.organizationNodeId = updateEmployeeDto.organizationNodeId;
      }

      // 处理状态日期字段
      if (updateEmployeeDto.status === 'ON_DUTY') {
        // 在岗状态清除所有状态日期
        updateData.statusStartDate = null;
        updateData.statusEndDate = null;
        updateData.isLongTerm = false;
      } else {
        // 非在岗状态处理日期
        if (updateEmployeeDto.statusStartDate) {
          updateData.statusStartDate = new Date(updateEmployeeDto.statusStartDate);
        }
        
        if (updateEmployeeDto.isLongTerm) {
          updateData.statusEndDate = null;
        } else if (updateEmployeeDto.statusEndDate) {
          updateData.statusEndDate = new Date(updateEmployeeDto.statusEndDate);
        }
      }

            // 使用 save 方法而不是 update，因为 save 方法对 null 值处理更好
      const employeeToUpdate = await this.employeeRepository.findOneBy({ id });
      if (!employeeToUpdate) {
        throw new NotFoundException(`Employee #${id} not found`);
      }
      Object.assign(employeeToUpdate, updateData);
      
      const result = await this.employeeRepository.save(employeeToUpdate);
            return result;
    } catch (error: any) {
      console.error(`更新员工 ${id} 失败:`, error);
      throw new InternalServerErrorException(`更新员工失败: ${error.message}`);
    }
  }

  async remove(id: number, organizationId?: string) {
    const whereCondition = organizationId ? { id, organizationId } : { id };
    const existing = await this.employeeRepository.findOne({ where: whereCondition });
    if (!existing) {
      throw new NotFoundException(`员工不存在或无权限删除`);
    }

    // 检查员工的关联数据
    const conflicts = await this.checkEmployeeDeletionConflicts(id);
    
    if (conflicts.hasConflicts) {
      // 如果有冲突，返回详细的冲突信息
      const conflictMessage = this.buildConflictMessage(existing.name, conflicts);
      throw new ConflictException(conflictMessage);
    }

    // 如果没有严重冲突，执行删除
    return this.employeeRepository.delete(id);
  }

  // 检查员工删除的冲突（公开方法）
  async checkEmployeeDeletionConflicts(employeeId: number) {
    const conflicts: {
      hasConflicts: boolean;
      shiftRoles: any[];
      futureSchedules: any[];
      groups: any[];
      canAutoResolve: boolean;
      employee: any;
    } = {
      hasConflicts: false,
      shiftRoles: [],
      futureSchedules: [],
      groups: [],
      canAutoResolve: true,
      employee: null
    };

    try {
      // 获取员工信息
      const employee = await this.employeeRepository.findOne({ 
        where: { id: employeeId },
        select: ['id', 'name', 'username']
      });
      
      if (!employee) {
        throw new NotFoundException('员工不存在');
      }
      
      conflicts.employee = employee;

      // 检查值班角色中的员工（检查personnelOrder字段）
      const shiftRoles = await this.employeeRepository.query(`
        SELECT sr.id, sr.name, sr.description, sr.personnelOrder
        FROM shift_role sr 
        WHERE sr.personnelOrder IS NOT NULL AND sr.personnelOrder != ''
      `);

      // 过滤包含该员工ID的角色
      const rolesWithEmployee = shiftRoles.filter(role => {
        if (!role.personnelOrder) return false;
        try {
          // personnelOrder是逗号分隔的字符串，需要解析
          const orderArray = role.personnelOrder.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          return orderArray.includes(employeeId);
        } catch (error) {
          return false;
        }
      });

      if (rolesWithEmployee && rolesWithEmployee.length > 0) {
        conflicts.shiftRoles = rolesWithEmployee.map(role => ({
          id: role.id,
          name: role.name,
          description: role.description
        }));
        conflicts.hasConflicts = true;
        // 值班角色可以自动处理
      }
      
      // 检查未来的排班记录
      const futureSchedules = await this.employeeRepository.query(`
        SELECT s.id, s.date, s.shiftId, s.roleId, 
               sh.name as shiftName, sr.name as roleName
        FROM schedule s 
        LEFT JOIN shift sh ON s.shiftId = sh.id
        LEFT JOIN shift_role sr ON s.roleId = sr.id
        WHERE s.assignedPersonId = ? AND s.date >= date('now')
        ORDER BY s.date ASC
        LIMIT 10
      `, [employeeId]);

      if (futureSchedules && futureSchedules.length > 0) {
        conflicts.futureSchedules = futureSchedules.map(schedule => ({
          id: schedule.id,
          date: schedule.date,
          shiftName: schedule.shiftName || '未知班次',
          roleName: schedule.roleName || '未知角色'
        }));
        conflicts.hasConflicts = true;
        conflicts.canAutoResolve = false; // 未来排班需要手动处理
      }

      // 检查员工分组
      const employeeGroups = await this.employeeRepository.query(`
        SELECT eg.groupId, g.name as groupName, g.type as groupType
        FROM employee_group eg
        LEFT JOIN "group" g ON eg.groupId = g.id
        WHERE eg.employeeId = ?
      `, [employeeId]);

      if (employeeGroups && employeeGroups.length > 0) {
        conflicts.groups = employeeGroups.map(group => ({
          id: group.groupId,
          name: group.groupName || '未命名分组',
          type: group.groupType
        }));
        conflicts.hasConflicts = true;
        // 分组可以自动处理
      }

    } catch (error) {
      console.error('检查员工删除冲突时出错:', error);
      throw error;
    }

    return conflicts;
  }

  // 构建冲突提示消息
  private buildConflictMessage(employeeName: string, conflicts: any): string {
    let message = `无法删除员工"${employeeName}"，该员工存在以下关联数据：\n\n`;

    if (conflicts.shiftRoles && conflicts.shiftRoles.length > 0) {
      message += `🎯 值班角色 (${conflicts.shiftRoles.length} 个)：\n`;
      conflicts.shiftRoles.forEach(role => {
        message += `  • ${role.name}\n`;
      });
      message += '\n';
    }

    if (conflicts.futureSchedules && conflicts.futureSchedules.length > 0) {
      message += `📅 未来排班记录 (${conflicts.futureSchedules.length} 条)：\n`;
      conflicts.futureSchedules.slice(0, 3).forEach(schedule => {
        message += `  • ${schedule.date} - ${schedule.shiftName} (${schedule.roleName})\n`;
      });
      if (conflicts.futureSchedules.length > 3) {
        message += `  • 还有 ${conflicts.futureSchedules.length - 3} 条记录...\n`;
      }
      message += '\n';
    }

    if (conflicts.groups && conflicts.groups.length > 0) {
      message += `👥 员工分组 (${conflicts.groups.length} 个)：\n`;
      conflicts.groups.forEach(group => {
        message += `  • ${group.name}\n`;
      });
      message += '\n';
    }

    message += '💡 处理建议：\n';
    
    if (conflicts.shiftRoles && conflicts.shiftRoles.length > 0) {
      message += '1. 需要先从值班角色中移除该员工\n';
    }
    
    if (conflicts.futureSchedules && conflicts.futureSchedules.length > 0) {
      message += '2. 处理未来的排班安排（安排替班人员）\n';
    }
    
    if (conflicts.groups && conflicts.groups.length > 0) {
      message += '3. 从相关分组中移除该员工\n';
    }
    
    message += '\n您也可以选择将员工状态设置为"离职"，这样可以保留历史记录。';

    return message;
  }

  // 智能删除员工（处理关联数据）
  async smartRemove(id: number, organizationId?: string, options: { 
    autoRemoveFromRoles?: boolean;
    autoRemoveFromGroups?: boolean;
    setResignedInsteadOfDelete?: boolean;
    forceDelete?: boolean;
  } = {}) {
    const whereCondition = organizationId ? { id, organizationId } : { id };
    const existing = await this.employeeRepository.findOne({ where: whereCondition });
    if (!existing) {
      throw new NotFoundException(`员工不存在或无权限删除`);
    }

    const conflicts = await this.checkEmployeeDeletionConflicts(id);
    const actions: string[] = [];

    // 如果有未来排班且不是强制删除，建议设置为离职状态
    if (conflicts.futureSchedules && conflicts.futureSchedules.length > 0 && !options.forceDelete) {
      if (options.setResignedInsteadOfDelete) {
        // 设置为离职状态
        await this.employeeRepository.update(id, {
          status: 'RESIGNED',
          statusStartDate: new Date(),
          statusEndDate: null,
          isLongTerm: true
        });
        
        // 仍然需要处理其他关联数据
        if (options.autoRemoveFromRoles && conflicts.shiftRoles && conflicts.shiftRoles.length > 0) {
          await this.removeEmployeeFromShiftRoles(id);
          actions.push(`从 ${conflicts.shiftRoles.length} 个值班角色中移除`);
        }
        
        if (options.autoRemoveFromGroups && conflicts.groups && conflicts.groups.length > 0) {
          await this.removeEmployeeFromGroups(id);
          actions.push(`从 ${conflicts.groups.length} 个分组中移除`);
        }
        
        return { 
          success: true, 
          action: 'resigned',
          message: `员工"${existing.name}"已设置为离职状态，保留了历史排班记录。${actions.length > 0 ? '同时' + actions.join('，') + '。' : ''}`
        };
      } else {
        throw new ConflictException(this.buildConflictMessage(existing.name, conflicts));
      }
    }

    // 自动处理可以解决的冲突
    if (options.autoRemoveFromRoles && conflicts.shiftRoles && conflicts.shiftRoles.length > 0) {
      await this.removeEmployeeFromShiftRoles(id);
      actions.push(`从 ${conflicts.shiftRoles.length} 个值班角色中移除`);
    }
    
    if (options.autoRemoveFromGroups && conflicts.groups && conflicts.groups.length > 0) {
      await this.removeEmployeeFromGroups(id);
      actions.push(`从 ${conflicts.groups.length} 个分组中移除`);
    }

    // 如果强制删除，先删除未来排班记录
    if (options.forceDelete && conflicts.futureSchedules && conflicts.futureSchedules.length > 0) {
      await this.employeeRepository.query(`
        DELETE FROM schedule WHERE assignedPersonId = ? AND date >= date('now')
      `, [id]);
      actions.push(`删除 ${conflicts.futureSchedules.length} 条未来排班记录`);
    }

    // 执行删除
    await this.employeeRepository.delete(id);
    return { 
      success: true, 
      action: 'deleted',
      message: `员工"${existing.name}"已成功删除。${actions.length > 0 ? '同时' + actions.join('，') + '。' : ''}`
    };
  }

  // 从值班角色中移除员工
  private async removeEmployeeFromShiftRoles(employeeId: number) {
    const shiftRoles = await this.employeeRepository.query(`
      SELECT id, personnelOrder FROM shift_role 
      WHERE personnelOrder IS NOT NULL AND personnelOrder != ''
    `);

    for (const role of shiftRoles) {
      try {
        if (!role.personnelOrder) continue;
        
        // 解析personnelOrder（逗号分隔的字符串）
        const orderArray = role.personnelOrder.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        
        // 如果包含要删除的员工ID，则移除
        if (orderArray.includes(employeeId)) {
          const newOrderArray = orderArray.filter(id => id !== employeeId);
          const newPersonnelOrder = newOrderArray.length > 0 ? newOrderArray.join(',') : null;
          
          await this.employeeRepository.query(`
            UPDATE shift_role SET personnelOrder = ? WHERE id = ?
          `, [newPersonnelOrder, role.id]);
        }
      } catch (error) {
        console.error(`更新值班角色 ${role.id} 失败:`, error);
      }
    }
  }

  // 从分组中移除员工
  private async removeEmployeeFromGroups(employeeId: number) {
    await this.employeeRepository.query(`
      DELETE FROM employee_group WHERE employeeId = ?
    `, [employeeId]);
  }

  // 导出员工信息到Excel
  async exportToExcel(): Promise<Buffer> {
        const employees = await this.employeeRepository.find({
      relations: ['organizationNode']
    });
        const exportData = employees.map(emp => ({
      '姓名': emp.name,
      '工号': emp.employeeNumber || '',
      '电话': emp.phone || '',
      '入职日期': emp.joinDate ? emp.joinDate.toISOString().split('T')[0] : '',
      '状态': this.getStatusText(emp.status),
      '所属职位': emp.organizationNode ? emp.organizationNode.name : '',
      '级别': emp.level,
      '标签': emp.tags ? emp.tags.join(',') : ''
    }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '员工信息');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return buffer;
  }

  // 生成导入模板
  async generateTemplate(): Promise<Buffer> {
    const templateData = [
      {
        '姓名': '张三',
        '工号': 'E001',
        '电话': '13800138000',
        '入职日期': '2024-01-15',
        '状态': 'ON_DUTY',
        '所属职位': '主治医师',
        '级别': '2',
        '标签': '医生,内科'
      },
      {
        '姓名': '李四',
        '工号': 'E002',
        '电话': '13800138001',
        '入职日期': '2024-02-01',
        '状态': 'ON_DUTY',
        '所属职位': '护士长',
        '级别': '3',
        '标签': '护士,外科'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '员工导入模板');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  // 预览导入数据
  async previewImportData(fileBuffer: Buffer): Promise<any[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // 获取所有组织节点用于匹配
    const organizationNodes = await this.organizationNodeRepository.find();
    const nodeMap = new Map(organizationNodes.map(node => [node.name, node]));

    return jsonData.map((row: any) => ({
      name: row['姓名'] || '',
      employeeNumber: row['工号'] || '',
      phone: row['电话'] || '',
      joinDate: row['入职日期'] || '',
      status: this.parseStatus(row['状态']) || 'ON_DUTY',
      organizationNodeName: row['所属职位'] || '',
      organizationNodeId: nodeMap.get(row['所属职位'])?.id || null,
      level: parseInt(row['级别']) || 3,
      tags: row['标签'] ? row['标签'].split(',').map(tag => tag.trim()) : []
    }));
  }

  // 批量导入员工
  async batchImport(employees: any[]): Promise<{ success: number; failed: number; errors: any[] }> {
    const result: { success: number; failed: number; errors: any[] } = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < employees.length; i++) {
      try {
        const employeeData = employees[i];
        
        // 验证必填字段
        if (!employeeData.name) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            field: '姓名',
            error: '姓名不能为空'
          });
          continue;
        }

        // 生成用户名（如果没有工号，使用姓名）
        const username = employeeData.employeeNumber || employeeData.name;

        // 检查用户名是否已存在
        const existingEmployee = await this.employeeRepository.findOne({
          where: { username }
        });

        if (existingEmployee) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            field: '工号',
            error: '工号已存在'
          });
          continue;
        }

        // 创建员工数据
        const createData: any = {
          name: employeeData.name,
          username: username,
          employeeNumber: employeeData.employeeNumber,
          phone: employeeData.phone,
          status: employeeData.status || 'ON_DUTY',
          level: employeeData.level || 3,
          tags: employeeData.tags,
          organizationNodeId: employeeData.organizationNodeId
        };

        // 处理入职日期
        if (employeeData.joinDate) {
          createData.joinDate = new Date(employeeData.joinDate);
        }

        await this.employeeRepository.save(createData);
        result.success++;

      } catch (error) {
        result.failed++;
        result.errors.push({
          row: i + 1,
          field: '系统',
          error: error.message || '创建失败'
        });
      }
    }

    return result;
  }

  // 状态文本转换
  private getStatusText(status: string): string {
    const statusMap = {
      'ON_DUTY': '在岗',
      'LEAVE': '请假',
      'BUSINESS_TRIP': '出差',
      'TRANSFER': '调动',
      'RESIGNED': '离职'
    };
    return statusMap[status] || status;
  }

  // 解析状态
  private parseStatus(statusText: string): string {
    const statusMap = {
      '在岗': 'ON_DUTY',
      '请假': 'LEAVE',
      '出差': 'BUSINESS_TRIP',
      '调动': 'TRANSFER',
      '离职': 'RESIGNED'
    };
    return statusMap[statusText] || statusText;
  }
}
