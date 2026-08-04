import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
import { TimelineActor } from './TimelineActor';
export interface TimelineCommentProps extends Record<string, unknown> { readonly actor: TimelineActor; readonly text: string; readonly createdAt: Date; }
export class TimelineComment extends ValueObject<TimelineCommentProps> {
  private constructor(props: TimelineCommentProps) { super(props); }
  public static create(props: TimelineCommentProps): Result<TimelineComment> { return Result.ok(new TimelineComment(props)); }
  public static restore(props: TimelineCommentProps): TimelineComment { return new TimelineComment(props); }
}
