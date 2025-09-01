import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { OrganizationNode } from './entities/organization-node.entity';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(OrganizationNode)
    private organizationNodeRepository: Repository<OrganizationNode>,
  ) {}

  // 获取完整的组织架构树
  async getOrganizationTree(): Promise<OrganizationNode[]> {
    const nodes = await this.organizationNodeRepository.find({
      relations: ['children', 'employees'],
      order: { sortOrder: 'ASC' }
    });

    return this.buildTree(nodes);
  }

  // 构建树形结构
  private buildTree(nodes: OrganizationNode[]): OrganizationNode[] {
    const nodeMap = new Map<number, OrganizationNode>();
    const rootNodes: OrganizationNode[] = [];

    // 创建节点映射
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // 构建树形结构
    nodes.forEach(node => {
      const currentNode = nodeMap.get(node.id);
      if (currentNode) {
        if (node.parentId) {
          const parentNode = nodeMap.get(node.parentId);
          if (parentNode) {
            parentNode.children.push(currentNode);
          }
        } else {
          rootNodes.push(currentNode);
        }
      }
    });

    return rootNodes;
  }

  // 创建组织节点
  async createNode(nodeData: Partial<OrganizationNode>): Promise<OrganizationNode> {
    // 检查同一层级下是否已存在相同名称的节点
    const existingNode = await this.organizationNodeRepository.findOne({
      where: {
        name: nodeData.name,
        parentId: nodeData.parentId ? nodeData.parentId : IsNull()
      }
    });

    if (existingNode) {
      throw new Error(`在同一层级下已存在名为"${nodeData.name}"的节点`);
    }

    const node = this.organizationNodeRepository.create(nodeData);
    return await this.organizationNodeRepository.save(node);
  }

  // 更新组织节点
  async updateNode(id: number, nodeData: Partial<OrganizationNode>): Promise<OrganizationNode | null> {
    await this.organizationNodeRepository.update(id, nodeData);
    return await this.organizationNodeRepository.findOne({ 
      where: { id },
      relations: ['children', 'employees']
    });
  }

  // 删除组织节点
  async deleteNode(id: number): Promise<void> {
    // 检查是否有子节点
    const childrenCount = await this.organizationNodeRepository.count({
      where: { parentId: id }
    });

    if (childrenCount > 0) {
      throw new Error('无法删除有子节点的组织节点');
    }

    // 检查是否有员工
    const node = await this.organizationNodeRepository.findOne({
      where: { id },
      relations: ['employees']
    });

    if (node && node.employees && node.employees.length > 0) {
      throw new Error('无法删除有员工的组织节点');
    }

    await this.organizationNodeRepository.delete(id);
  }

  // 获取单个节点详情
  async getNodeById(id: number): Promise<OrganizationNode | null> {
    return await this.organizationNodeRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'employees']
    });
  }

  // 获取所有节点（扁平化）
  async getAllNodes(): Promise<OrganizationNode[]> {
    return await this.organizationNodeRepository.find({
      relations: ['employees'],
      order: { sortOrder: 'ASC' }
    });
  }

  // 调试方法：获取原始数据
  async getRawData() {
    const nodes = await this.organizationNodeRepository.find({
      relations: ['children', 'employees', 'parent'],
      order: { id: 'ASC' }
    });
    
    return {
      totalCount: nodes.length,
      nodes: nodes.map(node => ({
        id: node.id,
        name: node.name,
        parentId: node.parentId,
        type: node.type,
        level: node.level,
        maxCount: node.maxCount,
        childrenCount: node.children ? node.children.length : 0,
        employeesCount: node.employees ? node.employees.length : 0,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt
      }))
    };
  }
}
