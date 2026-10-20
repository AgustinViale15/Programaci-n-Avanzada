import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT) || 1025,
      ignoreTLS: true,
    });
  }

  async sendSuccessEmail(clientDocument: string, correlationId: string) {
    try {
      await this.transporter.sendMail({
        from: '"Sistemas de Activación" <noreply@telecom.poc>',
        to: `cliente_${clientDocument}@example.com`,
        subject: '¡Tu servicio ha sido activado con éxito!',
        html: `
          <h2>¡Felicitaciones!</h2>
          <p>Tu solicitud de servicio para el DNI <b>${clientDocument}</b> fue completada con éxito.</p>
          <p><b>ID de Activación:</b> ${correlationId}</p>
          <hr />
          <small>Prueba de concepto EDA - 2026</small>
        `,
      });
      this.logger.log(`Email de activación exitosa enviado a Mailhog para ${correlationId}`);
    } catch (error) {
      this.logger.error(`Error enviando email de éxito: ${error.message}`);
    }
  }

  async sendFailureEmail(clientDocument: string, correlationId: string, reason: string) {
    try {
      await this.transporter.sendMail({
        from: '"Sistemas de Activación" <soporte@telecom.poc>',
        to: `cliente_${clientDocument}@example.com`,
        subject: 'Problemas con la activación de tu servicio',
        html: `
          <h2>Aviso de Inconveniente</h2>
          <p>Lamentamos informarte que la activación del servicio para el DNI <b>${clientDocument}</b> no pudo completarse.</p>
          <p><b>Motivo:</b> ${reason}</p>
          <p><b>ID de Seguimiento:</b> ${correlationId}</p>
        `,
      });
      this.logger.warn(`Email de fallo enviado a Mailhog para ${correlationId}`);
    } catch (error) {
      this.logger.error(`Error enviando email de fallo: ${error.message}`);
    }
  }
}