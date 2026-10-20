import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ActivationGateway {
  @WebSocketServer()
  server: Server;

  emitStatusUpdate(correlationId: string, status: string, payload: any) {
    if (this.server) {
      this.server.emit('activation.status', {
        correlationId,
        status,
        timestamp: new Date().toISOString(),
        payload,
      });
    }
  }
}
