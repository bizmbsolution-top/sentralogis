import { Entity } from '../../../shared/kernel/Entity';
import { Result } from '../../../shared/kernel/Result';
import { ApprovalLevel } from './ApprovalLevel';
export interface ApprovalWorkflowProps<TTarget> extends Record<string, unknown> { readonly requestId: string; readonly currentLevel: ApprovalLevel; }
export class ApprovalWorkflow<TTarget> extends Entity<ApprovalWorkflowProps<TTarget>> {
  private constructor(props: ApprovalWorkflowProps<TTarget>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TTarget>(props: ApprovalWorkflowProps<TTarget>, id: string, tenantId: string): Result<ApprovalWorkflow<TTarget>> { return Result.ok(new ApprovalWorkflow<TTarget>(props, id, tenantId)); }
  public static restore<TTarget>(props: ApprovalWorkflowProps<TTarget>, id: string, tenantId: string): ApprovalWorkflow<TTarget> { return new ApprovalWorkflow<TTarget>(props, id, tenantId); }
}
