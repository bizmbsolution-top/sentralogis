import { Entity } from '../kernel/Entity';

export interface EntityFactory<TEntity extends Entity<TProps>, TProps> {
  create(props: TProps, id?: string, tenantId?: string): TEntity;
}
