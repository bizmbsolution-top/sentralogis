import { DomainEvent } from '../../../../shared/domain-services/events/DomainEvent';
export class JobStarted implements DomainEvent {
  public eventVersion = 1; public eventName = 'Trucking.JobStarted'; public aggregateType = 'TruckingJobOrder'; public occurredAt = new Date();
  constructor(public eventId: string, public aggregateId: string, public payload: Record<string, unknown>, public tenantId?: string) {}
}
