import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface AttachmentMetadataProps extends Record<string, unknown> { readonly sizeBytes: number; readonly mimeType: string; readonly uploadedBy: string; }
export class AttachmentMetadata extends ValueObject<AttachmentMetadataProps> {
  private constructor(props: AttachmentMetadataProps) { super(props); }
  public static create(props: AttachmentMetadataProps): Result<AttachmentMetadata> { return Result.ok(new AttachmentMetadata(props)); }
  public static restore(props: AttachmentMetadataProps): AttachmentMetadata { return new AttachmentMetadata(props); }
}
