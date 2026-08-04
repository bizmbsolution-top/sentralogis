export interface DomainEvent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly aggregateId: string;
  readonly occurredAt: Date;
}
