import { Result } from '../../../shared/kernel/Result';
export interface TransitionRule<TEntity> { evaluate(entity: Readonly<TEntity>, event: string): Result<void>; }
