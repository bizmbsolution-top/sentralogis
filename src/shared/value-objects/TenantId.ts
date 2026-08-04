import { ValueObject } from '../kernel/ValueObject';
import { Guard } from '../common/Guard';
import { ValidationError } from '../errors/ValidationError';

interface TenantIdProps {
  value: string;
}

export class TenantId extends ValueObject<TenantIdProps> {
  private constructor(props: TenantIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(id: string): TenantId {
    const guardResult = Guard.againstEmptyString(id, 'TenantId');
    if (!guardResult.succeeded) {
      throw new ValidationError(guardResult.message as string);
    }
    return new TenantId({ value: id });
  }
}
