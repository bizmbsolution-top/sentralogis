import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface ETAProps extends Record<string, unknown> { readonly estimatedTime: Date; readonly confidenceLevel: number; }
export class ETA extends ValueObject<ETAProps> {
  private constructor(props: ETAProps) { super(props); }
  public static create(props: ETAProps): Result<ETA> { return Result.ok(new ETA(props)); }
  public static restore(props: ETAProps): ETA { return new ETA(props); }
}
