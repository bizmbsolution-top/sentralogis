export interface DomainEvent {
  eventId: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  timestamp: string;
}
