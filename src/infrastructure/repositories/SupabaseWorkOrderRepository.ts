import { IWorkOrderRepository } from '../../domains/work-order/repositories/IWorkOrderRepository';
import { WorkOrder, WorkOrderProps } from '../../domains/work-order/entities/WorkOrder';
import { WorkOrderItem, WorkOrderItemProps } from '../../domains/work-order/entities/WorkOrderItem';
import { createClient } from '../../../lib/supabase/server';
import { Database } from '../../../lib/supabase/types';

type WorkOrderRow = Database['public']['Tables']['wo_work_orders']['Row'];
type WorkOrderItemRow = Database['public']['Tables']['wo_work_order_items']['Row'];
type WorkOrderInsert = Database['public']['Tables']['wo_work_orders']['Insert'];
type WorkOrderItemInsert = Database['public']['Tables']['wo_work_order_items']['Insert'];

export class SupabaseWorkOrderRepository implements IWorkOrderRepository {
  private mapToDomain(row: WorkOrderRow, itemRows: WorkOrderItemRow[] = []): WorkOrder {
    const items = itemRows.map(i => {
      const itemProps: WorkOrderItemProps = {
        workOrderId: i.work_order_id,
        lineNumber: i.line_number,
        productSkuId: i.product_sku_id || undefined,
        itemDescription: i.item_description || undefined,
        requestedQuantity: i.requested_quantity || undefined,
        fulfilledQuantity: i.fulfilled_quantity || undefined,
        uom: i.uom || undefined,
        fromWarehouseId: i.from_warehouse_id || undefined,
        fromBinId: i.from_bin_id || undefined,
        toWarehouseId: i.to_warehouse_id || undefined,
        toBinId: i.to_bin_id || undefined,
        batchNumber: i.batch_number || undefined,
        expiryDate: i.expiry_date || undefined,
        unitCost: i.unit_cost || undefined,
        metadata: i.metadata,
        createdAt: i.created_at
      };
      return WorkOrderItem.create(itemProps, i.id, i.tenant_id);
    });

    const props: WorkOrderProps = {
      correlationId: row.correlation_id,
      originatingOrgId: row.originating_org_id,
      assignedOrgId: row.assigned_org_id || undefined,
      woNumber: row.wo_number,
      woType: row.wo_type,
      priority: row.priority || undefined,
      status: row.status,
      referenceType: row.reference_type || undefined,
      referenceId: row.reference_id || undefined,
      description: row.description || undefined,
      notes: row.notes || undefined,
      requestedBy: row.requested_by || undefined,
      approvedBy: row.approved_by || undefined,
      approvedAt: row.approved_at || undefined,
      targetDate: row.target_date || undefined,
      completedAt: row.completed_at || undefined,
      metadata: row.metadata,
      createdAt: row.created_at
    };

    return WorkOrder.create(props, row.id, row.tenant_id, items);
  }

  async findById(id: string): Promise<WorkOrder | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('wo_work_orders')
      .select('*, wo_work_order_items(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    
    // Supabase TS infers joined tables as array if relation exists
    const itemRows = (data as unknown as { wo_work_order_items: WorkOrderItemRow[] }).wo_work_order_items || [];
    return this.mapToDomain(data as unknown as WorkOrderRow, itemRows);
  }

  async save(entity: WorkOrder): Promise<void> {
    const supabase = await createClient();
    
    const woInsert: WorkOrderInsert = {
      id: entity.id,
      tenant_id: entity.tenantId,
      correlation_id: entity.props.correlationId,
      originating_org_id: entity.props.originatingOrgId,
      assigned_org_id: entity.props.assignedOrgId || undefined,
      wo_number: entity.props.woNumber,
      wo_type: entity.props.woType,
      priority: entity.props.priority || undefined,
      status: entity.props.status,
      reference_type: entity.props.referenceType || undefined,
      reference_id: entity.props.referenceId || undefined,
      description: entity.props.description || undefined,
      notes: entity.props.notes || undefined,
      requested_by: entity.props.requestedBy || undefined,
      approved_by: entity.props.approvedBy || undefined,
      approved_at: entity.props.approvedAt || undefined,
      target_date: entity.props.targetDate || undefined,
      completed_at: entity.props.completedAt || undefined,
      metadata: entity.props.metadata || undefined,
      created_at: entity.props.createdAt
    };
    
    // @ts-expect-error Supabase SSR type inference bug for upsert
    await supabase.from('wo_work_orders').upsert(woInsert);

    if (entity.items.length > 0) {
      const itemsInsert: WorkOrderItemInsert[] = entity.items.map(i => ({
        id: i.id,
        tenant_id: i.tenantId,
        work_order_id: i.props.workOrderId,
        line_number: i.props.lineNumber,
        product_sku_id: i.props.productSkuId || undefined,
        item_description: i.props.itemDescription || undefined,
        requested_quantity: i.props.requestedQuantity || undefined,
        fulfilled_quantity: i.props.fulfilledQuantity || undefined,
        uom: i.props.uom || undefined,
        from_warehouse_id: i.props.fromWarehouseId || undefined,
        from_bin_id: i.props.fromBinId || undefined,
        to_warehouse_id: i.props.toWarehouseId || undefined,
        to_bin_id: i.props.toBinId || undefined,
        batch_number: i.props.batchNumber || undefined,
        expiry_date: i.props.expiryDate || undefined,
        unit_cost: i.props.unitCost || undefined,
        metadata: i.props.metadata || undefined,
        created_at: i.props.createdAt
      }));
      // @ts-expect-error Supabase SSR type inference bug for upsert
      await supabase.from('wo_work_order_items').upsert(itemsInsert);
    }
  }

  async update(entity: WorkOrder): Promise<void> {
    await this.save(entity);
  }

  async delete(id: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from('wo_work_orders').delete().eq('id', id);
  }

  async search(filters: Record<string, string>): Promise<WorkOrder[]> {
    const supabase = await createClient();
    let query = supabase.from('wo_work_orders').select('*, wo_work_order_items(*)');
    
    if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId);
    if (filters.status) query = query.eq('status', filters.status);
    
    const { data } = await query;
    if (!data) return [];
    
    return data.map(d => {
      const itemRows = (d as unknown as { wo_work_order_items: WorkOrderItemRow[] }).wo_work_order_items || [];
      return this.mapToDomain(d as unknown as WorkOrderRow, itemRows);
    });
  }
}
