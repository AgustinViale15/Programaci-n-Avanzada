import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { Activation, ActivationDocument } from './activation.schema';
import { ActivationGateway } from './activation.gateway';
import {
  ActivationStatus,
  EventEnvelope,
  ActivationRequestedPayload,
  BillingCompletedPayload,
  BillingFailedPayload,
  ProvisioningCompletedPayload,
  ProvisioningFailedPayload,
  ActivationCompletedPayload,
  ActivationFailedPayload,
} from '@poc/contracts';

@Injectable()
export class ActivationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivationService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(
    @InjectModel(Activation.name)
    private activationModel: Model<ActivationDocument>,
    private gateway: ActivationGateway,
  ) {
    this.kafka = new Kafka({
      clientId: 'activation-api-producer',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka Producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async createActivation(clientDocument: string, serviceType: string, isSimulated = false) {
    const correlationId = uuidv4();

    const activation = new this.activationModel({
      correlationId,
      clientDocument,
      serviceType,
      isSimulated,
      status: ActivationStatus.PENDING,
      processedEventIds: [],
    });
    await activation.save();

    const event: EventEnvelope<ActivationRequestedPayload> = {
      eventId: uuidv4(),
      eventType: 'activation.requested',
      correlationId,
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        correlationId,
        clientDocument,
        serviceType,
        isSimulated,
      },
    };

    await this.producer.send({
      topic: 'activation.requested',
      messages: [{ key: correlationId, value: JSON.stringify(event) }],
    });

    this.logger.log(`Activation requested emitted for ${correlationId}`);
    this.gateway.emitStatusUpdate(correlationId, ActivationStatus.PENDING, event.payload);

    return { correlationId, status: ActivationStatus.PENDING };
  }

  async getStatus(correlationId: string) {
    return this.activationModel.findOne({ correlationId }).exec();
  }

  async handleBillingCompleted(event: EventEnvelope<BillingCompletedPayload>) {
    const { correlationId, eventId } = event;
    const doc = await this.activationModel.findOne({ correlationId });
    if (!doc || doc.processedEventIds.includes(eventId)) return;

    doc.billingStatus = 'COMPLETED';
    doc.processedEventIds.push(eventId);
    await doc.save();

    this.gateway.emitStatusUpdate(correlationId, 'BILLING_COMPLETED', event.payload);
    await this.evaluateSaga(correlationId);
  }

  async handleBillingFailed(event: EventEnvelope<BillingFailedPayload>) {
    const { correlationId, eventId, payload } = event;
    const doc = await this.activationModel.findOne({ correlationId });
    if (!doc || doc.processedEventIds.includes(eventId)) return;

    doc.billingStatus = 'FAILED';
    doc.status = ActivationStatus.FAILED;
    doc.failureReason = payload.reason;
    doc.processedEventIds.push(eventId);
    await doc.save();

    this.gateway.emitStatusUpdate(correlationId, ActivationStatus.FAILED, payload);
    await this.emitActivationFailed(correlationId, payload.reason);
  }

  async handleProvisioningCompleted(event: EventEnvelope<ProvisioningCompletedPayload>) {
    const { correlationId, eventId } = event;
    const doc = await this.activationModel.findOne({ correlationId });
    if (!doc || doc.processedEventIds.includes(eventId)) return;

    doc.provisioningStatus = 'COMPLETED';
    doc.processedEventIds.push(eventId);
    await doc.save();

    this.gateway.emitStatusUpdate(correlationId, 'PROVISIONING_COMPLETED', event.payload);
    await this.evaluateSaga(correlationId);
  }

  async handleProvisioningFailed(event: EventEnvelope<ProvisioningFailedPayload>) {
    const { correlationId, eventId, payload } = event;
    const doc = await this.activationModel.findOne({ correlationId });
    if (!doc || doc.processedEventIds.includes(eventId)) return;

    doc.provisioningStatus = 'FAILED';
    doc.status = ActivationStatus.FAILED;
    doc.failureReason = payload.reason;
    doc.processedEventIds.push(eventId);
    await doc.save();

    this.gateway.emitStatusUpdate(correlationId, ActivationStatus.FAILED, payload);
    await this.emitActivationFailed(correlationId, payload.reason);
  }

  private async evaluateSaga(correlationId: string) {
    const doc = await this.activationModel.findOne({ correlationId });
    if (!doc || doc.status !== ActivationStatus.PENDING) return;

    if (doc.billingStatus === 'COMPLETED' && doc.provisioningStatus === 'COMPLETED') {
      doc.status = ActivationStatus.COMPLETED;
      await doc.save();

      const event: EventEnvelope<ActivationCompletedPayload> = {
        eventId: uuidv4(),
        eventType: 'activation.completed',
        correlationId,
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          correlationId,
          clientDocument: doc.clientDocument,
          completedAt: new Date().toISOString(),
        },
      };

      await this.producer.send({
        topic: 'activation.events',
        messages: [{ key: correlationId, value: JSON.stringify(event) }],
      });

      this.logger.log(`Saga completed successfully for ${correlationId}`);
      this.gateway.emitStatusUpdate(correlationId, ActivationStatus.COMPLETED, event.payload);
    }
  }

  private async emitActivationFailed(correlationId: string, reason: string) {
    const doc = await this.activationModel.findOne({ correlationId });
    const event: EventEnvelope<ActivationFailedPayload> = {
      eventId: uuidv4(),
      eventType: 'activation.failed',
      correlationId,
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        correlationId,
        reason,
        clientDocument: doc?.clientDocument || '',
      },
    };

    await this.producer.send({
      topic: 'activation.events',
      messages: [{ key: correlationId, value: JSON.stringify(event) }],
    });

    this.logger.warn(`Saga failed for ${correlationId}: ${reason}`);
  }
}
