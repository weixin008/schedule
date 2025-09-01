import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  async logAction(action: string, entity: string, entityId: any, performedBy: number, before?: any, after?: any) {
    const logEntry = new this.auditModel({
      action,
      entity,
      entityId,
      before,
      after,
      performedBy,
      performedAt: new Date(),
    });
    
    return logEntry.save();
  }

  async getLogs(entity?: string, entityId?: string, action?: string) {
    const filter: any = {};
    if (entity) filter.entity = entity;
    if (entityId) filter.entityId = entityId;
    if (action) filter.action = action;
    
    return this.auditModel.find(filter).sort({ performedAt: -1 }).exec();
  }
}