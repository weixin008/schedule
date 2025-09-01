import { Controller, Get, Post, Patch, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationNode } from './entities/organization-node.entity';

@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // 获取组织架构树
  @Get('tree')
  async getOrganizationTree() {
    try {
      return await this.organizationService.getOrganizationTree();
    } catch (error) {
      throw new HttpException('获取组织架构失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 获取所有节点（扁平化）
  @Get()
  async getAllNodes() {
    try {
      return await this.organizationService.getAllNodes();
    } catch (error) {
      throw new HttpException('获取组织节点失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 调试接口：获取原始数据
  @Get('debug/raw')
  async getRawData() {
    try {
      return await this.organizationService.getRawData();
    } catch (error) {
      throw new HttpException('获取原始数据失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 获取单个节点详情
  @Get(':id')
  async getNodeById(@Param('id') id: number) {
    try {
      const node = await this.organizationService.getNodeById(id);
      if (!node) {
        throw new HttpException('组织节点不存在', HttpStatus.NOT_FOUND);
      }
      return node;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('获取组织节点失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 创建组织节点
  @Post()
  async createNode(@Body() nodeData: Partial<OrganizationNode>) {
    try {
      return await this.organizationService.createNode(nodeData);
    } catch (error) {
      throw new HttpException('创建组织节点失败', HttpStatus.BAD_REQUEST);
    }
  }

  // 更新组织节点
  @Patch(':id')
  async updateNode(@Param('id') id: number, @Body() nodeData: Partial<OrganizationNode>) {
    try {
      const updatedNode = await this.organizationService.updateNode(id, nodeData);
      if (!updatedNode) {
        throw new HttpException('组织节点不存在', HttpStatus.NOT_FOUND);
      }
      return updatedNode;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('更新组织节点失败', HttpStatus.BAD_REQUEST);
    }
  }

  // 删除组织节点
  @Delete(':id')
  async deleteNode(@Param('id') id: number) {
    try {
      await this.organizationService.deleteNode(id);
      return { message: '删除成功' };
    } catch (error) {
      throw new HttpException(error.message || '删除组织节点失败', HttpStatus.BAD_REQUEST);
    }
  }
}
