import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AuditLog extends Document {
  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  entity: string;

  @Prop({ type: Object })
  entityId: any;

  @Prop({ type: Object })
  before: any;

  @Prop({ type: Object })
  after: any;

  @Prop({ required: true })
  performedBy: number; // 操作人ID

  @Prop()
  performedAt: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);