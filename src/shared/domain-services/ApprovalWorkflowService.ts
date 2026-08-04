import { AggregateRoot } from '../kernel/AggregateRoot';

export interface ApprovalContext {
  approverId: string;
  comments?: string;
  level?: number;
}

export abstract class ApprovalWorkflowService<TAggregate extends AggregateRoot<unknown>> {
  abstract submitForApproval(aggregate: TAggregate, submitterId: string): Promise<void>;
  abstract approve(aggregate: TAggregate, context: ApprovalContext): Promise<void>;
  abstract reject(aggregate: TAggregate, context: ApprovalContext): Promise<void>;
  abstract cancelApproval(aggregate: TAggregate, context: ApprovalContext): Promise<void>;
}
