import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { EventEnvelope } from '@poc/contracts';

@Controller()
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @MessagePattern('activation.events')
  async handleActivationEvents(@Payload() message: any) {
    try {
      const event: EventEnvelope<any> = typeof message === 'string' ? JSON.parse(message) : message;

      if (event.eventType === 'activation.completed') {
        await this.notificationService.sendSuccessEmail(
          event.payload.clientDocument,
          event.correlationId,
        );
      } else if (event.eventType === 'activation.failed') {
        await this.notificationService.sendFailureEmail(
          event.payload.clientDocument,
          event.correlationId,
          event.payload.reason,
        );
      }
    } catch (error) {
      this.logger.error(`Error en NotificationController: ${error.message}`);
    }
  }
}