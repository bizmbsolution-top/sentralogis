import { AggregateRoot } from '../kernel/AggregateRoot';
import { Entity } from '../kernel/Entity';

export abstract class ReconstitutionFactory {
  abstract reconstituteAggregate<TAggregate extends AggregateRoot<unknown>, TProps>(type: new (...args: unknown[]) => TAggregate, props: TProps, id: string, tenantId: string): TAggregate;
  abstract reconstituteEntity<TEntity extends Entity<unknown>, TProps>(type: new (...args: unknown[]) => TEntity, props: TProps, id: string, tenantId: string): TEntity;
  
  // Event Sourcing Support
  abstract reconstituteFromSnapshot<TAggregate extends AggregateRoot<unknown>>(snapshotPayload: string): TAggregate;
  abstract loadFromEvents<TAggregate extends AggregateRoot<unknown>>(aggregateId: string, events: unknown[]): TAggregate;
}
