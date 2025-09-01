import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { SimplifiedScheduleEngineService, SimplifiedScheduleRequest, RoleBasedScheduleRequest } from './simplified-schedule-engine.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('simplified-schedule-engine')
export class SimplifiedScheduleEngineController {
  constructor(
    private readonly scheduleEngineService: SimplifiedScheduleEngineService,
  ) {}

  /**
   * 简化的排班生成接口
   * 只需要提供规则ID和时间范围，系统自动根据规则生成排班
   */
  @Post('generate')
  async generateSchedule(@Body() request: SimplifiedScheduleRequest) {
    return await this.scheduleEngineService.generateSchedule(request);
  }

  /**
   * 获取排班预览
   * 在实际生成前预览排班结果
   */
  @Post('preview')
  async previewSchedule(@Body() request: SimplifiedScheduleRequest) {
    // 预览逻辑可以复用生成逻辑，但不保存到数据库
    const result = await this.scheduleEngineService.generateSchedule(request);
    
    return {
      ...result,
      message: '这是预览结果，未保存到数据库'
    };
  }

  /**
   * 获取规则的排班能力检查
   * 检查规则是否能够正常生成排班
   */
  @Get('check-rule/:ruleId')
  async checkRuleCapability(@Param('ruleId') ruleId: number) {
    // 检查规则的完整性和可用性
    const testRequest: SimplifiedScheduleRequest = {
      ruleId,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 未来7天
    };

    const result = await this.scheduleEngineService.generateSchedule(testRequest);
    
    return {
      ruleId,
      canGenerate: result.success,
      issues: result.conflicts,
      message: result.message,
      testPeriod: '7天测试期间'
    };
  }

  /**
   * 基于值班角色的排班生成
   * 新的排班方式：直接使用值班角色配置生成排班
   */
  @Post('generate-by-roles')
  async generateByRoles(@Body() request: RoleBasedScheduleRequest) {
    return await this.scheduleEngineService.generateRoleBasedSchedule(request);
  }

  /**
   * 获取所有可用的值班角色
   */
  @Get('available-roles')
  async getAvailableRoles() {
    // 这个方法可以帮助前端获取可用的角色列表
    return await this.scheduleEngineService.getAvailableRoles();
  }
}