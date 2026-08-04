import { JobOrder } from '../job-order/JobOrder';
import { Result } from '../../../shared/kernel/Result';

export interface IJobOrderRepository {
  findById(id: string, tenantId: string): Promise<JobOrder | null>;
  save(jobOrder: JobOrder): Promise<Result<void>>;
}
