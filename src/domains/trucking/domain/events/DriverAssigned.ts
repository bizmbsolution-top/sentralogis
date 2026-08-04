import { DomainEvent } from '../../../../shared/domain-services/events/DomainEvent';
export class DriverAssigned implements DomainEvent {
  public eventVersion = 1; public eventName = 'Trucking.DriverAssigned'; public aggregateType = 'DriverAssignment'; public occurredAt = new Date();
  constructor(public eventId: string, public aggregateId: string, public payload: Record<string, unknown>, public tenantId?: string) {}
}
