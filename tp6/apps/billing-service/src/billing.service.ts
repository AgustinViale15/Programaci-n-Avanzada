import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { Invoice, InvoiceDocument } from './billing.schema';
import {
  EventEnvelope,
  ActivationRequestedPayload,
  BillingCompletedPayload,
  BillingFailedPayload,
} from '@poc/contracts';

@Injectable()
export class BillingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(
    @InjectModel(Invoice.name)
    private invoiceModel: Model<InvoiceDocument>,
  ) {
    this.kafka = new Kafka({
      clientId: 'billing-service-producer',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka Producer conectado en BillingService');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async processActivationRequested(event: EventEnvelope<ActivationRequestedPayload>) {
    const { correlationId, eventId, payload } = event;

    const existing = await this.invoiceModel.findOne({ correlationId });
    if (existing && existing.processedEventIds.includes(eventId)) {
      this.logger.warn(`Evento ${eventId} ya procesado para ${correlationId}. Omitiendo.`);
      return;
    }

    this.logger.log(`Procesando facturación para cliente ${payload.clientDocument} (${correlationId})`);

    // Simulación: DNI terminado en 99 o isSimulated dispara fallo en facturación
    if (payload.clientDocument.endsWith('99') || payload.isSimulated) {
      const failReason = 'Tarjeta rechazada: fondos insuficientes (Simulación DNI 99)';

      const failedEvent: EventEnvelope<BillingFailedPayload> = {
        eventId: uuidv4(),
        eventType: 'billing.failed',
        correlationId,
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          correlationId,
          reason: failReason,
        },
      };

      await this.producer.send({
        topic: 'billing.events',
        messages: [{ key: correlationId, value: JSON.stringify(failedEvent) }],
      });

      this.logger.error(`Facturación fallida emitida para ${correlationId}`);
      return;
    }

    const invoiceId = `INV-${Date.now()}`;
    const invoice = new this.invoiceModel({
      correlationId,
      invoiceId,
      clientDocument: payload.clientDocument,
      amount: 15000,
      status: 'PAID',
      processedEventIds: [eventId],
    });
    await invoice.save();

    const completedEvent: EventEnvelope<BillingCompletedPayload> = {
      eventId: uuidv4(),
      eventType: 'billing.completed',
      correlationId,
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        correlationId,
        invoiceId,
        amount: 15000,
      },
    };

    await this.producer.send({
      topic: 'billing.events',
      messages: [{ key: correlationId, value: JSON.stringify(completedEvent) }],
    });

    this.logger.log(`Factura ${invoiceId} emitida exitosamente para ${correlationId}`);
  }
}