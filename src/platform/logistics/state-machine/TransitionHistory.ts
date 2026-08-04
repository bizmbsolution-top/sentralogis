import { Entity } from '../../../shared/kernel/Entity';
import { Result } from '../../../shared/kernel/Result';
export interface TransitionHistoryProps<TStatus extends string> extends Record<string, unknown> { readonly entityId: string; readonly from: TStatus; readonly to: TStatus; readonly timestamp: Date; }
export class TransitionHistory<TStatus extends string> extends Entity<TransitionHistoryProps<TStatus>> {
  private constructor(props: TransitionHistoryProps<TStatus>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TStatus extends string>(props: TransitionHistoryProps<TStatus>, id: string, tenantId: string): Result<TransitionHistory<TStatus>> { return Result.ok(new TransitionHistory<TStatus>(props, id, tenantId)); }
  public static restore<TStatus extends string>(props: TransitionHistoryProps<TStatus>, id: string, tenantId: string): TransitionHistory<TStatus> { return new TransitionHistory<TStatus>(props, id, tenantId); }
}
