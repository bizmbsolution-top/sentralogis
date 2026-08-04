import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface StorageReferenceProps extends Record<string, unknown> { readonly bucket: string; readonly key: string; }
export class StorageReference extends ValueObject<StorageReferenceProps> {
  private constructor(props: StorageReferenceProps) { super(props); }
  public static create(props: StorageReferenceProps): Result<StorageReference> { return Result.ok(new StorageReference(props)); }
  public static restore(props: StorageReferenceProps): StorageReference { return new StorageReference(props); }
}
