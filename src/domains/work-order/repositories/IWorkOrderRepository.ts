import { IRepository } from '../../../shared/interfaces/IRepository';
import { WorkOrder } from '../entities/WorkOrder';

export interface IWorkOrderRepository extends IRepository<WorkOrder> {
  search(filters: Record<string, any>): Promise<WorkOrder[]>;
}
