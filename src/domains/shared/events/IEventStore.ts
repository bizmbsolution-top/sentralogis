export interface IEventStore {
  save(event: any): Promise<void>;
  getEventsForAggregate(aggregateId: string): Promise<any[]>;
}
