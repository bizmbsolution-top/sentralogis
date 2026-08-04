import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/kernel/Result';
import { ApprovalLevel } from './ApprovalLevel';
import { ApprovalStatus } from './ApprovalStatus';
export interface ApprovalRequestProps<TTarget> extends Record<string, unknown> { readonly targetId: string; readonly level: ApprovalLevel; readonly status: ApprovalStatus; }
export class ApprovalRequest<TTarget> extends AggregateRoot<ApprovalRequestProps<TTarget>> {
  private constructor(props: ApprovalRequestProps<TTarget>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TTarget>(props: ApprovalRequestProps<TTarget>, id: string, tenantId: string): Result<ApprovalRequest<TTarget>> { return Result.ok(new ApprovalRequest<TTarget>(props, id, tenantId)); }
  public static restore<TTarget>(props: ApprovalRequestProps<TTarget>, id: string, tenantId: string): ApprovalRequest<TTarget> { return new ApprovalRequest<TTarget>(props, id, tenantId); }
}
