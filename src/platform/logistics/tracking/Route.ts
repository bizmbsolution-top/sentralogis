import { Entity } from '../../../shared/kernel/Entity';
import { Result } from '../../../shared/kernel/Result';
import { TrackingPoint } from './TrackingPoint';
export interface RouteProps<TEntity> extends Record<string, unknown> { readonly trackingId: string; readonly points: ReadonlyArray<TrackingPoint>; }
export class Route<TEntity> extends Entity<RouteProps<TEntity>> {
  private constructor(props: RouteProps<TEntity>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TEntity>(props: RouteProps<TEntity>, id: string, tenantId: string): Result<Route<TEntity>> { return Result.ok(new Route<TEntity>(props, id, tenantId)); }
  public static restore<TEntity>(props: RouteProps<TEntity>, id: string, tenantId: string): Route<TEntity> { return new Route<TEntity>(props, id, tenantId); }
}
