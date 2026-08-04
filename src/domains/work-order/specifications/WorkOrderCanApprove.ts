import { CompositeSpecification } from '../../../shared/common/Specification';
import { WorkOrder } from '../entities/WorkOrder';
import { WorkOrderStatus } from '../types/WorkOrderStatus';

export class WorkOrderCanApprove extends CompositeSpecification<WorkOrder> {
  isSatisfiedBy(candidate: WorkOrder): boolean {
    return (
      (candidate.props.status === WorkOrderStatus.DRAFT || candidate.props.status === WorkOrderStatus.PENDING_APPROVAL) &&
      candidate.items.length > 0
    );
  }
}
