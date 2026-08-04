import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface NotificationResultProps extends Record<string, unknown> { readonly success: boolean; readonly timestamp: Date; readonly providerResponse?: string; }
export class NotificationResult extends ValueObject<NotificationResultProps> {
  private constructor(props: NotificationResultProps) { super(props); }
  public static create(props: NotificationResultProps): Result<NotificationResult> { return Result.ok(new NotificationResult(props)); }
  public static restore(props: NotificationResultProps): NotificationResult { return new NotificationResult(props); }
}
