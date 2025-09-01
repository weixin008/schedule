import { DataSource } from 'typeorm';
import { OrganizationNode } from '../organization/entities/organization-node.entity';

export async function cleanDuplicateOrganizationNodes(dataSource: DataSource) {
    const organizationRepository = dataSource.getRepository(OrganizationNode);

  // 查找所有节点
  const allNodes = await organizationRepository.find({
    order: { id: 'ASC' }
  });

    // 按照 name + parentId 分组，找出重复的节点
  const nodeGroups = new Map<string, OrganizationNode[]>();
  
  allNodes.forEach(node => {
    const key = `${node.name}_${node.parentId || 'null'}`;
    if (!nodeGroups.has(key)) {
      nodeGroups.set(key, []);
    }
    nodeGroups.get(key)!.push(node);
  });

  let duplicatesFound = 0;
  let duplicatesRemoved = 0;

  // 处理重复的节点组
  for (const [key, nodes] of nodeGroups) {
    if (nodes.length > 1) {
      duplicatesFound += nodes.length - 1;
            // 保留第一个节点，删除其余的
      const [keepNode, ...duplicateNodes] = nodes;
      console.log(`保留节点 ID: ${keepNode.id}, 删除节点 ID: ${duplicateNodes.map(n => n.id).join(', ')}`);
      
      for (const duplicateNode of duplicateNodes) {
        try {
          await organizationRepository.delete(duplicateNode.id);
          duplicatesRemoved++;
          console.log(`已删除重复节点: ${duplicateNode.name} (ID: ${duplicateNode.id})`);
        } catch (error: any) {
          console.error(`删除节点失败 (ID: ${duplicateNode.id}):`, error.message);
        }
      }
    }
  }

  }