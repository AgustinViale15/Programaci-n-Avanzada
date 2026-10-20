import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProvisioningDocument = Provisioning & Document;

@Schema({ timestamps: true })
export class Provisioning {
  @Prop({ required: true, unique: true, index: true })
  correlationId: string;

  @Prop({ required: true })
  serviceId: string;

  @Prop({ required: true })
  clientDocument: string;

  @Prop({ required: true })
  serviceType: string;

  @Prop({ type: Object, default: {} })
  networkConfig: Record<string, any>;

  @Prop({ required: true })
  status: string;

  @Prop({ type: [String], default: [] })
  processedEventIds: string[];
}

export const ProvisioningSchema = SchemaFactory.createForClass(Provisioning);