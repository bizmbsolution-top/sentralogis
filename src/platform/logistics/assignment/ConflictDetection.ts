import { Result } from '../../../shared/kernel/Result';
export interface ConflictDetection<TEntity> { checkConflicts(resourceId: string, target: Readonly<TEntity>): Result<ReadonlyArray<string>>; }