import { Entity } from '../kernel/Entity';

export interface AttachmentMetadata {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  description?: string;
}

export type AttachmentType = 'IMAGE' | 'PDF' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' | 'POD' | 'INVOICE' | 'SIGNATURE' | 'BARCODE' | 'QR_CODE';

export abstract class AttachmentService<TEntity extends Entity<unknown>> {
  abstract attachDocument(entity: TEntity, fileBuffer: Buffer, type: AttachmentType, metadata: AttachmentMetadata): Promise<string>;
  abstract removeDocument(entity: TEntity, attachmentId: string): Promise<void>;
  abstract getAttachments<TAttachment>(entity: TEntity): Promise<TAttachment[]>;
  abstract generatePresignedUrl(attachmentId: string, expiresInSeconds: number): Promise<string>;
  
  // Future OCR / AI Vision integration
  abstract processOCR(attachmentId: string): Promise<Record<string, unknown>>;
}
