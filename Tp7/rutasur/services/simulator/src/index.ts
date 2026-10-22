import express from 'express';
import { Kafka, Partitioners } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import seedrandom from 'seedrandom';
import { EventoPromesa } from '@rutasur/shared';

const PORT = process.env.PORT || 4005;
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';

const rng = seedrandom('rutasur-seed-2026');

const kafka = new Kafka({
  clientId: 'rutasur-simulator',
  brokers: [KAFKA_BROKER],
});
const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner
});

const ACCELERATION_FACTOR = 120;
const START_REAL_TIME = Date.now();

export function getSimulatedTime(offsetMinutes = 0): string {
  const elapsedRealMs = Math.max(0, Date.now() - START_REAL_TIME);
  const elapsedSimulatedMs = elapsedRealMs * ACCELERATION_FACTOR;
  const currentSimulated = START_REAL_TIME + elapsedSimulatedMs + (offsetMinutes * 60 * 1000);
  return new Date(currentSimulated).toISOString();
}

const HUBS = ['HUB_CENTRAL', 'HUB_NORTE', 'HUB_SUR'];
const ZONAS = ['ZONA_1', 'ZONA_2', 'ZONA_3', 'ZONA_4'];

async function emitState(event: any) {
  await producer.send({
    topic: 'envios.estados',
    messages: [
      {
        key: event.shipmentId,
        value: JSON.stringify(event),
      },
    ],
  });
}

async function emitPromise(promise: EventoPromesa) {
  await producer.send({
    topic: 'envios.promesas',
    messages: [
      {
        key: promise.shipmentId,
        value: JSON.stringify(promise),
      },
    ],
  });
}

async function simulateShipmentLifecycle(options?: {
  forceAbsent?: boolean;
  forceThirdFailure?: boolean;
  forceDelayInHub?: boolean;
  customShipmentId?: string;
}) {
  const shipmentId = options?.customShipmentId || `ENV-${Math.floor(100000 + rng() * 900000)}`;
  const hubId = HUBS[Math.floor(rng() * HUBS.length)];
  const zonaId = ZONAS[Math.floor(rng() * ZONAS.length)];
  const repartidorId = `REP-${Math.floor(10 + rng() * 90)}`;

  let seq = 1;

  const promesaVenceEn = options?.forceDelayInHub ? getSimulatedTime(2 * 60) : getSimulatedTime(24 * 60);
  const promesa: EventoPromesa = {
    eventId: uuidv4(),
    shipmentId,
    hubId,
    zonaId,
    venceEn: promesaVenceEn,
    ocurridoEn: getSimulatedTime(),
    version: 1,
  };
  await emitPromise(promesa);

  await emitState({
    eventId: uuidv4(),
    shipmentId,
    tipo: 'CREADO',
    ocurridoEn: getSimulatedTime(),
    secuencia: seq++,
    hubId,
    zonaId,
    version: 1,
  });

  await new Promise((r) => setTimeout(r, 2000));

  await emitState({
    eventId: uuidv4(),
    shipmentId,
    tipo: 'INGRESADO_HUB',
    ocurridoEn: getSimulatedTime(),
    secuencia: seq++,
    hubId,
    zonaId,
    version: 1,
  });

  if (options?.forceDelayInHub) {
    console.log(`[Escenario] Envio demorado en hub: ${shipmentId}`);
    return shipmentId;
  }

  await new Promise((r) => setTimeout(r, 2500));

  await emitState({
    eventId: uuidv4(),
    shipmentId,
    tipo: 'CLASIFICADO',
    ocurridoEn: getSimulatedTime(),
    secuencia: seq++,
    hubId,
    zonaId,
    repartidorId,
    version: 1,
  });

  await new Promise((r) => setTimeout(r, 2500));

  await emitState({
    eventId: uuidv4(),
    shipmentId,
    tipo: 'EN_REPARTO',
    ocurridoEn: getSimulatedTime(),
    secuencia: seq++,
    hubId,
    zonaId,
    repartidorId,
    version: 1,
  });

  await new Promise((r) => setTimeout(r, 3000));

  if (options?.forceAbsent) {
    await emitState({
      eventId: uuidv4(),
      shipmentId,
      tipo: 'ENTREGA_FALLIDA',
      motivo: 'AUSENTE',
      ocurridoEn: getSimulatedTime(),
      secuencia: seq++,
      hubId,
      zonaId,
      repartidorId,
      version: 1,
    });
    console.log(`[Escenario] Entrega fallida por AUSENTE emitida: ${shipmentId}`);
    return shipmentId;
  }

  if (options?.forceThirdFailure) {
    for (let intento = 1; intento <= 3; intento++) {
      await emitState({
        eventId: uuidv4(),
        shipmentId,
        tipo: 'ENTREGA_FALLIDA',
        motivo: intento === 3 ? 'RECHAZADO' : 'AUSENTE',
        ocurridoEn: getSimulatedTime(),
        secuencia: seq++,
        hubId,
        zonaId,
        repartidorId,
        version: 1,
      });
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log(`[Escenario] Tercer fallo completado para ${shipmentId}`);
    return shipmentId;
  }

  await emitState({
    eventId: uuidv4(),
    shipmentId,
    tipo: 'ENTREGADO',
    ocurridoEn: getSimulatedTime(),
    secuencia: seq++,
    hubId,
    zonaId,
    repartidorId,
    version: 1,
  });

  return shipmentId;
}

async function emitContinuousRandomShipment() {
  const roll = rng();

  if (roll < 0.01) {
    await producer.send({
      topic: 'envios.estados',
      messages: [
        {
          key: 'ENV-MALFORMED',
          value: JSON.stringify({
            eventId: 'not-a-valid-uuid',
            shipmentId: 'ENV-MALFORMED',
            tipo: 'ESTADO_INEXISTENTE',
            secuencia: -5
          }),
        },
      ],
    });
    console.log('[Simulador] Inyectado evento malformado para prueba de DLQ');
    return;
  }

  const isAbsent = rng() < 0.15;
  await simulateShipmentLifecycle({ forceAbsent: isAbsent });
}

const app = express();
app.use(express.json());

// Middleware CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.post('/scenarios/happy-path', async (req, res) => {
  const id = await simulateShipmentLifecycle();
  res.json({ success: true, scenario: 'happy-path', shipmentId: id });
});

app.post('/scenarios/absent', async (req, res) => {
  const id = await simulateShipmentLifecycle({ forceAbsent: true });
  res.json({ success: true, scenario: 'absent', shipmentId: id });
});

app.post('/scenarios/delayed', async (req, res) => {
  const id = await simulateShipmentLifecycle({ forceDelayInHub: true, customShipmentId: 'ENV-SLA-' + Math.floor(1000 + Math.random() * 9000) });
  res.json({ success: true, scenario: 'delayed', shipmentId: id });
});

app.post('/scenarios/third-failure', async (req, res) => {
  const id = await simulateShipmentLifecycle({ forceThirdFailure: true });
  res.json({ success: true, scenario: 'third-failure', shipmentId: id });
});

app.post('/scenarios/malformed', async (req, res) => {
  await producer.send({
    topic: 'envios.estados',
    messages: [
      {
        key: 'ENV-CORRUPT',
        value: JSON.stringify({
          corruptField: 1234,
          invalido: true
        }),
      },
    ],
  });
  res.json({ success: true, scenario: 'malformed-dlq' });
});

app.post('/scenarios/burst', async (req, res) => {
  res.json({ success: true, message: 'Iniciando rafaga de 500 envios...' });
  for (let i = 0; i < 500; i++) {
    const sId = `BURST-${i}-${Date.now()}`;
    emitState({
      eventId: uuidv4(),
      shipmentId: sId,
      tipo: 'CREADO',
      ocurridoEn: getSimulatedTime(),
      secuencia: 1,
      hubId: 'HUB_CENTRAL',
      zonaId: 'ZONA_1',
      version: 1
    });
  }
});

let continuousInterval: NodeJS.Timeout | null = null;

app.post('/continuous/start', (req, res) => {
  if (!continuousInterval) {
    continuousInterval = setInterval(emitContinuousRandomShipment, 3000);
    console.log('[Simulador] Flujo continuo activado (20 envios/min)');
  }
  res.json({ running: true });
});

app.post('/continuous/stop', (req, res) => {
  if (continuousInterval) {
    clearInterval(continuousInterval);
    continuousInterval = null;
    console.log('[Simulador] Flujo continuo detenido');
  }
  res.json({ running: false });
});

async function main() {
  await producer.connect();
  console.log('[Simulador] Productor Kafka conectado');

  app.listen(PORT, () => {
    console.log(`[Simulador] Servidor de escenarios listo en http://localhost:${PORT}`);
  });
}

main().catch(console.error);
