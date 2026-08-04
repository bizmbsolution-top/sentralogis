import { DomainEvent } from '../../../../shared/domain-services/events/DomainEvent';

export class JobOrderCompleted implements DomainEvent {
  public eventVersion: number = 1;
  public eventName: string = 'TruckingJobOrder.Completed';
  public aggregateType: string = 'TruckingJobOrder';
  public occurredAt: Date;

  constructor(
    public eventId: string,
    public aggregateId: string,
    public payload: Record<string, unknown>,
    public tenantId?: string,
    public correlationId?: string,
    public causationId?: string
  ) {
    this.occurredAt = new Date();
  }
}
