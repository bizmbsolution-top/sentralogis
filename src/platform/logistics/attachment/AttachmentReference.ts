import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface AttachmentReferenceProps extends Record<string, unknown> { readonly attachmentId: string; }
export class AttachmentReference extends ValueObject<AttachmentReferenceProps> {
  private constructor(props: AttachmentReferenceProps) { super(props); }
  public static create(props: AttachmentReferenceProps): Result<AttachmentReference> { return Result.ok(new AttachmentReference(props)); }
  public static restore(props: AttachmentReferenceProps): AttachmentReference { return new AttachmentReference(props); }
}
