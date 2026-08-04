import { ValueObject } from '../kernel/ValueObject';
import { UniqueId } from '../common/UniqueId';

interface CorrelationIdProps {
  value: string;
}

export class CorrelationId extends ValueObject<CorrelationIdProps> {
  private constructor(props: CorrelationIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(id?: string): CorrelationId {
    return new CorrelationId({ value: id || UniqueId.generate() });
  }
}
