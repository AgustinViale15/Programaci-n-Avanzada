import { Kafka, EachMessagePayload } from 'kafkajs';
import { MongoClient, Db } from 'mongodb';
import {
  EventoEstadoSchema,
  EventoReprogramacionSchema,
  EventoAlertaSlaSchema,
  EventoNotificacionSchema
} from '@rutasur/shared';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/?directConnection=true';
const CONSUMER_GROUP = 'proyector';

const kafka = new Kafka({
  clientId: 'rutasur-projector',
  brokers: [KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: CONSUMER_GROUP });
const producer = kafka.producer(); // Productor para enviar a DLQ si falla el schema
let db: Db;

// Verifica si un evento ya fue procesado por este grupo consumidor
async function isDuplicate(eventId: string): Promise<boolean> {
  const col = db.collection('eventos_procesados');
  const found = await col.findOne({ consumidor: CONSUMER_GROUP, eventId });
  return !!found;
}

// Marca el evento como procesado
async function markProcessed(eventId: string) {
  await db.collection('eventos_procesados').updateOne(
    { consumidor: CONSUMER_GROUP, eventId },
    { $set: { consumidor: CONSUMER_GROUP, eventId, procesadoEn: new Date() } },
    { upsert: true }
  );
}

// Enviar a Dead Letter Queue cuando no cumple el esquema
async function sendToDlq(rawMessage: string, reason: string) {
  try {
    await producer.send({
      topic: 'envios.estados.dlq',
      messages: [
        {
          key: 'DLQ-ERROR',
          value: JSON.stringify({
            rawPayload: rawMessage,
            razon: reason,
            consumidor: CONSUMER_GROUP,
            fecha: new Date().toISOString()
          }),
        },
      ],
    });
    console.warn(`[Proyector DLQ] Mensaje inválido desviado a DLQ: ${reason}`);
  } catch (err) {
    console.error('[Proyector DLQ] Error enviando a DLQ:', err);
  }
}

// Procesamiento de envios.estados
async function handleEnviosEstados(payloadStr: string) {
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(payloadStr);
  } catch {
    await sendToDlq(payloadStr, 'JSON inválido o malformado');
    return;
  }

  const result = EventoEstadoSchema.safeParse(parsedJson);
  if (!result.success) {
    await sendToDlq(payloadStr, `Esquema inválido: ${result.error.message}`);
    return;
  }

  const ev = result.data;

  if (await isDuplicate(ev.eventId)) {
    console.log(`[Proyector] Evento duplicado ignorado: ${ev.eventId}`);
    return;
  }

  const colEnvios = db.collection('envios');
  const existingDoc = await colEnvios.findOne({ shipmentId: ev.shipmentId });

  // Regla de secuencia: si el documento ya tiene una secuencia mayor o igual, se ignora
  if (existingDoc && existingDoc.ultimaSecuencia >= ev.secuencia) {
    console.warn(`[Proyector] Evento fuera de orden descartado para ${ev.shipmentId}. Actual: ${existingDoc.ultimaSecuencia}, Recibido: ${ev.secuencia}`);
    await markProcessed(ev.eventId);
    return;
  }

  const historyItem = {
    eventId: ev.eventId,
    tipo: ev.tipo,
    motivo: ev.motivo || null,
    ocurridoEn: new Date(ev.ocurridoEn),
    secuencia: ev.secuencia,
    repartidorId: ev.repartidorId || null
  };

  await colEnvios.updateOne(
    { shipmentId: ev.shipmentId },
    {
      $set: {
        shipmentId: ev.shipmentId,
        estado: ev.tipo,
        ultimoMotivo: ev.motivo || null,
        ultimaSecuencia: ev.secuencia,
        hubId: ev.hubId,
        zonaId: ev.zonaId,
        actualizadoEn: new Date()
      },
      $setOnInsert: { creadoEn: new Date(ev.ocurridoEn), intentos: 0 },$push: {
        historial: historyItem
      } as any
    },
    { upsert: true }
  );

  // Si fue entrega fallida, incrementamos los intentos
  if (ev.tipo === 'ENTREGA_FALLIDA') {
    await colEnvios.updateOne(
      { shipmentId: ev.shipmentId },
      { $inc: { intentos: 1 } }
    );
  }

  await markProcessed(ev.eventId);
  console.log(`[Proyector] Envío ${ev.shipmentId} actualizado a estado ${ev.tipo}`);
}

// Procesamiento de envios.reprogramaciones
async function handleReprogramaciones(payloadStr: string) {
  const parsed = JSON.parse(payloadStr);
  const result = EventoReprogramacionSchema.safeParse(parsed);
  if (!result.success) return;

  const ev = result.data;
  if (await isDuplicate(ev.eventId)) return;

  await db.collection('envios').updateOne(
    { shipmentId: ev.shipmentId },
    {
      $set: {
        decisionReprogramacion: ev.decision,
        nuevaFechaEstimada: ev.nuevaFechaEstimada ? new Date(ev.nuevaFechaEstimada) : null,
        franjaReprogramada: ev.franjaHoraria || null
      },
      $push: {
        reprogramaciones: {
          eventId: ev.eventId,
          decision: ev.decision,
          intentoNumero: ev.intentoNumero,
          ocurridoEn: new Date(ev.ocurridoEn)
        }
      } as any
    }
  );

  await markProcessed(ev.eventId);
  console.log(`[Proyector] Reprogramación aplicada a ${ev.shipmentId}: ${ev.decision}`);
}

// Procesamiento de alertas.sla
async function handleAlertas(payloadStr: string) {
  const parsed = JSON.parse(payloadStr);
  const result = EventoAlertaSlaSchema.safeParse(parsed);
  if (!result.success) return;

  const ev = result.data;
  const colAlertas = db.collection('alertas');

  await colAlertas.updateOne(
    { alertId: ev.alertId },
    {
      $set: { alertId: ev.alertId, shipmentId: ev.shipmentId, regla: ev.regla, prioridad: ev.prioridad, estado: ev.estado, descripcion: ev.descripcion, hubId: ev.hubId, zonaId: ev.zonaId, venceEn: new Date(ev.venceEn), actualizadoEn: new Date() },$setOnInsert: {
        creadoEn: new Date(ev.ocurridoEn)
      }
    },
    { upsert: true }
  );

  console.log(`[Proyector] Alerta SLA guardada: [${ev.prioridad}] ${ev.regla} para ${ev.shipmentId}`);
}

// Procesamiento de notificaciones.enviadas
async function handleNotificaciones(payloadStr: string) {
  const parsed = JSON.parse(payloadStr);
  const result = EventoNotificacionSchema.safeParse(parsed);
  if (!result.success) return;

  const ev = result.data;
  await db.collection('notificaciones').insertOne({
    notificationId: ev.notificationId,
    shipmentId: ev.shipmentId,
    tipoAviso: ev.tipoAviso,
    destinatario: ev.destinatario,
    canal: ev.canal,
    mensaje: ev.mensaje,
    opciones: ev.opcionesDisponibles || [],
    fecha: new Date(ev.ocurridoEn)
  });

  console.log(`[Proyector] Notificación registrada para envío ${ev.shipmentId}`);
}

async function start() {
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  db = mongoClient.db('rutasur');
  console.log('[Proyector] Conectado a MongoDB');

  // Creación de índices según la especificación
  await db.collection('envios').createIndex({ shipmentId: 1 }, { unique: true });
  await db.collection('envios').createIndex({ estado: 1, zonaId: 1 });
  await db.collection('alertas').createIndex({ estado: 1, prioridad: 1 });
  await db.collection('alertas').createIndex({ shipmentId: 1 });
  await db.collection('notificaciones').createIndex({ shipmentId: 1 });
  await db.collection('eventos_procesados').createIndex({ consumidor: 1, eventId: 1 }, { unique: true });
  await db.collection('eventos_procesados').createIndex({ procesadoEn: 1 }, { expireAfterSeconds: 7 * 24 * 3600 }); // TTL 7 días

  await producer.connect();
  await consumer.connect();

  await consumer.subscribe({
    topics: [
      'envios.estados',
      'envios.reprogramaciones',
      'alertas.sla',
      'notificaciones.enviadas'
    ],
    fromBeginning: true
  });

  console.log('[Proyector] Suscrito a los topics. Escuchando eventos...');

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      const payloadStr = message.value?.toString() || '';
      try {
        switch (topic) {
          case 'envios.estados':
            await handleEnviosEstados(payloadStr);
            break;
          case 'envios.reprogramaciones':
            await handleReprogramaciones(payloadStr);
            break;
          case 'alertas.sla':
            await handleAlertas(payloadStr);
            break;
          case 'notificaciones.enviadas':
            await handleNotificaciones(payloadStr);
            break;
        }

        // Commit manual tras escribir en MongoDB
        await consumer.commitOffsets([
          {
            topic,
            partition,
            offset: (BigInt(message.offset) + 1n).toString()
          }
        ]);
      } catch (err) {
        console.error(`[Proyector] Error procesando mensaje de ${topic}:`, err);
      }
    }
  });
}

start().catch(console.error);
