import { NextRequest } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/?directConnection=true';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('rutasur');

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'CONNECTED' })}\n\n`));

      const changeStreamEnvios = db.collection('envios').watch([], { fullDocument: 'updateLookup' });
      const changeStreamAlertas = db.collection('alertas').watch([], { fullDocument: 'updateLookup' });

      changeStreamEnvios.on('change', (change: any) => {
        if (change.fullDocument) {
          const payload = JSON.stringify({ type: 'ENVIO_UPDATE', doc: change.fullDocument });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }
      });

      changeStreamAlertas.on('change', (change: any) => {
        if (change.fullDocument) {
          const payload = JSON.stringify({ type: 'ALERTA_UPDATE', doc: change.fullDocument });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        }
      });

      req.signal.addEventListener('abort', () => {
        changeStreamEnvios.close();
        changeStreamAlertas.close();
        client.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
