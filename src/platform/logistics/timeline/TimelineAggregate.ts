import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/kernel/Result';
import { TimelineEntry } from './TimelineEntry';
export interface TimelineProps<TEntity, TPayload> extends Record<string, unknown> { readonly entityId: string; readonly entries: ReadonlyArray<TimelineEntry<TPayload>>; }
export class TimelineAggregate<TEntity, TPayload> extends AggregateRoot<TimelineProps<TEntity, TPayload>> {
  private constructor(props: TimelineProps<TEntity, TPayload>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TEntity, TPayload>(props: TimelineProps<TEntity, TPayload>, id: string, tenantId: string): Result<TimelineAggregate<TEntity, TPayload>> { return Result.ok(new TimelineAggregate<TEntity, TPayload>(props, id, tenantId)); }
  public static restore<TEntity, TPayload>(props: TimelineProps<TEntity, TPayload>, id: string, tenantId: string): TimelineAggregate<TEntity, TPayload> { return new TimelineAggregate<TEntity, TPayload>(props, id, tenantId); }
}
