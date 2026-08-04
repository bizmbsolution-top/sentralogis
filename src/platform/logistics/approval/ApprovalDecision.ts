import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
import { ApprovalStatus } from './ApprovalStatus';
export interface ApprovalDecisionProps extends Record<string, unknown> { readonly actorId: string; readonly decision: ApprovalStatus; readonly reason?: string; }
export class ApprovalDecision extends ValueObject<ApprovalDecisionProps> {
  private constructor(props: ApprovalDecisionProps) { super(props); }
  public static create(props: ApprovalDecisionProps): Result<ApprovalDecision> { return Result.ok(new ApprovalDecision(props)); }
  public static restore(props: ApprovalDecisionProps): ApprovalDecision { return new ApprovalDecision(props); }
}
