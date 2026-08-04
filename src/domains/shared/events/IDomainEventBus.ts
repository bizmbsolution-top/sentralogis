export interface IDomainEventBus {
  publish(event: any): Promise<void>;
  publishAll(events: any[]): Promise<void>;
}
