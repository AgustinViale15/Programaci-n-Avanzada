export interface EventEnvelope<T = any> {
  eventId: string;
  eventType: string;
  correlationId: string;
  timestamp: string;
  version: number;
  payload: T;
}
