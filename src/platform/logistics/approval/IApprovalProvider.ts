import { Result } from '../../../shared/kernel/Result';
import { ApprovalRequest } from './ApprovalRequest';
import { ApprovalLevel } from './ApprovalLevel';
export interface IApprovalProvider<TTarget> {
  requestApproval(targetId: string, level: ApprovalLevel): Result<ApprovalRequest<TTarget>>;
}
