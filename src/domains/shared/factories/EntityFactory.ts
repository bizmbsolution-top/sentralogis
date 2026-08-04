export interface EntityFactory<TEntity, TProps> {
  create(props: TProps, id?: string, tenantId?: string): TEntity;
}
