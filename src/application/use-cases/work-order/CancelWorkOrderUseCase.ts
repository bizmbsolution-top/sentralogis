import { IWorkOrderRepository } from '../../../domains/work-order/repositories/IWorkOrderRepository';
import { Result } from '../../../shared/common/Result';
import { IDomainEventPublisher } from '../../../shared/events/IDomainEventPublisher';

export class CancelWorkOrderUseCase {
  constructor(
    private repository: IWorkOrderRepository,
    private eventPublisher: IDomainEventPublisher
  ) {}

  async execute(id: string, reason: string): Promise<Result<void>> {
    const workOrder = await this.repository.findById(id);
    if (!workOrder) return Result.fail<void>('Work Order not found');

    const result = workOrder.cancel(reason);
    if (result.isFailure) return result;

    await this.repository.update(workOrder);
    await this.eventPublisher.publishAll(workOrder.domainEvents);
    workOrder.clearEvents();

    return Result.ok<void>();
  }
}
