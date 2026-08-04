import { DomainEvent } from '../../../../shared/domain-services/events/DomainEvent';
export class InventoryReceived implements DomainEvent {
  public eventVersion = 1; public eventName = 'Warehouse.InventoryReceived'; public aggregateType = 'Receiving'; public occurredAt = new Date();
  constructor(public eventId: string, public aggregateId: string, public payload: Record<string, unknown>, public tenantId?: string) {}
}
