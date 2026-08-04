import { Result } from '../../../shared/kernel/Result';
import { Attachment } from './Attachment';
import { AttachmentMetadata } from './AttachmentMetadata';
export interface IAttachmentProvider<TEntity> {
  upload(entity: Readonly<TEntity>, metadata: Readonly<AttachmentMetadata>, file: any): Result<Attachment<TEntity>>;
}
