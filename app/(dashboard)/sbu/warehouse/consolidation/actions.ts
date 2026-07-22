'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function fetchConsolidationDataAdmin(warehouseId?: string) {
  let parcelQuery = supabaseAdmin
    .from('wh_parcel_inbound')
    .select(`
      *,
      customer:customer_id(name),
      location:location_id(code)
    `)
    .order('created_at', { ascending: false });

  if (warehouseId) {
    parcelQuery = parcelQuery.eq('warehouse_id', warehouseId);
  }

  const { data: parcels, error: parcelsErr } = await parcelQuery;
  if (parcelsErr) {
    console.error('Error fetching parcels:', parcelsErr);
  }

  let boxQuery = supabaseAdmin
    .from('wh_master_boxes')
    .select('*, location:location_id(code)')
    .order('created_at', { ascending: false });

  if (warehouseId) {
    boxQuery = boxQuery.eq('warehouse_id', warehouseId);
  }

  const { data: masterBoxes, error: boxesErr } = await boxQuery;
  if (boxesErr) {
    console.error('Error fetching master boxes:', boxesErr);
  }

  // Fetch locations
  let locQuery = supabaseAdmin.from('md_warehouse_locations').select('id, code, zone, rack, shelf, location_type, warehouse_id').eq('is_active', true).order('code');
  if (warehouseId) locQuery = locQuery.eq('warehouse_id', warehouseId);
  const { data: locations, error: locErr } = await locQuery;
  if (locErr) console.error('Error fetching locations:', locErr);

  // Fetch customers
  const { data: customers } = await supabaseAdmin
    .from('md_entities')
    .select('id, name')
    .order('name');

  return {
    parcels: parcels || [],
    masterBoxes: masterBoxes || [],
    locations: locations || [],
    customers: customers || []
  };
}

export async function registerParcelInboundAdmin(data: {
  tenant_id: string;
  warehouse_id: string;
  customer_id?: string;
  shipper_name: string;
  consignee_name: string;
  destination_city: string;
  consignee_address?: string;
  qty: number;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  location_id?: string;
  notes?: string;
  photo_url?: string;
  items?: any[];
}) {
  let tenantId = data.tenant_id;
  let warehouseId = data.warehouse_id;

  if (!tenantId || tenantId === '00000000-0000-0000-0000-000000000000' || tenantId.trim() === '') {
    const { data: tenant } = await supabaseAdmin.from('tenants').select('id').limit(1).single();
    if (tenant) tenantId = tenant.id;
  }

  if (!warehouseId || warehouseId === '00000000-0000-0000-0000-000000000000' || warehouseId.trim() === '') {
    const { data: wh } = await supabaseAdmin.from('md_warehouses').select('id, tenant_id').limit(1).single();
    if (wh) {
      warehouseId = wh.id;
      if (!tenantId) tenantId = wh.tenant_id;
    }
  }

  const code = `PCL-${Date.now().toString().slice(-6)}`;
  const cbm = Number(((data.length_cm * data.width_cm * data.height_cm) / 1000000).toFixed(4));

  const payload = {
    ...data,
    tenant_id: tenantId,
    warehouse_id: warehouseId,
    customer_id: data.customer_id && data.customer_id.trim() !== '' ? data.customer_id : null,
    location_id: data.location_id && data.location_id.trim() !== '' ? data.location_id : null,
    parcel_code: code,
    cbm,
    status: 'PUTAWAY',
    photo_url: data.photo_url || null,
    items: data.items || []
  };

  const { data: inserted, error } = await supabaseAdmin
    .from('wh_parcel_inbound')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  revalidatePath('/sbu/warehouse/consolidation');
  return inserted;
}

export async function createMasterBoxAdmin(
  destinationCity: string,
  parcelIds: string[],
  material: string,
  warehouseId: string,
  tenantId: string,
  staffName: string,
  locationId?: string
) {
  if (!parcelIds || parcelIds.length === 0) {
    throw new Error('Pilih minimal 1 parcel untuk dikonsolidasi');
  }

  let finalTenantId = tenantId;
  let finalWarehouseId = warehouseId;

  if (!finalTenantId || finalTenantId === '00000000-0000-0000-0000-000000000000' || finalTenantId.trim() === '') {
    const { data: tenant } = await supabaseAdmin.from('tenants').select('id').limit(1).single();
    if (tenant) finalTenantId = tenant.id;
  }

  if (!finalWarehouseId || finalWarehouseId === '00000000-0000-0000-0000-000000000000' || finalWarehouseId.trim() === '') {
    const { data: wh } = await supabaseAdmin.from('md_warehouses').select('id, tenant_id').limit(1).single();
    if (wh) {
      finalWarehouseId = wh.id;
      if (!finalTenantId) finalTenantId = wh.tenant_id;
    }
  }

  // Fetch selected parcels
  const { data: selectedParcels, error: fetchErr } = await supabaseAdmin
    .from('wh_parcel_inbound')
    .select('*')
    .in('id', parcelIds);

  if (fetchErr || !selectedParcels) throw new Error('Gagal mengambil data parcel terpilih');

  let totalWeight = 0;
  let totalCbm = 0;
  let totalQty = 0;
  const consigneeNames = new Set<string>();

  selectedParcels.forEach(p => {
    totalWeight += Number(p.weight_kg || 0);
    totalCbm += Number(p.cbm || 0);
    totalQty += Number(p.qty || 1);
    if (p.consignee_name) consigneeNames.add(p.consignee_name);
  });

  const cleanCity = destinationCity.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'HUB';
  const masterCode = `MBX-${cleanCity}-${Date.now().toString().slice(-6)}`;
  const consigneeSummary = Array.from(consigneeNames).slice(0, 3).join(', ') + (consigneeNames.size > 3 ? ' dst...' : '');

  // Insert Master Box
  const { data: masterBox, error: boxErr } = await supabaseAdmin
    .from('wh_master_boxes')
    .insert({
      tenant_id: finalTenantId,
      warehouse_id: finalWarehouseId,
      master_box_code: masterCode,
      destination_city: destinationCity.trim(),
      consignee_name: consigneeSummary || 'Multi Consignees',
      total_parcels: parcelIds.length,
      total_weight_kg: Number(totalWeight.toFixed(2)),
      total_cbm: Number(totalCbm.toFixed(4)),
      packing_material: material,
      location_id: locationId && locationId.trim() !== '' ? locationId : null,
      status: 'SEALED',
      created_by: staffName
    })
    .select()
    .single();

  if (boxErr) throw boxErr;

  // Update Child Parcels
  const { error: updateErr } = await supabaseAdmin
    .from('wh_parcel_inbound')
    .update({
      status: 'CONSOLIDATED',
      master_box_id: masterBox.id
    })
    .in('id', parcelIds);

  if (updateErr) throw updateErr;

  revalidatePath('/sbu/warehouse/consolidation');
  return masterBox;
}
