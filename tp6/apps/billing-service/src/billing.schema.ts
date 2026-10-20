import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true, index: true })
  correlationId: string;

  @Prop({ required: true })
  invoiceId: string;

  @Prop({ required: true })
  clientDocument: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  status: string;

  @Prop({ type: [String], default: [] })
  processedEventIds: string[];
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);