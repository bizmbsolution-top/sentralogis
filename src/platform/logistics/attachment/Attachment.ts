import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/kernel/Result';
import { AttachmentType } from './AttachmentType';
import { StorageReference } from './StorageReference';
import { AttachmentMetadata } from './AttachmentMetadata';
export interface AttachmentProps<TEntity> extends Record<string, unknown> { readonly type: AttachmentType; readonly storageRef: StorageReference; readonly ownerId: string; readonly metadata: AttachmentMetadata; }
export class Attachment<TEntity> extends AggregateRoot<AttachmentProps<TEntity>> {
  private constructor(props: AttachmentProps<TEntity>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TEntity>(props: AttachmentProps<TEntity>, id: string, tenantId: string): Result<Attachment<TEntity>> { return Result.ok(new Attachment<TEntity>(props, id, tenantId)); }
  public static restore<TEntity>(props: AttachmentProps<TEntity>, id: string, tenantId: string): Attachment<TEntity> { return new Attachment<TEntity>(props, id, tenantId); }
}
