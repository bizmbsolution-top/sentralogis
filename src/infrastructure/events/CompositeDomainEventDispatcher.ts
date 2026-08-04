import { IDomainEventDispatcher } from '../../shared/domain-services/IDomainEventDispatcher';
import { EventEnvelope } from '../../shared/domain-services/events/EventEnvelope';
import { DomainEvent } from '../../shared/domain-services/events/DomainEvent';
import { DispatchResult } from '../../shared/domain-services/events/DispatchResult';

export class CompositeDomainEventDispatcher implements IDomainEventDispatcher {
  constructor(private dispatchers: IDomainEventDispatcher[]) {}
  
  async dispatchSynchronous<TEvent extends DomainEvent>(envelope: EventEnvelope<TEvent>): Promise<DispatchResult> {
    const results = await Promise.all(this.dispatchers.map(d => d.dispatchSynchronous(envelope)));
    return results[0] || { success: true, dispatcherName: 'Composite', latencyMs: 0, retryCount: 0 };
  }
  
  async dispatchAsynchronous<TEvent extends DomainEvent>(envelope: EventEnvelope<TEvent>): Promise<DispatchResult> {
    const results = await Promise.all(this.dispatchers.map(d => d.dispatchAsynchronous(envelope)));
    return results[0] || { success: true, dispatcherName: 'Composite', latencyMs: 0, retryCount: 0 };
  }
  
  async dispatchTransactional<TEvent extends DomainEvent>(envelope: EventEnvelope<TEvent>): Promise<DispatchResult> {
    const results = await Promise.all(this.dispatchers.map(d => d.dispatchTransactional(envelope)));
    return results[0] || { success: true, dispatcherName: 'Composite', latencyMs: 0, retryCount: 0 };
  }
  
  async dispatchToDeadLetter<TEvent extends DomainEvent>(envelope: EventEnvelope<TEvent>, reason: string): Promise<DispatchResult> {
    const results = await Promise.all(this.dispatchers.map(d => d.dispatchToDeadLetter(envelope, reason)));
    return results[0] || { success: true, dispatcherName: 'Composite', latencyMs: 0, retryCount: 0 };
  }
  
  async dispatchIntegrationEvent<TEvent extends DomainEvent>(topic: string, envelope: EventEnvelope<TEvent>): Promise<DispatchResult> {
    const results = await Promise.all(this.dispatchers.map(d => d.dispatchIntegrationEvent(topic, envelope)));
    return results[0] || { success: true, dispatcherName: 'Composite', latencyMs: 0, retryCount: 0 };
  }
  
  async dispatchAggregateEvents<TAggregate>(aggregate: TAggregate): Promise<DispatchResult[]> {
    const results = await Promise.all(this.dispatchers.map(d => d.dispatchAggregateEvents(aggregate)));
    return results.flat();
  }
}
