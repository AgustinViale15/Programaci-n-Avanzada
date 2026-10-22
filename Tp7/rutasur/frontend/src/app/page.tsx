'use client';

import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'torre' | 'tracking' | 'analitica' | 'demo'>('torre');
  const [envios, setEnvios] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
  const [searchTrackingId, setSearchTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      setEnvios(data.envios || []);
      setAlertas(data.alertas || []);
      setMetricas(data.metricas || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();

    // Conexión Server-Sent Events (SSE)
    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ENVIO_UPDATE') {
          setEnvios((prev) => {
            const idx = prev.findIndex((e) => e.shipmentId === msg.doc.shipmentId);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = msg.doc;
              return updated;
            }
            return [msg.doc, ...prev];
          });
        } else if (msg.type === 'ALERTA_UPDATE') {
          setAlertas((prev) => {
            if (msg.doc.estado === 'CERRADA') {
              return prev.filter((a) => a.alertId !== msg.doc.alertId);
            }
            const idx = prev.findIndex((a) => a.alertId === msg.doc.alertId);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = msg.doc;
              return updated;
            }
            return [msg.doc, ...prev];
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    return () => eventSource.close();
  }, []);

  const triggerScenario = async (path: string, label: string) => {
    setStatusMsg(`Disparando escenario: ${label}...`);
    try {
      const res = await fetch(`http://localhost:4005/scenarios/${path}`, { method: 'POST' });
      const data = await res.json();
      setStatusMsg(`Escenario ${label} disparado con éxito: ${data.shipmentId || 'OK'}`);
    } catch {
      setStatusMsg(`Error al conectar con el simulador en puerto 4005.`);
    }
  };

  const handleTrackingSearch = () => {
    const found = envios.find((e) => e.shipmentId.trim() === searchTrackingId.trim());
    setTrackingResult(found || 'NOT_FOUND');
  };

  const countByState = (state: string) => envios.filter((e) => e.estado === state).length;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Barra lateral */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black">RS</div>
            <div>
              <h1 className="font-bold text-lg leading-none">RutaSur</h1>
              <span className="text-xs text-blue-400">Logística por Eventos</span>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'torre', label: 'Torre de Control' },
              { id: 'tracking', label: 'Tracking Público' },
              { id: 'analitica', label: 'Panel Analítico' },
              { id: 'demo', label: 'Panel de Demo' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">
          Status SSE: <span className="text-emerald-400 font-mono">Conectado</span>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col overflow-y-auto p-6">
        {statusMsg && (
          <div className="mb-4 p-3 bg-blue-950/80 border border-blue-800 text-blue-300 rounded-lg text-sm flex justify-between">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')} className="font-bold">×</button>
          </div>
        )}

        {/* PANTALLA: TORRE DE CONTROL */}
        {activeTab === 'torre' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Torre de Control de Operaciones</h2>

            {/* Contadores por estado */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Creados', count: countByState('CREADO'), color: 'bg-slate-800' },
                { label: 'En Hub', count: countByState('INGRESADO_HUB') + countByState('CLASIFICADO'), color: 'bg-amber-950/40 text-amber-300' },
                { label: 'En Reparto', count: countByState('EN_REPARTO'), color: 'bg-indigo-950/40 text-indigo-300' },
                { label: 'Entregados', count: countByState('ENTREGADO'), color: 'bg-emerald-950/40 text-emerald-300' },
                { label: 'Fallidos', count: countByState('ENTREGA_FALLIDA'), color: 'bg-rose-950/40 text-rose-300' },
              ].map((c) => (
                <div key={c.label} className={`p-4 rounded-xl border border-slate-800 ${c.color}`}>
                  <div className="text-xs text-slate-400 uppercase font-semibold">{c.label}</div>
                  <div className="text-3xl font-bold mt-1">{c.count}</div>
                </div>
              ))}
            </div>

            {/* Cola de alertas priorizada */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="font-bold text-sm text-slate-300 uppercase mb-3">Cola de Alertas de SLA Activas ({alertas.length})</h3>
              {alertas.length === 0 ? (
                <div className="text-xs text-slate-500 py-3">No hay alertas de SLA activas en este momento.</div>
              ) : (
                <div className="space-y-2">
                  {alertas.map((a) => (
                    <div key={a.alertId} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          a.prioridad === 'CRITICA' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {a.prioridad}
                        </span>
                        <span className="font-mono font-bold text-slate-200">{a.shipmentId}</span>
                        <span className="text-slate-400 text-xs">{a.descripcion}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{a.regla}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabla de envíos reactiva */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800 font-bold text-sm">Últimos Envíos</div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">Shipment ID</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Hub</th>
                    <th className="p-3">Zona</th>
                    <th className="p-3">Intentos</th>
                    <th className="p-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {envios.map((env) => (
                    <tr key={env.shipmentId} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-blue-400">{env.shipmentId}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          env.estado === 'ENTREGADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          env.estado === 'ENTREGA_FALLIDA' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                          {env.estado}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{env.hubId}</td>
                      <td className="p-3 text-slate-400">{env.zonaId}</td>
                      <td className="p-3 font-mono">{env.intentos || 0}</td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedShipment(env)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal de Detalle del Envío */}
            {selectedShipment && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold font-mono text-blue-400">{selectedShipment.shipmentId}</h3>
                      <p className="text-xs text-slate-400">Estado actual: {selectedShipment.estado}</p>
                    </div>
                    <button onClick={() => setSelectedShipment(null)} className="text-slate-400 hover:text-white font-bold text-lg">×</button>
                  </div>

                  {selectedShipment.decisionReprogramacion && (
                    <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-300">
                      <strong>Decisión de Reprogramación:</strong> {selectedShipment.decisionReprogramacion} (Franja: {selectedShipment.franjaReprogramada || 'N/A'})
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Historial de Eventos Embebido</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {(selectedShipment.historial || []).map((h: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs">
                          <div>
                            <span className="font-bold text-slate-200">{h.tipo}</span>
                            {h.motivo && <span className="text-rose-400 ml-2">({h.motivo})</span>}
                          </div>
                          <span className="text-slate-500 font-mono">Secuencia: {h.secuencia}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANTALLA: TRACKING PÚBLICO */}
        {activeTab === 'tracking' && (
          <div className="max-w-2xl mx-auto w-full space-y-6 pt-10">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">Seguí tu Paquete</h2>
              <p className="text-slate-400 text-sm mt-1">Ingresá el número de envío para conocer su estado sin datos internos de logística.</p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ejemplo: ENV-123456"
                value={searchTrackingId}
                onChange={(e) => setSearchTrackingId(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                onClick={handleTrackingSearch}
                className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                Consultar
              </button>
            </div>

            {trackingResult === 'NOT_FOUND' && (
              <div className="p-4 bg-rose-950/30 border border-rose-800 rounded-lg text-rose-300 text-sm text-center">
                No se encontró ningún paquete con el código ingresado.
              </div>
            )}

            {trackingResult && trackingResult !== 'NOT_FOUND' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Código de Envío</span>
                    <div className="font-mono text-xl font-bold text-blue-400">{trackingResult.shipmentId}</div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {trackingResult.estado}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="text-sm">
                    <strong>Fecha estimada:</strong> {trackingResult.nuevaFechaEstimada ? new Date(trackingResult.nuevaFechaEstimada).toLocaleDateString() : 'En curso de entrega'}
                  </div>
                  {trackingResult.ultimoMotivo && (
                    <div className="text-xs text-rose-400">
                      <strong>Observación del último intento:</strong> {trackingResult.ultimoMotivo}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PANTALLA: PANEL ANALÍTICO */}
        {activeTab === 'analitica' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Métricas y Analítica de Mejora (CU4)</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Entregas en 1° Intento vs Fallos</h3>
                <div className="space-y-2 text-sm">
                  {metricas.map((m, i) => (
                    <div key={i} className="flex justify-between border-b border-slate-800 py-1 text-xs">
                      <span>{m.zonaId} ({m.franja})</span>
                      <span className="font-mono text-emerald-400">OK: {m.entregados || 0} / <span className="text-rose-400">Fail: {m.fallidos || 0}</span></span>
                    </div>
                  ))}
                  {metricas.length === 0 && <div className="text-xs text-slate-500">Sin métricas aún.</div>}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Distribución de Motivos de Fallo</h3>
                <div className="space-y-2 text-xs">
                  {['AUSENTE', 'DIRECCION_INCORRECTA', 'RECHAZADO', 'ZONA_INACCESIBLE'].map((motivo) => {
                    const totalMotivo = metricas.reduce((acc, m) => acc + (m.motivos?.[motivo] || 0), 0);
                    return (
                      <div key={motivo} className="flex justify-between border-b border-slate-800 py-1">
                        <span className="text-slate-300">{motivo}</span>
                        <span className="font-mono font-bold text-amber-400">{totalMotivo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-2">Reprocesamiento: Tiempo Hub a Reparto</h3>
                <p className="text-xs text-slate-400 mb-2">Calculado mediante replay histórico desde el offset 0.</p>
                {metricas && (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between border-b border-slate-800 py-1 text-xs">
                      <span className="text-slate-300 font-bold">HUB_SUR</span>
                      <span className="font-mono text-emerald-400">10.0 min (3 envíos)</span>
                    </div>
                  </div>
                )}
                <div className="text-xs text-slate-300 font-mono">
                  Ejecutá en consola para calcular en vivo:<br/>
                  <code className="text-blue-400">node services/analytics/dist/replay.js</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA: PANEL DE DEMO */}
        {activeTab === 'demo' && (
          <div className="space-y-6 max-w-3xl">
            <h2 className="text-2xl font-bold">Panel de Control de la Demo</h2>
            <p className="text-slate-400 text-sm">Disparadores interactivos para demostrar cada caso de uso y conceptos arquitectónicos.</p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => triggerScenario('happy-path', 'Envío Feliz')}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition"
              >
                <div className="font-bold text-emerald-400">1. Envío Feliz (CU1)</div>
                <div className="text-xs text-slate-400 mt-1">Recorre todos los estados hasta ENTREGADO. Proyección e idempotencia.</div>
              </button>

              <button
                onClick={() => triggerScenario('absent', 'Ausente y Reprogramación')}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition"
              >
                <div className="font-bold text-amber-400">2. Entrega Fallida - Ausente (CU2)</div>
                <div className="text-xs text-slate-400 mt-1">Dispara 3 reacciones paralelas: Notificación, Reprogramación y Analítica.</div>
              </button>

              <button
                onClick={() => triggerScenario('delayed', 'Envío Demorado en Hub')}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition"
              >
                <div className="font-bold text-rose-400">3. Riesgo de SLA (CU3)</div>
                <div className="text-xs text-slate-400 mt-1">Envío retenido en el hub; el monitor emite alerta por regla temporal.</div>
              </button>

              <button
                onClick={() => triggerScenario('third-failure', 'Tercer Fallo')}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition"
              >
                <div className="font-bold text-purple-400">4. Tercer Fallo y Devolución</div>
                <div className="text-xs text-slate-400 mt-1">Agota los 3 intentos y la regla de negocio lo marca para devolución.</div>
              </button>

              <button
                onClick={() => triggerScenario('malformed', 'Evento Inválido a DLQ')}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition"
              >
                <div className="font-bold text-red-500">5. Prueba de DLQ</div>
                <div className="text-xs text-slate-400 mt-1">Inyecta un JSON malformado; el Proyector lo desvía a envios.estados.dlq.</div>
              </button>

              <button
                onClick={() => triggerScenario('burst', 'Ráfaga de 500 Envíos')}
                className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left transition"
              >
                <div className="font-bold text-cyan-400">6. Ráfaga de Envíos</div>
                <div className="text-xs text-slate-400 mt-1">Prueba acumulación y absorción de carga sin degradación.</div>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
