import { DataSource } from 'typeorm';
import { OrganizationNode } from '../organization/entities/organization-node.entity';

export async function cleanDuplicateNodes(dataSource: DataSource) {
    const repo = dataSource.getRepository(OrganizationNode);
  const nodes = await repo.find({ order: { id: 'ASC' } });
  
  const seen = new Set<string>();
  const toDelete: number[] = [];
  
  for (const node of nodes) {
    const key = `${node.name}_${node.parentId || 'null'}`;
    if (seen.has(key)) {
      toDelete.push(node.id);
      console.log(`标记删除重复节点: ${node.name} (ID: ${node.id})`);
    } else {
      seen.add(key);
    }
  }
  
  for (const id of toDelete) {
    await repo.delete(id);
  }
  
  }