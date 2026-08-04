import { ValueObject } from '../kernel/ValueObject';
import { Guard } from '../common/Guard';
import { ValidationError } from '../errors/ValidationError';

interface UserIdProps {
  value: string;
}

export class UserId extends ValueObject<UserIdProps> {
  private constructor(props: UserIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(id: string): UserId {
    const guardResult = Guard.againstEmptyString(id, 'UserId');
    if (!guardResult.succeeded) {
      throw new ValidationError(guardResult.message as string);
    }
    return new UserId({ value: id });
  }
}
