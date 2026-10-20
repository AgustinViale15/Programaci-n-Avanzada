import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ActivationService } from './activation.service';
import { EventEnvelope } from '@poc/contracts';

@Controller('activations')
export class ActivationController {
  constructor(private readonly service: ActivationService) {}

  @Post()
  async requestActivation(
    @Body() body: { clientDocument: string; serviceType: string; isSimulated?: boolean },
  ) {
    return this.service.createActivation(
      body.clientDocument,
      body.serviceType,
      body.isSimulated || false,
    );
  }

  @Get(':correlationId')
  async getStatus(@Param('correlationId') correlationId: string) {
    return this.service.getStatus(correlationId);
  }

  @MessagePattern('billing.events')
  async onBillingEvent(@Payload() message: any) {
    const event: EventEnvelope<any> = typeof message === 'string' ? JSON.parse(message) : message;
    if (event.eventType === 'billing.completed') {
      await this.service.handleBillingCompleted(event);
    } else if (event.eventType === 'billing.failed') {
      await this.service.handleBillingFailed(event);
    }
  }

  @MessagePattern('provisioning.events')
  async onProvisioningEvent(@Payload() message: any) {
    const event: EventEnvelope<any> = typeof message === 'string' ? JSON.parse(message) : message;
    if (event.eventType === 'provisioning.completed') {
      await this.service.handleProvisioningCompleted(event);
    } else if (event.eventType === 'provisioning.failed') {
      await this.service.handleProvisioningFailed(event);
    }
  }
}
