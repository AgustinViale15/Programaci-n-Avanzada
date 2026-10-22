import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/?directConnection=true';

export async function GET() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db('rutasur');

  const envios = await db.collection('envios').find({}).sort({ actualizadoEn: -1 }).limit(25).toArray();
  const alertas = await db.collection('alertas').find({ estado: 'ABIERTA' }).sort({ prioridad: -1 }).toArray();
  const metricas = await db.collection('metricas_diarias').find({}).toArray();
  const replayHub = await db.collection('indicador_tiempo_hub').find({}).toArray();

  await client.close();
  return NextResponse.json({ envios, alertas, metricas, replayHub });
}
