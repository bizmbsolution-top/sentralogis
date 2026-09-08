/**
 * Sentralogis — SBU Forwarding Wave 1
 * lib/domain/forwarding/repository.ts
 *
 * Canonical repository for Forwarding operational tables.
 * Owns all persistence mechanics for fw_* tables.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  ForwardingOrderHeader,
  ForwardingConsolidation,
  ForwardingContainerAssignment,
  ForwardingContainerItem,
} from './types';

export interface CreateOrderHeaderInput {
  tenant_id: string;
  work_order_id: string;
  customer_id: string;
  service_type?: 'FCL' | 'LCL';
  vessel_name?: string | null;
  voyage_no?: string | null;
  etd?: string | null;
  eta?: string | null;
  origin_port_id?: string | null;
  dest_port_id?: string | null;
  cargo_owner_name?: string | null;
  cargo_owner_email?: string | null;
  cargo_owner_phone?: string | null;
  consignee_name?: string | null;
  consignee_email?: string | null;
  consignee_phone?: string | null;
  selling_price_snapshot?: number | null;
  status?: string;
  created_by?: string | null;
}

export interface CreateConsolidationInput {
  tenant_id: string;
  vessel_name: string;
  voyage_number?: string | null;
  origin_port: string;
  destination_port: string;
  etd?: string | null;
  eta?: string | null;
  shipping_line_name?: string | null;
  consol_warehouse_origin_id?: string | null;
  consol_warehouse_destination_id?: string | null;
  status?: string;
}

export interface CreateContainerAssignmentInput {
  tenant_id: string;
  consolidation_id: string;
  container_number: string;
  container_type: string;
  seal_number?: string | null;
  bl_number?: string | null;
  max_volume_cbm?: number | null;
  status?: string;
}

export interface CreateContainerItemInput {
  tenant_id: string;
  container_assignment_id: string;
  wo_item_id: string;
  volume_cbm?: number | null;
  gross_weight_kg?: number | null;
  packages?: number | null;
  package_type?: string | null;
  commodity?: string | null;
  description?: string | null;
  delivery_type?: string | null;
  delivery_address?: string | null;
  delivery_contact?: string | null;
  delivery_phone?: string | null;
  pickup_wo_id?: string | null;
  port_haulage_origin_wo_id?: string | null;
  port_haulage_dest_wo_id?: string | null;
  last_mile_wo_id?: string | null;
  price_master_id?: string | null;
  sell_price_snapshot?: number | null;
}

export class ForwardingRepository {
  public async createOrderHeader(input: CreateOrderHeaderInput): Promise<ForwardingOrderHeader> {
    const { data, error } = await supabaseAdmin
      .from('fw_order_headers')
      .insert({
        tenant_id: input.tenant_id,
        work_order_id: input.work_order_id,
        customer_id: input.customer_id,
        service_type: input.service_type || 'FCL',
        vessel_name: input.vessel_name,
        voyage_no: input.voyage_no,
        etd: input.etd,
        eta: input.eta,
        origin_port_id: input.origin_port_id,
        dest_port_id: input.dest_port_id,
        cargo_owner_name: input.cargo_owner_name,
        cargo_owner_email: input.cargo_owner_email,
        cargo_owner_phone: input.cargo_owner_phone,
        consignee_name: input.consignee_name,
        consignee_email: input.consignee_email,
        consignee_phone: input.consignee_phone,
        selling_price_snapshot: input.selling_price_snapshot,
        status: input.status || 'need_assignment',
        created_by: input.created_by,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create forwarding order header: ${error?.message ?? 'unknown'}`);
    }

    return data as ForwardingOrderHeader;
  }

  public async findOrderHeaderById(id: string, tenantId: string): Promise<ForwardingOrderHeader | null> {
    const { data, error } = await supabaseAdmin
      .from('fw_order_headers')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;
    return data as ForwardingOrderHeader;
  }

  public async listOrderHeadersByTenant(tenantId: string): Promise<ForwardingOrderHeader[]> {
    const { data, error } = await supabaseAdmin
      .from('fw_order_headers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as ForwardingOrderHeader[];
  }

  public async createConsolidation(input: CreateConsolidationInput): Promise<ForwardingConsolidation> {
    const { data, error } = await supabaseAdmin
      .from('fw_consolidations')
      .insert({
        tenant_id: input.tenant_id,
        vessel_name: input.vessel_name,
        voyage_number: input.voyage_number,
        origin_port: input.origin_port,
        destination_port: input.destination_port,
        etd: input.etd,
        eta: input.eta,
        shipping_line_name: input.shipping_line_name,
        consol_warehouse_origin_id: input.consol_warehouse_origin_id,
        consol_warehouse_destination_id: input.consol_warehouse_destination_id,
        status: input.status || 'open',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create consolidation: ${error?.message ?? 'unknown'}`);
    }

    return data as ForwardingConsolidation;
  }

  public async createContainerAssignment(input: CreateContainerAssignmentInput): Promise<ForwardingContainerAssignment> {
    const { data, error } = await supabaseAdmin
      .from('fw_container_assignments')
      .insert({
        tenant_id: input.tenant_id,
        consolidation_id: input.consolidation_id,
        container_number: input.container_number,
        container_type: input.container_type,
        seal_number: input.seal_number,
        bl_number: input.bl_number,
        max_volume_cbm: input.max_volume_cbm,
        status: input.status || 'empty',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create container assignment: ${error?.message ?? 'unknown'}`);
    }

    return data as ForwardingContainerAssignment;
  }

  public async createContainerItem(input: CreateContainerItemInput): Promise<ForwardingContainerItem> {
    const { data, error } = await supabaseAdmin
      .from('fw_container_items')
      .insert({
        tenant_id: input.tenant_id,
        container_assignment_id: input.container_assignment_id,
        wo_item_id: input.wo_item_id,
        volume_cbm: input.volume_cbm,
        gross_weight_kg: input.gross_weight_kg,
        packages: input.packages,
        package_type: input.package_type,
        commodity: input.commodity,
        description: input.description,
        delivery_type: input.delivery_type,
        delivery_address: input.delivery_address,
        delivery_contact: input.delivery_contact,
        delivery_phone: input.delivery_phone,
        pickup_wo_id: input.pickup_wo_id,
        port_haulage_origin_wo_id: input.port_haulage_origin_wo_id,
        port_haulage_dest_wo_id: input.port_haulage_dest_wo_id,
        last_mile_wo_id: input.last_mile_wo_id,
        price_master_id: input.price_master_id,
        sell_price_snapshot: input.sell_price_snapshot,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create container item: ${error?.message ?? 'unknown'}`);
    }

    return data as ForwardingContainerItem;
  }

  public async findConsolidationById(id: string, tenantId: string): Promise<ForwardingConsolidation | null> {
    const { data, error } = await supabaseAdmin
      .from('fw_consolidations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;
    return data as ForwardingConsolidation;
  }

  public async findContainerAssignmentsByConsolidationId(consolidationId: string, tenantId: string): Promise<ForwardingContainerAssignment[]> {
    const { data, error } = await supabaseAdmin
      .from('fw_container_assignments')
      .select('*')
      .eq('consolidation_id', consolidationId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data as ForwardingContainerAssignment[];
  }

  public async findContainerItemsByConsolidationId(consolidationId: string, tenantId: string): Promise<ForwardingContainerItem[]> {
    const { data, error } = await supabaseAdmin
      .from('fw_container_items')
      .select(`
        *,
        container_assignment:fw_container_assignments!inner (
          id, container_number, container_type, tenant_id
        )
      `)
      .eq('fw_container_assignments.consolidation_id', consolidationId)
      .eq('tenant_id', tenantId);

    if (error || !data) return [];
    return data as unknown as ForwardingContainerItem[];
  }

  public async updateContainerItem(id: string, updates: Record<string, unknown>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('fw_container_items')
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(`Failed to update container item: ${error.message}`);
  }

  public async updateContainerAssignment(id: string, updates: Record<string, unknown>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('fw_container_assignments')
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(`Failed to update container assignment: ${error.message}`);
  }

  public async updateConsolidation(id: string, updates: Record<string, unknown>): Promise<void> {
    const { error } = await supabaseAdmin
      .from('fw_consolidations')
      .update(updates)
      .eq('id', id);

    if (error) throw new Error(`Failed to update consolidation: ${error.message}`);
  }
}
