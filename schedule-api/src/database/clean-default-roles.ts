import { DataSource } from 'typeorm';
import { ShiftRole } from '../shift-role/entities/shift-role.entity';

export async function cleanDefaultRoles(dataSource: DataSource) {
  const shiftRoleRepository = dataSource.getRepository(ShiftRole);

  // 删除默认创建的角色
  const defaultRoleNames = ['值班员', '值班领导', '值班组', '值班医生', '值班护士'];
  
  for (const roleName of defaultRoleNames) {
    try {
      const existingRole = await shiftRoleRepository.findOne({ where: { name: roleName } });
      if (existingRole) {
        await shiftRoleRepository.remove(existingRole);
        console.log(`已删除默认角色: ${roleName}`);
      }
    } catch (error) {
      console.error(`删除角色 ${roleName} 失败:`, error);
    }
  }
  
  console.log('默认角色清理完成');
}