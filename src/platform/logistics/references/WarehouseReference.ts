import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface WarehouseRefProps extends Record<string, unknown> { readonly warehouseId: string; readonly code: string; }
export class WarehouseReference extends ValueObject<WarehouseRefProps> {
  private constructor(props: WarehouseRefProps) { super(props); }
  public static create(props: WarehouseRefProps): Result<WarehouseReference> { return Result.ok(new WarehouseReference(props)); }
  public static restore(props: WarehouseRefProps): WarehouseReference { return new WarehouseReference(props); }
}
