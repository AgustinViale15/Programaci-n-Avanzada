import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BillingService } from './billing.service';
import { EventEnvelope } from '@poc/contracts';

@Controller()
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  @MessagePattern('activation.requested')
  async handleActivationRequested(@Payload() message: any) {
    try {
      const event: EventEnvelope<any> = typeof message === 'string' ? JSON.parse(message) : message;
      await this.billingService.processActivationRequested(event);
    } catch (error) {
      this.logger.error(`Error en BillingController: ${error.message}`);
    }
  }
}