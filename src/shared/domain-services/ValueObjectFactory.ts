import { ValueObject } from '../kernel/ValueObject';

export interface ValueObjectFactory<TValueObject extends ValueObject<TProps>, TProps extends Record<string, unknown>> {
  create(props: TProps): TValueObject;
}
