import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLog } from './schemas/audit-log.schema';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string
  ): Promise<AuditLog[]> {
    return this.auditService.getLogs(entity, entityId, action);
  }
}