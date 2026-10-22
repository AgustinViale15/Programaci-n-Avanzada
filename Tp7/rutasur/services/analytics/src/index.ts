import { Kafka } from 'kafkajs';
import { MongoClient, Db } from 'mongodb';
import { EventoEstadoSchema } from '@rutasur/shared';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/?directConnection=true';
const CONSUMER_GROUP = 'analitica';

const kafka = new Kafka({ clientId: 'rutasur-analytics', brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: CONSUMER_GROUP });
let db: Db;

async function start() {
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  db = mongoClient.db('rutasur');
  console.log('[Analitica] Conectado a MongoDB');

  await db.collection('metricas_diarias').createIndex(
    { fecha: 1, zonaId: 1, hubId: 1, franja: 1 },
    { unique: true }
  );

  await consumer.connect();
  // fromBeginning: true para recuperar todos los fallos y entregas del log
  await consumer.subscribe({ topic: 'envios.estados', fromBeginning: true });

  console.log('[Analitica] Servicio activo. Escuchando envios.estados...');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payloadStr = message.value?.toString() || '';
      try {
        const parsed = JSON.parse(payloadStr);
        const result = EventoEstadoSchema.safeParse(parsed);
        if (!result.success) return;

        const ev = result.data;
        const fecha = ev.ocurridoEn.split('T')[0];
        const hora = new Date(ev.ocurridoEn).getUTCHours();
        const franja = hora < 13 ? 'MANANA' : 'TARDE';

        const filter = {
          fecha,
          zonaId: ev.zonaId,
          hubId: ev.hubId,
          franja
        };

        const updateOps: any = {
          $inc: {}
        };

        if (ev.tipo === 'ENTREGADO') {
          updateOps.$inc['entregados'] = 1;
        } else if (ev.tipo === 'ENTREGA_FALLIDA') {
          updateOps.$inc['fallidos'] = 1;
          if (ev.motivo) {
            updateOps.$inc[`motivos.${ev.motivo}`] = 1;
          }
        } else {
          return;
        }

        await db.collection('metricas_diarias').updateOne(
          filter,
          updateOps,
          { upsert: true }
        );

        console.log(`[Analitica] Metrica agregada para ${ev.zonaId} (${ev.tipo} - ${ev.motivo || 'OK'})`);
      } catch (err) {
        console.error('[Analitica] Error actualizando analítica:', err);
      }
    }
  });
}

start().catch(console.error);
