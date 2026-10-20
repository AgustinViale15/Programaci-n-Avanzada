import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ActivationStatus } from '@poc/contracts';

export type ActivationDocument = Activation & Document;

@Schema({ timestamps: true })
export class Activation {
  @Prop({ required: true, unique: true, index: true })
  correlationId: string;

  @Prop({ required: true })
  clientDocument: string;

  @Prop({ required: true })
  serviceType: string;

  @Prop({ required: true, default: false })
  isSimulated: boolean;

  @Prop({
    required: true,
    enum: Object.values(ActivationStatus),
    default: ActivationStatus.PENDING,
  })
  status: string;

  @Prop({ default: null })
  billingStatus: string;

  @Prop({ default: null })
  provisioningStatus: string;

  @Prop({ type: [String], default: [] })
  processedEventIds: string[];

  @Prop({ default: null })
  failureReason: string;
}

export const ActivationSchema = SchemaFactory.createForClass(Activation);
