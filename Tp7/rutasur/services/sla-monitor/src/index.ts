import { Kafka } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import {
  EventoEstadoSchema,
  EventoPromesaSchema,
  EventoAlertaSla,
  PrioridadSlaEnum,
  ReglaSlaEnum
} from '@rutasur/shared';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({ clientId: 'rutasur-sla-monitor', brokers: [KAFKA_BROKER] });

const consumer = kafka.consumer({ groupId: 'monitor-sla' });
const producer = kafka.producer();

interface ShipmentTrack {
  shipmentId: string;
  hubId: string;
  zonaId: string;
  venceEn?: number;
  ultimoEstado?: string;
  alertasEmitidas: Set<string>;
  cerrado: boolean;
}

const trackingMap = new Map<string, ShipmentTrack>();

// Función auxiliar para obtener el registro en memoria
function getOrCreateTrack(shipmentId: string): ShipmentTrack {
  let track = trackingMap.get(shipmentId);
  if (!track) {
    track = {
      shipmentId,
      hubId: 'HUB_CENTRAL',
      zonaId: 'ZONA_1',
      alertasEmitidas: new Set<string>(),
      cerrado: false
    };
    trackingMap.set(shipmentId, track);
  }
  return track;
}

async function emitAlert(track: ShipmentTrack, regla: any, prioridad: any, descripcion: string, venceEn: string) {
  if (track.alertasEmitidas.has(regla) || track.cerrado) return;

  track.alertasEmitidas.add(regla);

  const alerta: EventoAlertaSla = {
    alertId: uuidv4(),
    shipmentId: track.shipmentId,
    regla,
    prioridad,
    estado: 'ABIERTA',
    descripcion,
    ocurridoEn: new Date().toISOString(),
    venceEn,
    hubId: track.hubId,
    zonaId: track.zonaId,
    version: 1
  };

  await producer.send({
    topic: 'alertas.sla',
    messages: [{ key: track.shipmentId, value: JSON.stringify(alerta) }]
  });

  console.log(`[SLA Monitor] ALERTA EMITIDA -> [${prioridad}] ${regla} para ${track.shipmentId}: ${descripcion}`);
}

async function closeAlert(track: ShipmentTrack) {
  if (track.cerrado) return;
  track.cerrado = true;

  const alertaCierre: EventoAlertaSla = {
    alertId: uuidv4(),
    shipmentId: track.shipmentId,
    regla: 'VENCIDO',
    prioridad: 'MEDIA',
    estado: 'CERRADA',
    descripcion: 'Envío completado exitosamente. Alertas cerradas.',
    ocurridoEn: new Date().toISOString(),
    venceEn: track.venceEn ? new Date(track.venceEn).toISOString() : new Date().toISOString(),
    hubId: track.hubId,
    zonaId: track.zonaId,
    version: 1
  };

  await producer.send({
    topic: 'alertas.sla',
    messages: [{ key: track.shipmentId, value: JSON.stringify(alertaCierre) }]
  });

  console.log(`[SLA Monitor] Alertas cerradas para envío ENTREGADO: ${track.shipmentId}`);
}

// Evaluación periódica de reglas temporales
async function evaluateAllOpenShipments() {
  const now = Date.now();

  for (const track of trackingMap.values()) {
    if (track.cerrado || !track.venceEn) continue;

    const horasRestantes = (track.venceEn - now) / (1000 * 3600);
    const venceIso = new Date(track.venceEn).toISOString();

    // Regla 1: Vencido
    if (horasRestantes <= 0 && track.ultimoEstado !== 'ENTREGADO') {
      await emitAlert(track, 'VENCIDO', 'CRITICA', 'El plazo de entrega comprometido vencio sin entrega.', venceIso);
      continue;
    }

    // Regla 2: Sin ingreso (< 10h y no ingresó al hub)
    if (horasRestantes < 10 && (!track.ultimoEstado || track.ultimoEstado === 'CREADO')) {
      await emitAlert(track, 'SIN_INGRESO', 'MEDIA', 'Faltan menos de 10h y el paquete aun no ingreso al centro de distribucion.', venceIso);
    }

    // Regla 3: Sin salida (< 4h y no está en reparto)
    if (horasRestantes < 4 && (!track.ultimoEstado || track.ultimoEstado !== 'EN_REPARTO')) {
      await emitAlert(track, 'SIN_SALIDA', 'ALTA', 'Faltan menos de 4h y el envio no se encuentra en reparto.', venceIso);
    }
  }
}

async function start() {
  await producer.connect();
  await consumer.connect();

  await consumer.subscribe({
    topics: ['envios.promesas', 'envios.estados'],
    fromBeginning: false
  });

  console.log('[SLA Monitor] Servicio activo. Escuchando promesas y estados...');

  // Evaluar cada 5 segundos reales (equivalente a 10 minutos simulados con 120x)
  setInterval(() => {
    evaluateAllOpenShipments().catch(console.error);
  }, 5000);

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payloadStr = message.value?.toString() || '';
      try {
        const parsed = JSON.parse(payloadStr);

        if (topic === 'envios.promesas') {
          const res = EventoPromesaSchema.safeParse(parsed);
          if (!res.success) return;
          const ev = res.data;
          const track = getOrCreateTrack(ev.shipmentId);
          track.venceEn = new Date(ev.venceEn).getTime();
          track.hubId = ev.hubId;
          track.zonaId = ev.zonaId;
        } else if (topic === 'envios.estados') {
          const res = EventoEstadoSchema.safeParse(parsed);
          if (!res.success) return;
          const ev = res.data;
          const track = getOrCreateTrack(ev.shipmentId);
          track.ultimoEstado = ev.tipo;
          track.hubId = ev.hubId;
          track.zonaId = ev.zonaId;

          if (ev.tipo === 'ENTREGADO') {
            await closeAlert(track);
          } else if (ev.tipo === 'ENTREGA_FALLIDA' && track.venceEn) {
            // Regla 4: Fallo en el día límite
            const horasRestantes = (track.venceEn - Date.now()) / (1000 * 3600);
            if (horasRestantes < 12) {
              await emitAlert(
                track,
                'FALLO_EN_DIA_LIMITE',
                'ALTA',
                `Entrega fallida (${ev.motivo || 'FALLO'}) registrada en la jornada de vencimiento.`,
                new Date(track.venceEn).toISOString()
              );
            }
          }
        }
      } catch (err) {
        console.error('[SLA Monitor] Error procesando evento:', err);
      }
    }
  });
}

start().catch(console.error);
