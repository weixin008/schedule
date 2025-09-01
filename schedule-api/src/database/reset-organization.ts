import { DataSource } from 'typeorm';
import { OrganizationNode } from '../organization/entities/organization-node.entity';
import { Employee } from '../employee/entities/employee.entity';

export async function resetOrganizationData(dataSource: DataSource) {
    const organizationRepository = dataSource.getRepository(OrganizationNode);
  const employeeRepository = dataSource.getRepository(Employee);

  // 清空员工的组织关联
  await employeeRepository.update({}, { organizationNodeId: null });
    // 清空所有组织节点
  await organizationRepository.clear();
    }