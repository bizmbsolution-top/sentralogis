import { ValueObject } from '../kernel/ValueObject';
import { Guard } from '../common/Guard';
import { ValidationError } from '../errors/ValidationError';

interface OrganizationIdProps {
  value: string;
}

export class OrganizationId extends ValueObject<OrganizationIdProps> {
  private constructor(props: OrganizationIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(id: string): OrganizationId {
    const guardResult = Guard.againstEmptyString(id, 'OrganizationId');
    if (!guardResult.succeeded) {
      throw new ValidationError(guardResult.message as string);
    }
    return new OrganizationId({ value: id });
  }
}
