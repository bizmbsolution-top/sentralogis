export interface DomainEvent {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventName: string;
  eventVersion: number;
  occurredAt: Date;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  causationId?: string;
  traceId?: string;
  requestId?: string;
  payload: Record<string, unknown>;
}
