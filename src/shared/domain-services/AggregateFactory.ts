import { AggregateRoot } from '../kernel/AggregateRoot';

export interface AggregateFactory<TAggregate extends AggregateRoot<TProps>, TProps> {
  create(props: TProps, id?: string, tenantId?: string): TAggregate;
}
