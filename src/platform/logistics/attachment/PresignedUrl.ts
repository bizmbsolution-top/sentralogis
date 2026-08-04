import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface PresignedUrlProps extends Record<string, unknown> { readonly url: string; readonly expiresAt: Date; }
export class PresignedUrl extends ValueObject<PresignedUrlProps> {
  private constructor(props: PresignedUrlProps) { super(props); }
  public static create(props: PresignedUrlProps): Result<PresignedUrl> { return Result.ok(new PresignedUrl(props)); }
  public static restore(props: PresignedUrlProps): PresignedUrl { return new PresignedUrl(props); }
}
