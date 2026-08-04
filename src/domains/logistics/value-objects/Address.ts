import { ValueObject } from '../../../shared/kernel/ValueObject';
export interface AddressProps extends Record<string, unknown> { street: string; city: string; postalCode: string; country: string; }
export class Address extends ValueObject<AddressProps> {
  private constructor(props: AddressProps) { super(props); }
  public static create(props: AddressProps): Address { return new Address(props); }
}
