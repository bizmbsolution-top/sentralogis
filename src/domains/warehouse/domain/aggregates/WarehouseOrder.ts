import { AggregateRoot } from '../../../../shared/kernel/AggregateRoot';
export interface WarehouseOrderProps extends Record<string, unknown> {
  orderNumber: string; type: 'INBOUND' | 'OUTBOUND'; status: string; customerId: string;
}
export class WarehouseOrder extends AggregateRoot<WarehouseOrderProps> {
  private constructor(props: WarehouseOrderProps, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create(props: WarehouseOrderProps, id: string, tenantId: string): WarehouseOrder {
    return new WarehouseOrder(props, id, tenantId);
  }
}
