import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { GroupShiftService, GroupShiftRequest } from './group-shift.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('group-shifts')
export class GroupShiftController {
  constructor(private readonly groupShiftService: GroupShiftService) {}

  /**
   * 生成编组值班安排
   */
  @Post('generate')
  async generateGroupShifts(@Body() request: GroupShiftRequest) {
    return this.groupShiftService.generateGroupShifts(request);
  }

  /**
   * 获取编组值班历史
   */
  @Get('history')
  async getGroupShiftHistory(
    @Query('groupId') groupId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string
  ) {
    return this.groupShiftService.getGroupShiftHistory(
      +groupId, 
      startDate, 
      endDate, 
      limit ? +limit : 50
    );
  }

  /**
   * 保存编组值班安排
   */
  @Post('save')
  async saveGroupShiftAssignment(@Body() assignment: any) {
    return this.groupShiftService.saveGroupShiftHistory(assignment);
  }

  /**
   * 获取编组可用性
   */
  @Get('availability')
  async getGroupAvailability(
    @Query('groupId') groupId: string,
    @Query('date') date: string
  ) {
    return this.groupShiftService.getGroupAvailability(+groupId, date);
  }

  /**
   * 批量生成编组值班
   */
  @Post('batch-generate')
  async batchGenerateGroupShifts(@Body() body: {
    requests: GroupShiftRequest[];
    options?: {
      skipConflicts?: boolean;
      autoResolve?: boolean;
    };
  }) {
    const results: Array<{
      request: GroupShiftRequest;
      success: boolean;
      assignments?: any[];
      error?: string;
    }> = [];
    
    for (const request of body.requests) {
      try {
        const assignments = await this.groupShiftService.generateGroupShifts(request);
        results.push({
          request,
          success: true,
          assignments,
        });
      } catch (error: any) {
        results.push({
          request,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      totalRequests: body.requests.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      results,
    };
  }

  /**
   * 编组值班统计
   */
  @Get('statistics')
  async getGroupShiftStatistics(
    @Query('groupId') groupId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    // 这里可以实现编组值班统计逻辑
    return {
      period: { startDate, endDate },
      groupId: groupId ? +groupId : null,
      totalShifts: 0,
      completedShifts: 0,
      averageParticipation: 0,
      memberWorkload: {},
    };
  }
}