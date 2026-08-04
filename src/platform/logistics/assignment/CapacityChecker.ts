import { Result } from '../../../shared/kernel/Result';
export interface CapacityChecker<TEntity> { hasCapacity(resourceId: string, load: Readonly<TEntity>): Result<void>; }