import { AggregateRoot } from '../../../../shared/kernel/AggregateRoot';
export interface InventoryMovementProps extends Record<string, unknown> {
  skuId: string; sourceBinId?: string; targetBinId: string; quantity: number; reason: string;
}
export class InventoryMovement extends AggregateRoot<InventoryMovementProps> {
  private constructor(props: InventoryMovementProps, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create(props: InventoryMovementProps, id: string, tenantId: string): InventoryMovement {
    return new InventoryMovement(props, id, tenantId);
  }
}
