import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/kernel/Result';
import { AssignmentStatus } from './AssignmentStatus';
export interface AssignmentProps<TEntity> extends Record<string, unknown> { readonly resourceId: string; readonly targetId: string; readonly status: AssignmentStatus; }
export class AssignmentAggregate<TEntity> extends AggregateRoot<AssignmentProps<TEntity>> {
  private constructor(props: AssignmentProps<TEntity>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TEntity>(props: AssignmentProps<TEntity>, id: string, tenantId: string): Result<AssignmentAggregate<TEntity>> { return Result.ok(new AssignmentAggregate<TEntity>(props, id, tenantId)); }
  public static restore<TEntity>(props: AssignmentProps<TEntity>, id: string, tenantId: string): AssignmentAggregate<TEntity> { return new AssignmentAggregate<TEntity>(props, id, tenantId); }
}
