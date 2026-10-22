import { Kafka } from 'kafkajs';
import { MongoClient } from 'mongodb';
import { EventoEstadoSchema } from '@rutasur/shared';

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/?directConnection=true';
// Grupo consumidor nuevo para reproducir el histórico desde el inicio
const REPLAY_GROUP = `analitica-replay-${Date.now()}`;

const kafka = new Kafka({ clientId: 'rutasur-replay-worker', brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: REPLAY_GROUP });

interface HubTiming {
  ingresoMs: number;
}
const enviosHubMap = new Map<string, HubTiming>();

async function runReplay() {
  console.log(`[Replay CU4] Iniciando reprocesamiento historico con grupo ${REPLAY_GROUP}...`);
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const db = mongoClient.db('rutasur');

  await consumer.connect();
  // fromBeginning: true lee todo el log histórico sin alterar a los otros servicios
  await consumer.subscribe({ topic: 'envios.estados', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const raw = message.value?.toString() || '';
      try {
        const parsed = JSON.parse(raw);
        const res = EventoEstadoSchema.safeParse(parsed);
        if (!res.success) return;

        const ev = res.data;
        if (ev.tipo === 'INGRESADO_HUB') {
          enviosHubMap.set(ev.shipmentId, { ingresoMs: new Date(ev.ocurridoEn).getTime() });
        } else if (ev.tipo === 'EN_REPARTO') {
          const prev = enviosHubMap.get(ev.shipmentId);
          if (prev) {
            const deltaMinutos = (new Date(ev.ocurridoEn).getTime() - prev.ingresoMs) / (1000 * 60);
            await db.collection('indicador_tiempo_hub').updateOne(
              { hubId: ev.hubId },
              {
                $inc: { totalMinutos: deltaMinutos, enviosProcesados: 1 },$set: { actualizadoEn: new Date() }
              },
              { upsert: true }
            );
            console.log(`[Replay CU4] Hub ${ev.hubId}: tiempo calculado de ${deltaMinutos.toFixed(1)} min para ${ev.shipmentId}`);
            enviosHubMap.delete(ev.shipmentId);
          }
        }
      } catch (err) {
        // Ignora anomalías de formato
      }
    }
  });
}

runReplay().catch(console.error);
