export interface InfrastructureEvent {
  eventId: string;
  type: 'LATENCY_SPIKE' | 'OOM_WARNING' | 'DB_CONNECTION_FAILED';
  metadata: Record<string, any>;
  timestamp: string;
}
