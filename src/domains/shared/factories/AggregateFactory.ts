export interface AggregateFactory<TAggregate, TProps> {
  create(props: TProps, id?: string, tenantId?: string): TAggregate;
}
