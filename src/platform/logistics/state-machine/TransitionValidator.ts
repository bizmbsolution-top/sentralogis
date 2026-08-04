import { Result } from '../../../shared/kernel/Result';
export class TransitionValidator<TStatus extends string> { public validate(from: TStatus, to: TStatus): Result<void> { return Result.ok<void>(); } }
