import { CompositeSpecification } from '../../../shared/common/Specification';
import { WorkOrder } from '../entities/WorkOrder';
import { WorkOrderStatus } from '../types/WorkOrderStatus';

export class WorkOrderCanCancel extends CompositeSpecification<WorkOrder> {
  isSatisfiedBy(candidate: WorkOrder): boolean {
    return candidate.props.status !== WorkOrderStatus.COMPLETED && candidate.props.status !== WorkOrderStatus.CANCELLED;
  }
}
