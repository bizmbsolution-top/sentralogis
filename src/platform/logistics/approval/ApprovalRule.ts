import { Result } from '../../../shared/kernel/Result';
export interface ApprovalRule<TTarget> { evaluate(target: Readonly<TTarget>): Result<void>; }