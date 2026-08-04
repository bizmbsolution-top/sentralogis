import { DomainEvent } from '../../../shared/kernel/DomainEvent';
import { UniqueId } from '../../../shared/common/UniqueId';

export class WorkOrderApproved implements DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;

  constructor(
    public readonly aggregateId: string,
    public readonly tenantId: string,
    public readonly correlationId: string,
    public readonly payload: any
  ) {
    this.eventId = UniqueId.generate();
    this.occurredAt = new Date();
  }
}
