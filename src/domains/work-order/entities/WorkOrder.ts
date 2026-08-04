import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/common/Result';
import { WorkOrderItem } from './WorkOrderItem';
import { WorkOrderStatus } from '../types/WorkOrderStatus';
import { WorkOrderPriority } from '../types/WorkOrderPriority';
import { WorkOrderCreated } from '../events/WorkOrderCreated';
import { WorkOrderUpdated } from '../events/WorkOrderUpdated';
import { WorkOrderApproved } from '../events/WorkOrderApproved';
import { WorkOrderCancelled } from '../events/WorkOrderCancelled';
import { WorkOrderCanApprove } from '../specifications/WorkOrderCanApprove';
import { WorkOrderCanCancel } from '../specifications/WorkOrderCanCancel';
import { DateProvider } from '../../../shared/utils/DateProvider';

export interface WorkOrderProps {
  correlationId: string;
  originatingOrgId: string;
  assignedOrgId?: string;
  woNumber: string;
  woType: string;
  priority?: string;
  status: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  notes?: string;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  targetDate?: string;
  completedAt?: string;
  metadata?: unknown;
  createdAt: string;
}

export class WorkOrder extends AggregateRoot<WorkOrderProps> {
  private _items: WorkOrderItem[] = [];

  get items(): ReadonlyArray<WorkOrderItem> {
    return this._items;
  }

  public static create(props: WorkOrderProps, id: string, tenantId: string, items: WorkOrderItem[] = []): WorkOrder {
    const wo = new WorkOrder(props, id, tenantId);
    wo._items = [...items];
    
    // Only emit Created event if this is truly a new creation (e.g. status is DRAFT and no events exist yet)
    if (props.status === WorkOrderStatus.DRAFT && wo.domainEvents.length === 0) {
      wo.addDomainEvent(new WorkOrderCreated(wo.id, wo.tenantId, wo.props.correlationId, { woNumber: wo.props.woNumber }));
    }
    
    return wo;
  }

  public approve(approverId: string): Result<void> {
    const spec = new WorkOrderCanApprove();
    if (!spec.isSatisfiedBy(this)) {
      return Result.fail<void>('Work order cannot be approved. It must be in DRAFT/PENDING state and have items.');
    }

    this.props.status = WorkOrderStatus.APPROVED;
    this.props.approvedBy = approverId;
    this.props.approvedAt = DateProvider.now().toISOString();

    this.addDomainEvent(new WorkOrderApproved(this.id, this.tenantId, this.props.correlationId, { approverId }));
    return Result.ok<void>();
  }

  public cancel(reason: string): Result<void> {
    const spec = new WorkOrderCanCancel();
    if (!spec.isSatisfiedBy(this)) {
      return Result.fail<void>('Work order cannot be cancelled.');
    }

    this.props.status = WorkOrderStatus.CANCELLED;
    this.props.notes = (this.props.notes ? this.props.notes + '\n' : '') + `Cancelled: ${reason}`;

    this.addDomainEvent(new WorkOrderCancelled(this.id, this.tenantId, this.props.correlationId, { reason }));
    return Result.ok<void>();
  }

  public addItem(item: WorkOrderItem): Result<void> {
    if (this.props.status !== WorkOrderStatus.DRAFT) {
      return Result.fail<void>('Cannot add items to a work order that is not in DRAFT state.');
    }
    this._items.push(item);
    this.addDomainEvent(new WorkOrderUpdated(this.id, this.tenantId, this.props.correlationId, { action: 'ITEM_ADDED', itemId: item.id }));
    return Result.ok<void>();
  }

  public removeItem(itemId: string): Result<void> {
    if (this.props.status !== WorkOrderStatus.DRAFT) {
      return Result.fail<void>('Cannot remove items from a work order that is not in DRAFT state.');
    }
    this._items = this._items.filter(i => i.id !== itemId);
    this.addDomainEvent(new WorkOrderUpdated(this.id, this.tenantId, this.props.correlationId, { action: 'ITEM_REMOVED', itemId }));
    return Result.ok<void>();
  }

  public changePriority(priority: WorkOrderPriority): Result<void> {
    this.props.priority = priority;
    this.addDomainEvent(new WorkOrderUpdated(this.id, this.tenantId, this.props.correlationId, { priority }));
    return Result.ok<void>();
  }

  public changeDescription(description: string): Result<void> {
    this.props.description = description;
    this.addDomainEvent(new WorkOrderUpdated(this.id, this.tenantId, this.props.correlationId, { description }));
    return Result.ok<void>();
  }

  public changeTargetDate(targetDate: string): Result<void> {
    this.props.targetDate = targetDate;
    this.addDomainEvent(new WorkOrderUpdated(this.id, this.tenantId, this.props.correlationId, { targetDate }));
    return Result.ok<void>();
  }
}
