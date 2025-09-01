import { DataSource } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Department } from '../department/entities/department.entity';
import { Position } from '../position/entities/position.entity';
import { OrganizationNode } from '../organization/entities/organization-node.entity';
import { EmployeeStatus } from '../employee/entities/employee-status.entity';
import { ShiftRole } from '../shift-role/entities/shift-role.entity';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  // 检查是否已有管理员账户
  const existingAdmin = await userRepository.findOne({
    where: { username: 'admin' }
  });
  
  if (!existingAdmin) {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);
    
    const adminUser = userRepository.create({
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      email: 'admin@system.com',
      role: 'admin',
      status: 'active'
    });
    
    await userRepository.save(adminUser);
  }
}

