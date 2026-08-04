import { IWorkOrderRepository } from '../../../domains/work-order/repositories/IWorkOrderRepository';
import { CreateWorkOrderDTO } from '../../../domains/work-order/validators/WorkOrderValidator';
import { WorkOrder } from '../../../domains/work-order/entities/WorkOrder';
import { WorkOrderItem } from '../../../domains/work-order/entities/WorkOrderItem';
import { WorkOrderStatus } from '../../../domains/work-order/types/WorkOrderStatus';
import { WorkOrderNumber } from '../../../domains/work-order/value-objects/WorkOrderNumber';
import { UniqueId } from '../../../shared/common/UniqueId';
import { Result } from '../../../shared/common/Result';
import { IDomainEventPublisher } from '../../../shared/events/IDomainEventPublisher';
// Note: PermissionEngine, SessionManager, AuditService would be injected here via Phase 1B/1C

export class CreateWorkOrderUseCase {
  constructor(
    private repository: IWorkOrderRepository,
    private eventPublisher: IDomainEventPublisher
  ) {}

  async execute(dto: CreateWorkOrderDTO, userId: string, correlationId: string): Promise<Result<WorkOrder>> {
    const woId = UniqueId.generate();
    
    const items = dto.items.map((item, idx) => WorkOrderItem.create({
      workOrderId: woId,
      lineNumber: idx + 1,
      productSkuId: item.productSkuId,
      itemDescription: item.itemDescription,
      requestedQuantity: item.requestedQuantity,
      fulfilledQuantity: 0,
      uom: item.uom,
      createdAt: new Date().toISOString()
    }, UniqueId.generate(), dto.tenantId));

    const workOrder = WorkOrder.create({
      correlationId,
      originatingOrgId: dto.originatingOrgId,
      assignedOrgId: dto.assignedOrgId,
      woNumber: WorkOrderNumber.create().value,
      woType: dto.woType,
      priority: dto.priority || 'NORMAL',
      status: WorkOrderStatus.DRAFT,
      description: dto.description,
      targetDate: dto.targetDate,
      requestedBy: userId,
      createdAt: new Date().toISOString()
    }, woId, dto.tenantId, items);

    await this.repository.save(workOrder);
    await this.eventPublisher.publishAll(workOrder.domainEvents);
    workOrder.clearEvents();

    return Result.ok<WorkOrder>(workOrder);
  }
}
