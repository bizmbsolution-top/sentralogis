import { Result } from '../../../shared/kernel/Result';
export interface AvailabilityChecker<TEntity> { isAvailable(resourceId: string, timeframe: Readonly<TEntity>): Result<void>; }