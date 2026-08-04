import { ValueObject } from '../../../../shared/kernel/ValueObject';

interface CurrencyProps extends Record<string, unknown> {
  amount: number;
  code: string;
}

export class Currency extends ValueObject<CurrencyProps> {
  private constructor(props: CurrencyProps) {
    super(props);
  }

  public static create(amount: number, code: string = 'IDR'): Currency {
    if (amount < 0) throw new Error('Currency amount cannot be negative');
    
    return new Currency({ amount, code });
  }

  get amount(): number { return this.props.amount; }
  get code(): string { return this.props.code; }
}
