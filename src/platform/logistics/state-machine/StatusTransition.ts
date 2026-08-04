import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface StatusTransitionProps<TStatus extends string> extends Record<string, unknown> { readonly fromStatus: TStatus; readonly toStatus: TStatus; readonly triggerEvent: string; }
export class StatusTransition<TStatus extends string> extends ValueObject<StatusTransitionProps<TStatus>> {
  private constructor(props: StatusTransitionProps<TStatus>) { super(props); }
  public static create<TStatus extends string>(props: StatusTransitionProps<TStatus>): Result<StatusTransition<TStatus>> { return Result.ok(new StatusTransition<TStatus>(props)); }
  public static restore<TStatus extends string>(props: StatusTransitionProps<TStatus>): StatusTransition<TStatus> { return new StatusTransition<TStatus>(props); }
}
