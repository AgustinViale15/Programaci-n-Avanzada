import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProvisioningService } from './provisioning.service';
import { EventEnvelope } from '@poc/contracts';

@Controller()
export class ProvisioningController {
  private readonly logger = new Logger(ProvisioningController.name);

  constructor(private readonly provisioningService: ProvisioningService) {}

  @MessagePattern('activation.requested')
  async handleActivationRequested(@Payload() message: any) {
    try {
      const event: EventEnvelope<any> = typeof message === 'string' ? JSON.parse(message) : message;
      await this.provisioningService.processActivationRequested(event);
    } catch (error) {
      this.logger.error(`Error en ProvisioningController: ${error.message}`);
    }
  }
}