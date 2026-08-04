import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface TimelineEventProps<TPayload> extends Record<string, unknown> { readonly eventName: string; readonly payload: Readonly<TPayload>; }
export class TimelineEvent<TPayload> extends ValueObject<TimelineEventProps<TPayload>> {
  private constructor(props: TimelineEventProps<TPayload>) { super(props); }
  public static create<TPayload>(props: TimelineEventProps<TPayload>): Result<TimelineEvent<TPayload>> { return Result.ok(new TimelineEvent<TPayload>(props)); }
  public static restore<TPayload>(props: TimelineEventProps<TPayload>): TimelineEvent<TPayload> { return new TimelineEvent<TPayload>(props); }
}
