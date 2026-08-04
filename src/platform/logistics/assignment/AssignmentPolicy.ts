import { Result } from '../../../shared/kernel/Result';
export interface AssignmentPolicy<TEntity> { isAllowed(resourceId: string, target: Readonly<TEntity>): Result<void>; }