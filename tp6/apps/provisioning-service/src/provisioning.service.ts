import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { Provisioning, ProvisioningDocument } from './provisioning.schema';
import {
  EventEnvelope,
  ActivationRequestedPayload,
  ProvisioningCompletedPayload,
  ProvisioningFailedPayload,
} from '@poc/contracts';

@Injectable()
export class ProvisioningService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProvisioningService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(
    @InjectModel(Provisioning.name)
    private provisioningModel: Model<ProvisioningDocument>,
  ) {
    this.kafka = new Kafka({
      clientId: 'provisioning-service-producer',
      brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka Producer conectado en ProvisioningService');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async processActivationRequested(event: EventEnvelope<ActivationRequestedPayload>) {
    const { correlationId, eventId, payload } = event;

    // Idempotencia
    const existing = await this.provisioningModel.findOne({ correlationId });
    if (existing && existing.processedEventIds.includes(eventId)) {
      this.logger.warn(`Evento ${eventId} ya procesado para ${correlationId}. Omitiendo.`);
      return;
    }

    this.logger.log(`Aprovisionando red para cliente ${payload.clientDocument} (${correlationId})`);

    // Regla de simulación de fallo del TP: si el DNI termina en "88", falla el aprovisionamiento
    if (payload.clientDocument.endsWith('88')) {
      const failReason = 'Capacidad de nodo saturada o timeout de red (Simulación DNI 88)';

      const failedEvent: EventEnvelope<ProvisioningFailedPayload> = {
        eventId: uuidv4(),
        eventType: 'provisioning.failed',
        correlationId,
        timestamp: new Date().toISOString(),
        version: 1,
        payload: {
          correlationId,
          reason: failReason,
        },
      };

      await this.producer.send({
        topic: 'provisioning.events',
        messages: [{ key: correlationId, value: JSON.stringify(failedEvent) }],
      });

      this.logger.error(`Aprovisionamiento fallido emitido para ${correlationId}`);
      return;
    }

    // Flujo exitoso
    const serviceId = `SRV-${uuidv4().substring(0, 8).toUpperCase()}`;
    const networkConfig = {
      ipSubnet: '10.200.0.0/24',
      gateway: '10.200.0.1',
      dns: ['1.1.1.1', '8.8.8.8'],
      vlanId: 104,
    };

    const provisioning = new this.provisioningModel({
      correlationId,
      serviceId,
      clientDocument: payload.clientDocument,
      serviceType: payload.serviceType,
      networkConfig,
      status: 'PROVISIONED',
      processedEventIds: [eventId],
    });
    await provisioning.save();

    const completedEvent: EventEnvelope<ProvisioningCompletedPayload> = {
      eventId: uuidv4(),
      eventType: 'provisioning.completed',
      correlationId,
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        correlationId,
        serviceId,
        networkConfig,
      },
    };

    await this.producer.send({
      topic: 'provisioning.events',
      messages: [{ key: correlationId, value: JSON.stringify(completedEvent) }],
    });

    this.logger.log(`Servicio ${serviceId} aprovisionado exitosamente para ${correlationId}`);
  }
}