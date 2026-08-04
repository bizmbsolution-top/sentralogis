import { ValueObject } from '../../../shared/kernel/ValueObject';
export interface DocumentRefProps extends Record<string, unknown> { documentId: string; type: string; url: string; }
export class DocumentReference extends ValueObject<DocumentRefProps> {
  private constructor(props: DocumentRefProps) { super(props); }
  public static create(props: DocumentRefProps): DocumentReference { return new DocumentReference(props); }
}
