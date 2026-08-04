import { Entity } from '../../../shared/kernel/Entity';
import { Result } from '../../../shared/kernel/Result';
import { TimelineType } from './TimelineType';
import { TimelineActor } from './TimelineActor';
import { TimelineEvent } from './TimelineEvent';
export interface TimelineEntryProps<TPayload> extends Record<string, unknown> { readonly type: TimelineType; readonly actor: TimelineActor; readonly timestamp: Date; readonly event: TimelineEvent<TPayload>; }
export class TimelineEntry<TPayload> extends Entity<TimelineEntryProps<TPayload>> {
  private constructor(props: TimelineEntryProps<TPayload>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TPayload>(props: TimelineEntryProps<TPayload>, id: string, tenantId: string): Result<TimelineEntry<TPayload>> { return Result.ok(new TimelineEntry<TPayload>(props, id, tenantId)); }
  public static restore<TPayload>(props: TimelineEntryProps<TPayload>, id: string, tenantId: string): TimelineEntry<TPayload> { return new TimelineEntry<TPayload>(props, id, tenantId); }
}
