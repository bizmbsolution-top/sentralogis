import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface TimelineActorProps extends Record<string, unknown> { readonly actorId: string; readonly actorType: string; }
export class TimelineActor extends ValueObject<TimelineActorProps> {
  private constructor(props: TimelineActorProps) { super(props); }
  public static create(props: TimelineActorProps): Result<TimelineActor> { return Result.ok(new TimelineActor(props)); }
  public static restore(props: TimelineActorProps): TimelineActor { return new TimelineActor(props); }
}
