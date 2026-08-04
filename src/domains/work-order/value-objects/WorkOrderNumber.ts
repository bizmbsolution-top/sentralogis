import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Guard } from '../../../shared/common/Guard';
import { ValidationError } from '../../../shared/errors/ValidationError';

interface WorkOrderNumberProps {
  value: string;
}

export class WorkOrderNumber extends ValueObject<WorkOrderNumberProps> {
  private constructor(props: WorkOrderNumberProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value?: string): WorkOrderNumber {
    const finalValue = value || `WON-${Date.now()}`;
    const guardResult = Guard.againstEmptyString(finalValue, 'WorkOrderNumber');
    if (!guardResult.succeeded) {
      throw new ValidationError(guardResult.message as string);
    }
    return new WorkOrderNumber({ value: finalValue });
  }
}
