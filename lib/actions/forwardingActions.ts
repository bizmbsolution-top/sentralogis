'use server';

import { createClient } from '@/lib/supabase/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import type { IdentityResolutionError } from '@/lib/application/identity/errors';
import type { ForwardingConsolidation, ForwardingContainerAssignment } from '@/lib/domain/forwarding/types';

export interface ForwardingLocation {
  location_id: string;
  name: string;
  code: string | null;
  type: string | null;
  city: string | null;
  province: string | null;
}

export interface ForwardingPricingResult {
  sellingPrice: number;
  costing: { originCost: number; destinationCost: number };
  profit: number;
}

export async function fetchForwardingLocations(): Promise<ForwardingLocation[]> {
  const ctx = await resolveSessionIdentity();

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('md_locations')
      .select('id, name, location_id, code, type, city, province')
      .order('name', { ascending: true });

    if (error) {
      console.warn('fetchForwardingLocations error:', error.message);
      return [];
    }

    return ((data as any[]) || []).map((loc: any) => ({
      location_id: loc.location_id || loc.id,
      name: loc.name,
      code: loc.code || null,
      type: loc.type || null,
      city: loc.city || null,
      province: loc.province || null,
    })) as ForwardingLocation[];
  } catch (err) {
    console.error('fetchForwardingLocations exception:', err);
    return [];
  }
}

export async function fetchMasterSellingPrice(
  containerType: string,
): Promise<number | null> {
  await resolveSessionIdentity();

  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('fw_price_master')
    .select('sell_price')
    .eq('container_type', containerType)
    .eq('service_type', 'forwarding') as any).single();

  if (error || !data) return null;
  return data.sell_price;
}

export async function fetchMasterCosting(
  originPort: string,
  destinationPort: string,
  executionMode: 'OWN' | 'VENDOR' = 'OWN',
): Promise<{ originCost: number; destinationCost: number } | null> {
  await resolveSessionIdentity();

  const supabase = await createClient();

  const { data, error } = await (supabase
    .from('fw_price_master')
    .select('master_cost_origin_amount, master_cost_destination_amount')
    .eq('origin_port', originPort)
    .eq('destination_port', destinationPort) as any).single();

  if (error || !data) return null;

  return {
    originCost: data.master_cost_origin_amount || 0,
    destinationCost: data.master_cost_destination_amount || 0,
  };
}

export async function calculateForwardingPricing(
  containerType: string,
  originPort: string,
  destinationPort: string,
  executionMode: 'OWN' | 'VENDOR' = 'OWN',
): Promise<ForwardingPricingResult> {
  await resolveSessionIdentity();

  const [sellingPrice, costing] = await Promise.all([
    fetchMasterSellingPrice(containerType),
    fetchMasterCosting(originPort, destinationPort, executionMode),
  ]);

  const totalCost = (costing?.originCost || 0) + (costing?.destinationCost || 0);
  const profit = (sellingPrice || 0) - totalCost;

  return {
    sellingPrice: sellingPrice || 0,
    costing: costing || { originCost: 0, destinationCost: 0 },
    profit,
  };
}

export interface ForwardingWorkOrderListItem {
  id: string;
  wo_number: string;
  status: string;
  order_date?: string | null;
  execution_date?: string | null;
  customer?: {
    id: string;
    name: string;
    is_own?: boolean | null;
  } | null;
  wo_items?: Array<{
    id: string;
    item_code?: string | null;
    status?: string | null;
    unit_price?: number | null;
    total_revenue?: number | null;
    fw_container_items?: Array<{
      id: string;
      volume_cbm?: number | null;
      gross_weight_kg?: number | null;
      container_assignment_id?: string | null;
      container_assignment?: {
        container_number?: string | null;
      } | null;
    }> | null;
  }> | null;
}

export async function fetchForwardingWorkOrders(): Promise<ForwardingWorkOrderListItem[]> {
  const ctx = await resolveSessionIdentity();
  assertPermission(ctx, 'commercial:read');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      wo_number,
      status,
      order_date,
      execution_date,
      customer:md_entities!customer_id (id, name, is_own),
      wo_items (
        id,
        item_code,
        status,
        unit_price,
        total_revenue,
        fw_container_items (
          id,
          volume_cbm,
          gross_weight_kg,
          container_assignment_id,
          container_assignment:fw_container_assignments (container_number)
        )
      )
    `)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.warn('fetchForwardingWorkOrders error:', error?.message ?? 'unknown');
    return [];
  }

  return (data as unknown as ForwardingWorkOrderListItem[]) || [];
}

export interface ForwardingMasterPrice {
  id: string;
  service_type: string;
  container_type?: string | null;
  delivery_type: string;
  origin_port: string;
  destination_port: string;
  sell_price?: number | null;
  master_cost_origin_amount?: number | null;
  master_cost_destination_amount?: number | null;
  is_active?: boolean | null;
  [key: string]: any;
}

export async function fetchForwardingMasterPrices(tenantId?: string): Promise<ForwardingMasterPrice[]> {
  const ctx = await resolveSessionIdentity();
  assertPermission(ctx, 'commercial:read');

  const supabase = await createClient();
  const resolvedTenantId = tenantId || ctx.tenantId;

  const { data, error } = await supabase
    .from('fw_price_master')
    .select('*')
    .eq('tenant_id', resolvedTenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.warn('fetchForwardingMasterPrices error:', error?.message ?? 'unknown');
    return [];
  }

  return (data as unknown as ForwardingMasterPrice[]) || [];
}

export interface ForwardingWorkOrderDetail {
  id: string;
  wo_number: string;
  status: string;
  order_date?: string | null;
  execution_date?: string | null;
  notes?: string | null;
  customer?: {
    id: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    is_own?: boolean | null;
  } | null;
  wo_items?: Array<{
    id: string;
    item_code?: string | null;
    status?: string | null;
    unit_price?: number | null;
    total_revenue?: number | null;
    fw_container_items?: Array<{
      id: string;
      volume_cbm?: number | null;
      gross_weight_kg?: number | null;
      container_assignment_id?: string | null;
      container_assignment?: {
        id: string;
        container_number?: string | null;
        container_type?: string | null;
        consol?: {
          id: string;
          consol_number: string;
          vessel_name?: string | null;
          voyage_number?: string | null;
          origin_port: string;
          destination_port: string;
        } | null;
      } | null;
      delivery_type?: string | null;
      delivery_address?: string | null;
      pickup_address?: string | null;
      commodity?: string | null;
      sell_price_snapshot?: number | null;
      is_deconsoled?: boolean | null;
      deconsoled_at?: string | null;
      pickup_wo?: {
        id: string;
        wo_number: string;
        status: string;
      } | null;
      last_mile_wo?: {
        id: string;
        wo_number: string;
        status: string;
      } | null;
    }> | null;
  }> | null;
}

export async function getForwardingWorkOrderDetail(id: string): Promise<ForwardingWorkOrderDetail | null> {
  const ctx = await resolveSessionIdentity();
  assertPermission(ctx, 'commercial:read');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('work_orders')
    .select(`
      id,
      wo_number,
      status,
      order_date,
      execution_date,
      notes,
      customer:md_entities!customer_id (id, name, phone, address, is_own),
      wo_items (
        id,
        item_code,
        status,
        unit_price,
        total_revenue,
        fw_container_items (
          id,
          volume_cbm,
          gross_weight_kg,
          container_assignment_id,
          container_assignment:fw_container_assignments (
            id,
            container_number,
            container_type,
            consol:fw_consolidations (
              id,
              consol_number,
              vessel_name,
              voyage_number,
              origin_port,
              destination_port
            )
          ),
          delivery_type,
          delivery_address,
          pickup_address,
          commodity,
          sell_price_snapshot,
          is_deconsoled,
          deconsoled_at,
          pickup_wo:work_orders!pickup_wo_id (id, wo_number, status),
          last_mile_wo:work_orders!last_mile_wo_id (id, wo_number, status)
        )
      )
    `)
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (error || !data) {
    console.warn('getForwardingWorkOrderDetail error:', error?.message ?? 'unknown');
    return null;
  }

  return data as unknown as ForwardingWorkOrderDetail;
}

// ============================================================================
// CONSOL MANAGER SERVER ACTIONS
// ============================================================================

export interface ForwardingConsolidationDetail {
  id: string;
  tenant_id: string;
  consol_number: string;
  vessel_name: string;
  voyage_number?: string | null;
  origin_port: string;
  destination_port: string;
  etd?: string | null;
  eta?: string | null;
  actual_etd?: string | null;
  actual_eta?: string | null;
  shipping_line_name?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
  containers?: ForwardingContainerAssignment[];
  items?: Array<{
    id: string;
    wo_item_id: string;
    volume_cbm?: number | null;
    gross_weight_kg?: number | null;
    packages?: number | null;
    package_type?: string | null;
    commodity?: string | null;
    description?: string | null;
    delivery_type?: string | null;
    delivery_address?: string | null;
    is_deconsoled?: boolean | null;
    deconsoled_at?: string | null;
    wo_item?: {
      id: string;
      item_code?: string | null;
      status?: string | null;
      work_order?: {
        id: string;
        wo_number: string;
        customer_id: string;
        status: string;
        customer?: {
          id: string;
          name: string;
        } | null;
      } | null;
    } | null;
  }>;
}

export async function fetchConsolidations(tenantId?: string): Promise<ForwardingConsolidation[]> {
  const ctx = await resolveSessionIdentity();
  assertPermission(ctx, 'commercial:read');

  const supabase = await createClient();
  const resolvedTenantId = tenantId || ctx.tenantId;

  const { data, error } = await supabase
    .from('fw_consolidations')
    .select('*')
    .eq('tenant_id', resolvedTenantId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.warn('fetchConsolidations error:', error?.message ?? 'unknown');
    return [];
  }

  return (data as unknown as ForwardingConsolidation[]) || [];
}

export async function getConsolidationDetail(id: string): Promise<ForwardingConsolidationDetail | null> {
  const ctx = await resolveSessionIdentity();
  assertPermission(ctx, 'commercial:read');

  const supabase = await createClient();

  const { data: consol, error: consolError } = await supabase
    .from('fw_consolidations')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (consolError || !consol) {
    console.warn('getConsolidationDetail error:', consolError?.message ?? 'not found');
    return null;
  }

  const { data: containers, error: containersError } = await supabase
    .from('fw_container_assignments')
    .select('*')
    .eq('consolidation_id', id)
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: true });

  if (containersError) {
    console.warn('getConsolidationDetail containers error:', containersError.message);
  }

  const containerIds = (containers || []).map(c => c.id);

  let items: any[] = [];
  if (containerIds.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('fw_container_items')
      .select(`
        id, wo_item_id, volume_cbm, gross_weight_kg, packages, package_type,
        commodity, description, delivery_type, delivery_address,
        is_deconsoled, deconsoled_at, goods_received_at,
        wo_item:wo_items!inner (
          id, item_code, status, wo_id,
          work_order:work_orders!inner (
            id, wo_number, customer_id, status, sbu_type,
            customer:md_entities!customer_id (id, name)
          )
        )
      `)
      .in('container_assignment_id', containerIds)
      .eq('tenant_id', ctx.tenantId);

    if (itemsError) {
      console.warn('getConsolidationDetail items error:', itemsError.message);
    } else {
      items = itemsData || [];
    }
  }

  return {
    ...consol,
    containers: (containers || []) as any,
    items: items as any,
  } as ForwardingConsolidationDetail;
}

export async function stuffContainer(
  consolId: string,
  containerAssignmentId: string,
  woItemIds: string[],
  sealNumber?: string | null,
  blNumber?: string | null,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const ctx = await resolveSessionIdentity();
  assertPermission(ctx, 'commercial:manage');

  const supabase = await createClient();
  const tenant_id = ctx.tenantId;

  const { data: container, error: containerError } = await supabase
    .from('fw_container_assignments')
    .select('id, consolidation_id, status, max_volume_cbm, container_number')
    .eq('id', containerAssignmentId)
    .eq('tenant_id', tenant_id)
    .single();

  if (containerError || !container) {
    return { success: false, error: 'Container tidak ditemukan' };
  }

  if (container.consolidation_id !== consolId) {
    return { success: false, error: 'Container bukan bagian dari konsolidasi ini' };
  }

  if (container.status === 'stuffed' || container.status === 'shipped') {
    return { success: false, error: 'Container sudah di-stuff / shipped' };
  }

  const { data: existingItems, error: existingItemsError } = await supabase
    .from('fw_container_items')
    .select('wo_item_id, volume_cbm')
    .eq('container_assignment_id', containerAssignmentId)
    .eq('tenant_id', tenant_id);

  if (existingItemsError) {
    return { success: false, error: 'Gagal memuat data container' };
  }

  const existingWoItemIds = new Set((existingItems || []).map(i => i.wo_item_id));
  const duplicateItems = woItemIds.filter(woId => existingWoItemIds.has(woId));
  if (duplicateItems.length > 0) {
    return { success: false, error: `Item ${duplicateItems.join(', ')} sudah di-assign ke container ini` };
  }

  const { data: otherAssignments, error: otherAssignmentsError } = await supabase
    .from('fw_container_items')
    .select('id, container_assignment_id')
    .in('wo_item_id', woItemIds)
    .neq('container_assignment_id', containerAssignmentId)
    .eq('tenant_id', tenant_id);

  if (otherAssignmentsError) {
    return { success: false, error: 'Gagal memuat data assignment lain' };
  }

  if (otherAssignments && otherAssignments.length > 0) {
    return { success: false, error: 'Salah satu item sudah di-assign ke container lain' };
  }

  const updateData: any = {
    status: 'stuffed',
    updated_at: new Date().toISOString(),
  };
  if (sealNumber) updateData.seal_number = sealNumber;
  if (blNumber) updateData.bl_number = blNumber;

  const { error: updateContainerError } = await supabase
    .from('fw_container_assignments')
    .update(updateData)
    .eq('id', containerAssignmentId);

  if (updateContainerError) {
    return { success: false, error: 'Gagal update container assignment' };
  }

  for (const wo_item_id of woItemIds) {
    await supabase
      .from('fw_container_items')
      .update({
        is_deconsoled: false,
        deconsoled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('wo_item_id', wo_item_id)
      .eq('container_assignment_id', containerAssignmentId);

    const { data: woItem } = await supabase
      .from('wo_items')
      .select('id, status')
      .eq('id', wo_item_id)
      .single();

    if (woItem && woItem.status && !['DONE', 'COMPLETED', 'STUFFED', 'SHIPPED'].includes(woItem.status)) {
      await supabase
        .from('wo_items')
        .update({ status: 'STUFFED', updated_at: new Date().toISOString() })
        .eq('id', wo_item_id);
    }
  }

  const { data: consol } = await supabase
    .from('fw_consolidations')
    .select('status')
    .eq('id', consolId)
    .eq('tenant_id', tenant_id)
    .single();

  if (consol) {
    const { data: allContainers } = await supabase
      .from('fw_container_assignments')
      .select('status')
      .eq('consolidation_id', consolId)
      .eq('tenant_id', tenant_id);

    if (allContainers && allContainers.length > 0) {
      const allStuffed = allContainers.every(c => c.status === 'stuffed' || c.status === 'shipped');
      if (allStuffed && consol.status === 'open') {
        await supabase
          .from('fw_consolidations')
          .update({ status: 'stuffing', updated_at: new Date().toISOString() })
          .eq('id', consolId);
      }
    }
  }

  return { success: true, message: 'Stuffing berhasil disimpan' };
}

export async function deconsolConsolidation(id: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const ctx = await resolveSessionIdentity();
  assertPermission(ctx, 'commercial:manage');

  const { ForwardingService } = await import('@/lib/domain/forwarding/service');
  const { ServiceRequestService } = await import('@/lib/domain/service-contracts/service-request-service');

  const forwardingService = new ForwardingService();
  const serviceRequestService = new ServiceRequestService();

  const srIssuer = async (args: {
    tenant_id: string;
    source_domain: 'FORWARDING';
    target_domain: 'TRUCKING';
    work_order_id: string;
    service_product_sku: string;
    request_payload: any;
    idempotency_key: string;
  }) => {
    const result = await serviceRequestService.issueRequest(args, true);
    return {
      request: { assigned_domain_job_id: (result.request as any).assigned_domain_job_id || null },
      dispatchResult: result.dispatchResult || undefined,
    };
  };

  try {
    const result = await forwardingService.deconsolConsolidation(ctx, id, srIssuer);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal deconsol' };
  }
}

// ============================================================================
// CARGO OWNER TRACKING SERVER ACTION
// ============================================================================

export interface ForwardingTrackingResult {
  commodity?: string | null;
  description?: string | null;
  volume_cbm?: number | null;
  gross_weight_kg?: number | null;
  packages?: number | null;
  package_type?: string | null;
  delivery_type?: string | null;
  delivery_address?: string | null;
  delivery_contact?: string | null;
  delivery_phone?: string | null;
  goods_received_at?: string | null;
  is_deconsoled?: boolean | null;
  deconsoled_at?: string | null;
  container?: {
    container_number?: string | null;
    container_type?: string | null;
    seal_number?: string | null;
    bl_number?: string | null;
    status?: string | null;
    consolidation?: {
      consol_number?: string | null;
      vessel_name?: string | null;
      voyage_number?: string | null;
      origin_port?: string | null;
      destination_port?: string | null;
      etd?: string | null;
      eta?: string | null;
      actual_etd?: string | null;
      actual_eta?: string | null;
      shipping_line_name?: string | null;
      status?: string | null;
    } | null;
  } | null;
  work_order?: {
    wo_number?: string | null;
    status?: string | null;
    order_date?: string | null;
    customer_name?: string | null;
  } | null;
  last_mile_wo?: {
    wo_number?: string | null;
    status?: string | null;
  } | null;
}

export async function getForwardingTrackingByToken(token: string): Promise<ForwardingTrackingResult | null> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length === 0) {
    return null;
  }

  const supabase = await createClient();

  const { data: item, error: itemError } = await (supabase
    .from('fw_container_items')
    .select(`
      id,
      volume_cbm,
      gross_weight_kg,
      packages,
      package_type,
      commodity,
      description,
      delivery_type,
      delivery_address,
      delivery_contact,
      delivery_phone,
      goods_received_at,
      is_deconsoled,
      deconsoled_at,
      container_assignment:fw_container_assignments!inner (
        id,
        container_number,
        container_type,
        seal_number,
        bl_number,
        status,
        consolidation:fw_consolidations (
          id,
          consol_number,
          vessel_name,
          voyage_number,
          origin_port,
          destination_port,
          etd,
          eta,
          actual_etd,
          actual_eta,
          shipping_line_name,
          status
        )
      ),
      wo_item:wo_items!inner (
        id,
        item_code,
        status,
        work_order:work_orders!inner (
          id,
          wo_number,
          status,
          order_date,
          customer:md_entities!customer_id (
            id,
            name
          )
        )
      ),
      last_mile_wo:work_orders!last_mile_wo_id (
        id,
        wo_number,
        status
      )
    `)
    .eq('tracking_token' as any, trimmed) as any)
    .maybeSingle();

  if (itemError || !item) {
    return null;
  }

  return {
    commodity: item.commodity ?? null,
    description: item.description ?? null,
    volume_cbm: item.volume_cbm ?? null,
    gross_weight_kg: item.gross_weight_kg ?? null,
    packages: item.packages ?? null,
    package_type: item.package_type ?? null,
    delivery_type: item.delivery_type ?? null,
    delivery_address: item.delivery_address ?? null,
    delivery_contact: item.delivery_contact ?? null,
    delivery_phone: item.delivery_phone ?? null,
    goods_received_at: item.goods_received_at ?? null,
    is_deconsoled: item.is_deconsoled ?? false,
    deconsoled_at: item.deconsoled_at ?? null,
    container: item.container_assignment
      ? {
          container_number: item.container_assignment.container_number,
          container_type: item.container_assignment.container_type,
          seal_number: item.container_assignment.seal_number ?? null,
          bl_number: item.container_assignment.bl_number ?? null,
          status: item.container_assignment.status,
          consolidation: item.container_assignment.consolidation
            ? {
                consol_number: item.container_assignment.consolidation.consol_number,
                vessel_name: item.container_assignment.consolidation.vessel_name,
                voyage_number: item.container_assignment.consolidation.voyage_number ?? null,
                origin_port: item.container_assignment.consolidation.origin_port,
                destination_port: item.container_assignment.consolidation.destination_port,
                etd: item.container_assignment.consolidation.etd ?? null,
                eta: item.container_assignment.consolidation.eta ?? null,
                actual_etd: item.container_assignment.consolidation.actual_etd ?? null,
                actual_eta: item.container_assignment.consolidation.actual_eta ?? null,
                shipping_line_name: item.container_assignment.consolidation.shipping_line_name ?? null,
                status: item.container_assignment.consolidation.status,
              }
            : null,
        }
      : null,
    work_order: item.wo_item?.work_order
      ? {
          wo_number: item.wo_item.work_order.wo_number,
          status: item.wo_item.work_order.status,
          order_date: item.wo_item.work_order.order_date ?? null,
          customer_name: item.wo_item.work_order.customer?.name ?? null,
        }
      : null,
    last_mile_wo: item.last_mile_wo
      ? {
          wo_number: item.last_mile_wo.wo_number,
          status: item.last_mile_wo.status,
        }
      : null,
  };
}
