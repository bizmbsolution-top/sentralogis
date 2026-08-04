import { DomainEvent } from '../kernel/DomainEvent';

export interface IDomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
