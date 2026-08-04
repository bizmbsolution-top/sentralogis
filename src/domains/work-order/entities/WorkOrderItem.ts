import { Entity } from '../../../shared/kernel/Entity';

export interface WorkOrderItemProps {
  workOrderId: string;
  lineNumber: number;
  productSkuId?: string;
  itemDescription?: string;
  requestedQuantity?: number;
  fulfilledQuantity?: number;
  uom?: string;
  fromWarehouseId?: string;
  fromBinId?: string;
  toWarehouseId?: string;
  toBinId?: string;
  batchNumber?: string;
  expiryDate?: string;
  unitCost?: number;
  metadata?: unknown;
  createdAt: string;
}

export class WorkOrderItem extends Entity<WorkOrderItemProps> {
  public static create(props: WorkOrderItemProps, id: string, tenantId: string): WorkOrderItem {
    return new WorkOrderItem(props, id, tenantId);
  }

  get isFulfilled(): boolean {
    const req = this.props.requestedQuantity || 0;
    const ful = this.props.fulfilledQuantity || 0;
    return ful >= req && req > 0;
  }
}
