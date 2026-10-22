import { z } from 'zod';

export const EstadosEnvioEnum = z.enum([
  'CREADO',
  'INGRESADO_HUB',
  'CLASIFICADO',
  'EN_REPARTO',
  'ENTREGADO',
  'ENTREGA_FALLIDA'
]);
export type EstadoEnvio = z.infer<typeof EstadosEnvioEnum>;

export const MotivosFalloEnum = z.enum([
  'AUSENTE',
  'DIRECCION_INCORRECTA',
  'RECHAZADO',
  'ZONA_INACCESIBLE'
]);
export type MotivoFallo = z.infer<typeof MotivosFalloEnum>;

// Topic: envios.estados
export const EventoEstadoSchema = z.object({
  eventId: z.string().uuid(),
  shipmentId: z.string(),
  tipo: EstadosEnvioEnum,
  motivo: MotivosFalloEnum.optional().nullable(),
  ocurridoEn: z.string().datetime(),
  secuencia: z.number().int().positive(),
  hubId: z.string(),
  zonaId: z.string(),
  repartidorId: z.string().optional().nullable(),
  version: z.number().int().default(1)
});
export type EventoEstado = z.infer<typeof EventoEstadoSchema>;

// Topic: envios.promesas
export const EventoPromesaSchema = z.object({
  eventId: z.string().uuid(),
  shipmentId: z.string(),
  hubId: z.string(),
  zonaId: z.string(),
  venceEn: z.string().datetime(),
  ocurridoEn: z.string().datetime(),
  version: z.number().int().default(1)
});
export type EventoPromesa = z.infer<typeof EventoPromesaSchema>;

// Topic: envios.reprogramaciones
export const DecisionReprogramacionEnum = z.enum(['REPROGRAMADO', 'RETENIDO', 'DEVOLUCION']);
export type DecisionReprogramacion = z.infer<typeof DecisionReprogramacionEnum>;

export const EventoReprogramacionSchema = z.object({
  eventId: z.string().uuid(),
  shipmentId: z.string(),
  intentoNumero: z.number().int(),
  decision: DecisionReprogramacionEnum,
  nuevaFechaEstimada: z.string().datetime().optional().nullable(),
  franjaHoraria: z.enum(['MANANA', 'TARDE']).optional().nullable(),
  motivoOriginal: MotivosFalloEnum,
  ocurridoEn: z.string().datetime(),
  version: z.number().int().default(1)
});
export type EventoReprogramacion = z.infer<typeof EventoReprogramacionSchema>;

// Topic: alertas.sla
export const ReglaSlaEnum = z.enum(['SIN_INGRESO', 'SIN_SALIDA', 'FALLO_EN_DIA_LIMITE', 'VENCIDO']);
export const PrioridadSlaEnum = z.enum(['MEDIA', 'ALTA', 'CRITICA']);
export const EstadoAlertaEnum = z.enum(['ABIERTA', 'CERRADA']);

export const EventoAlertaSlaSchema = z.object({
  alertId: z.string().uuid(),
  shipmentId: z.string(),
  regla: ReglaSlaEnum,
  prioridad: PrioridadSlaEnum,
  estado: EstadoAlertaEnum,
  descripcion: z.string(),
  ocurridoEn: z.string().datetime(),
  venceEn: z.string().datetime(),
  hubId: z.string(),
  zonaId: z.string(),
  version: z.number().int().default(1)
});
export type EventoAlertaSla = z.infer<typeof EventoAlertaSlaSchema>;

// Topic: notificaciones.enviadas
export const EventoNotificacionSchema = z.object({
  notificationId: z.string().uuid(),
  shipmentId: z.string(),
  tipoAviso: z.enum(['FALLO_AUSENTE', 'FALLO_DIRECCION', 'DEVOLUCION', 'RETRASO_SLA']),
  destinatario: z.string(),
  canal: z.enum(['EMAIL', 'SMS', 'WHATSAPP']),
  mensaje: z.string(),
  opcionesDisponibles: z.array(z.string()).optional(),
  ocurridoEn: z.string().datetime(),
  version: z.number().int().default(1)
});
export type EventoNotificacion = z.infer<typeof EventoNotificacionSchema>;
