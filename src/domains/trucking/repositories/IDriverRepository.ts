import { Driver } from '../driver/Driver';
import { Result } from '../../../shared/kernel/Result';

export interface IDriverRepository {
  findById(id: string, tenantId: string): Promise<Driver | null>;
  save(driver: Driver): Promise<Result<void>>;
}
