import { EventEnvelope } from './events/EventEnvelope';
import { DomainEvent } from './events/DomainEvent';
import { DispatchResult } from './events/DispatchResult';

export interface IDomainEventDispatcher {
  dispatchSynchronous<TEvent extends DomainEvent>(envelope: EventEnvelope<TEvent>): Promise<DispatchResult>;
  dispatchAsynchronous<TEvent extends DomainEvent>(envelope: EventEnvelope<TEvent>): Promise<DispatchResult>;
  dispatchTransactional<TEvent extends DomainEvent>(envelope: EventEnvelope<TEvent>): Promise<DispatchResult>;
  dispatchToDeadLetter<TEvent extends DomainEvent>(envelope: EventEnvelope<TEvent>, reason: string): Promise<DispatchResult>;
  
  dispatchIntegrationEvent<TEvent extends DomainEvent>(topic: string, envelope: EventEnvelope<TEvent>): Promise<DispatchResult>;
  dispatchAggregateEvents<TAggregate>(aggregate: TAggregate): Promise<DispatchResult[]>;
}
