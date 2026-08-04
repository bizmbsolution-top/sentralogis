import { Result } from '../../../shared/kernel/Result';
import { ApprovalDecision } from './ApprovalDecision';
export interface ApprovalHistory { getDecisions(requestId: string): Result<ReadonlyArray<ApprovalDecision>>; }