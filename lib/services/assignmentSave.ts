import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type AssignmentSlot,
  type WoItemContext,
  type TransporterOption,
  buildJoNumber,
  generateDriverLinkToken,
  generateTrackingToken,
  getRouteOriginDest,
  isEmptySlot,
  isFilledAssignment,
  parseItemData,
  resolveIsVendor,
  validateVendorPurchasePrice,
  computeMaxJoCount,
} from '@/lib/domain/jo/assignment';

export type SaveAssignmentMode = 'draft' | 'confirm' | 'handover';

export interface WoItemSaveContext {
  id: string;
  wo_id: string;
  status: string;
  item_code?: string;
  work_orders?: { wo_number?: string };
  item_data: unknown;
}

export interface DriverSaveInfo {
  id: string;
  name: string;
  md_entities?: { is_vendor?: boolean } | null;
}

export interface FleetSaveInfo {
  id: string;
  fleet_type_id?: string | null;
}

export interface SaveAssignmentsInput {
  tenantId: string;
  woItem: WoItemSaveContext;
  assignments: AssignmentSlot[];
  mode: SaveAssignmentMode;
  dealPrice: number;
  transporters: TransporterOption[];
  drivers: DriverSaveInfo[];
  fleets: FleetSaveInfo[];
}

export interface SaveAssignmentsResult {
  success: boolean;
  savedCount: number;
  woItemStatus: string;
  error?: string;
  isHandoverFlow: boolean;
}

function woNumberFromItem(item: WoItemSaveContext): string {
  return item.work_orders?.wo_number || item.item_code || 'WO';
}

function buildRoutePayloads(joId: string, itemData: WoItemContext) {
  const stops = itemData.stops || [];
  const estDistanceKm = itemData.est_distance_km ?? null;
  const estDuration = itemData.est_duration ?? null;

  return (stops as any[]).map((stop: any, sIdx: number) => ({
    job_order_id: joId,
    sequence: sIdx + 1,
    stop_type: (stop.stop_type as string) || (sIdx === 0 ? 'PICKUP' : 'DROPOFF'),
    source_type: (stop.source_type as string) || 'MD_LOCATION',
    source_id: String(stop.source_id || 'LEGACY'),
    location_name: (stop.location_name as string) || (stop.name as string) || '-',
    address: (stop.address as string) || (stop.location_address as string) || '-',
    latitude:
      stop.latitude !== null && stop.latitude !== undefined
        ? Number(stop.latitude)
        : null,
    longitude:
      stop.longitude !== null && stop.longitude !== undefined
        ? Number(stop.longitude)
        : null,
    contact_name: (stop.contact_name as string) || '-',
    contact_phone: (stop.contact_phone as string) || '-',
    status: 'pending',
    distance_km: sIdx === stops.length - 1 ? estDistanceKm : null,
    duration_minutes:
      sIdx === stops.length - 1 && estDuration
        ? parseInt(String(estDuration).replace(/\D/g, ''), 10) || null
        : null,
  }));
}

async function syncJobRoutes(
  supabase: SupabaseClient,
  joId: string,
  itemData: WoItemContext
): Promise<void> {
  const { data: existingRoutes, error: routeFetchErr } = await supabase
    .from('job_routes')
    .select('id')
    .eq('job_order_id', joId);

  if (routeFetchErr) {
    console.warn('[assignmentSave] Route fetch failed:', routeFetchErr.message);
    return;
  }

  if (existingRoutes && existingRoutes.length > 0) return;

  const stops = itemData.stops || [];
  if (stops.length === 0) return;

  const routePayloads = buildRoutePayloads(joId, itemData);
  const { error: routeInsErr } = await supabase.from('job_routes').insert(routePayloads);
  if (routeInsErr) {
    console.warn('[assignmentSave] Route insert suppressed:', routeInsErr.message);
  }
}

async function saveMasterAllowance(
  supabase: SupabaseClient,
  tenantId: string,
  itemData: WoItemContext,
  fleet: FleetSaveInfo,
  advanceAmount: number
): Promise<void> {
  if (!fleet.fleet_type_id || advanceAmount <= 0) return;

  const { origin, dest } = getRouteOriginDest(itemData);
  if (!origin || !dest) return;

  const { error } = await supabase.from('md_driver_allowances').insert({
    tenant_id: tenantId,
    origin_city: origin,
    destination_city: dest,
    fleet_type_id: fleet.fleet_type_id,
    amount: advanceAmount,
    is_active: true,
  });

  if (error && error.code !== '23505') {
    console.warn('[assignmentSave] Master allowance insert failed:', error.message);
  }
}

async function upsertJobOrder(
  supabase: SupabaseClient,
  assign: AssignmentSlot,
  payload: Record<string, unknown>,
  isInsert: boolean
): Promise<string> {
  if (assign.id && !isInsert) {
    const { data, error } = await supabase
      .from('job_orders')
      .update({
        ...payload,
        driver_link_token: assign.driver_link_token || generateDriverLinkToken(),
      })
      .eq('id', assign.id)
      .select('id');
    if (error) throw error;
    if (data && data.length > 0) {
      return data[0].id;
    }
    // If update matched 0 rows (row was deleted or ID not found), fall through to insert below
  }

  const insertPayload = { ...payload };
  const isUuid = assign.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assign.id);
  if (isUuid) {
    insertPayload.id = assign.id;
  }

  const { data, error } = await supabase
    .from('job_orders')
    .insert({
      ...insertPayload,
      driver_link_token: assign.driver_link_token || generateDriverLinkToken(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function saveAssignments(
  supabase: SupabaseClient,
  input: SaveAssignmentsInput
): Promise<SaveAssignmentsResult> {
  const {
    tenantId,
    woItem,
    assignments,
    mode,
    dealPrice,
    transporters,
    drivers,
    fleets,
  } = input;

  const itemData = parseItemData(woItem.item_data);
  const woNumber = woNumberFromItem(woItem);
  const isHandoverFlow = mode === 'handover';

  try {
    if (mode === 'draft') {
      for (let i = 0; i < assignments.length; i++) {
        const assign = assignments[i];
        if (isEmptySlot(assign)) continue;

        const joNumber = assign.jo_number || buildJoNumber(woNumber, i);
        const payload = {
          wo_item_id: woItem.id,
          tenant_id: tenantId,
          jo_number: joNumber,
          transporter_id: assign.transporter_id || null,
          vendor_id: assign.transporter_id || null,
          fleet_id: assign.fleet_id || null,
          driver_id: assign.driver_id || null,
          driver_phone: assign.driver_phone || null,
          cost_account_id: assign.cost_account_id || null,
          purchase_price: Number(assign.purchase_price) || 0,
          base_price: Number(assign.base_price) || dealPrice,
          driver_share_percentage: Number(assign.driver_share_percentage) || 0,
          advance_amount: Number(assign.advance_amount) || 0,
          estimated_margin:
            (Number(assign.base_price) || dealPrice) -
            (Number(assign.purchase_price) || 0),
          wa_token: assign.wa_token || generateTrackingToken(),
          tracking_token: assign.tracking_token || generateTrackingToken(),
          total_stops: itemData.stops?.length || 0,
          container_number: assign.container_number || null,
          notes: assign.notes || null,
          assignment_documents: assign.assignment_documents || [],
          sbu_metadata: {
            ...(assign.container_number ? { container_number: assign.container_number } : {}),
            ...(assign.notes ? { notes: assign.notes } : {}),
          },
          updated_at: new Date().toISOString(),
          assigned_at: new Date().toISOString(),
          driver_response: 'accepted',
          status: 'pending',
        };

        await upsertJobOrder(supabase, assign, payload, !assign.id);
      }

      const currentItemData = parseItemData(woItem.item_data) as unknown as Record<string, unknown>;
      const updatedItemData = { ...currentItemData };
      delete updatedItemData.confirmed_assigned;
      delete updatedItemData.confirmed_assigned_at;

      // Collect rejected slots
      const rejectedSlots = assignments
        .filter((a) => a.rejected && a.rejected_reason)
        .map((a, i) => ({
          slot_index: assignments.indexOf(a),
          reason: a.rejected_reason,
          note: a.rejected_note || '',
          rejected_at: new Date().toISOString(),
        }));
      updatedItemData.rejected_slots = rejectedSlots;

      const { error: woUpdateError } = await supabase
        .from('wo_items')
        .update({ status: 'need_assignment', item_data: updatedItemData })
        .eq('id', woItem.id);

      if (woUpdateError) throw woUpdateError;

      return {
        success: true,
        savedCount: assignments.filter((a) => !isEmptySlot(a)).length,
        woItemStatus: 'need_assignment',
        isHandoverFlow: false,
      };
    }

    // confirm | handover
    const filledAssignments = assignments.filter(isFilledAssignment);
    const filledIds = filledAssignments.map((a) => a.id).filter(Boolean);

    let preDeleteQuery = supabase
      .from('job_orders')
      .delete()
      .eq('wo_item_id', woItem.id)
      .eq('status', 'pending')
      .is('transporter_id', null)
      .is('driver_id', null)
      .is('fleet_id', null);

    if (filledIds.length > 0) {
      preDeleteQuery = preDeleteQuery.not('id', 'in', `(${filledIds.join(',')})`);
    }
    await preDeleteQuery;

    for (let i = 0; i < filledAssignments.length; i++) {
      const assign = filledAssignments[i];
      const originalIndex = assignments.indexOf(assign);

      const transporter = transporters.find((t) => t.id === assign.transporter_id);
      const driver = drivers.find((d) => d.id === assign.driver_id);
      const isVendor = resolveIsVendor(transporter, driver?.md_entities?.is_vendor);

      const vendorErr = validateVendorPurchasePrice(
        assign,
        isVendor,
        String(originalIndex + 1)
      );
      if (vendorErr) {
        return { success: false, savedCount: 0, woItemStatus: woItem.status, error: vendorErr, isHandoverFlow };
      }

      const joNumber = buildJoNumber(woNumber, originalIndex);
      const payload = {
        wo_item_id: woItem.id,
        tenant_id: tenantId,
        jo_number: joNumber,
        transporter_id: assign.transporter_id || null,
        vendor_id: assign.transporter_id || null,
        fleet_id: assign.fleet_id || null,
        driver_id: assign.driver_id || null,
        driver_phone: assign.driver_phone || null,
        cost_account_id: assign.cost_account_id || null,
        purchase_price: Number(assign.purchase_price) || 0,
        base_price: Number(assign.base_price) || dealPrice,
        driver_share_percentage: Number(assign.driver_share_percentage) || 0,
        advance_amount: Number(assign.advance_amount) || 0,
        estimated_margin:
          (Number(assign.base_price) || dealPrice) -
          (Number(assign.purchase_price) || 0),
        wa_token: assign.wa_token || generateTrackingToken(),
        tracking_token: assign.tracking_token || generateTrackingToken(),
        total_stops: itemData.stops?.length || 0,
        container_number: assign.container_number || null,
        notes: assign.notes || null,
        assignment_documents: assign.assignment_documents || [],
        sbu_metadata: {
          ...(assign.container_number ? { container_number: assign.container_number } : {}),
          ...(assign.notes ? { notes: assign.notes } : {}),
        },
        updated_at: new Date().toISOString(),
        assigned_at: new Date().toISOString(),
        driver_response: 'accepted',
        status:
          assign.id && assign.status && assign.status !== 'pending' && assign.status !== 'draft'
            ? assign.status
            : 'assigned',
        dispatch_ready: true,
        dispatch_ready_at: new Date().toISOString(),
      };

      const joId = await upsertJobOrder(supabase, assign, payload, !assign.id);

      if (assign.save_to_master && !isVendor && assign.fleet_id) {
        const fleet = fleets.find((f) => f.id === assign.fleet_id);
        if (fleet) {
          await saveMasterAllowance(
            supabase,
            tenantId,
            itemData,
            fleet,
            Number(assign.advance_amount) || 0
          );
        }
      }

      await syncJobRoutes(supabase, joId, itemData);
    }

    // [AI] Now that filled assignments have been upserted (and changed to assigned status), clean up any remaining unassigned skeleton rows
    await supabase
      .from('job_orders')
      .delete()
      .eq('wo_item_id', woItem.id)
      .eq('status', 'pending')
      .is('transporter_id', null)
      .is('driver_id', null)
      .is('fleet_id', null);

    const effectiveUnitCount = computeMaxJoCount(itemData);
    const { data: actualJOs } = await supabase
      .from('job_orders')
      .select('id')
      .eq('wo_item_id', woItem.id)
      .not('status', 'eq', 'pending');

    const successfulAssignments = actualJOs?.length || 0;
    const allUnitsAssigned = successfulAssignments >= effectiveUnitCount;

    // [FIX] When not all units are assigned, keep status as 'need_assignment'
    // so the item stays in "Need Assignment" tab and can be edited
    const newStatus = isHandoverFlow
      ? woItem.status
      : allUnitsAssigned
        ? 'assigned'
        : 'need_assignment';

    const currentItemData = parseItemData(woItem.item_data) as unknown as Record<string, unknown>;
    const updatePayload: { status: string; item_data?: Record<string, unknown> } = {
      status: newStatus,
    };

    // Collect rejected slots from all assignments (including unfilled)
    const rejectedSlots = assignments
      .filter((a) => a.rejected && a.rejected_reason)
      .map((a) => ({
        slot_index: assignments.indexOf(a),
        reason: a.rejected_reason,
        note: a.rejected_note || '',
        rejected_at: new Date().toISOString(),
      }));

    if (allUnitsAssigned && !isHandoverFlow) {
      updatePayload.item_data = {
        ...currentItemData,
        confirmed_assigned: true,
        confirmed_assigned_at: new Date().toISOString(),
        rejected_slots: rejectedSlots,
      };
    } else if (rejectedSlots.length > 0) {
      updatePayload.item_data = {
        ...currentItemData,
        rejected_slots: rejectedSlots,
      };
    }

    const { error: woUpdateError } = await supabase
      .from('wo_items')
      .update(updatePayload)
      .eq('id', woItem.id);

    if (woUpdateError) throw woUpdateError;

    // [FIX] Only update parent WO status when ALL items are truly assigned
    // "need_assignment" items should NOT trigger parent WO to move to 'assigned'
    // Only "assigned" or more advanced statuses should count
    const { data: siblingItems } = await supabase
      .from('wo_items')
      .select('status')
      .eq('wo_id', woItem.wo_id);

    const siblingAssignedCount = siblingItems?.filter((i) =>
      ['assigned', 'confirmed_assigned', 'dispatched', 'active', 'in_progress', 'completed'].includes(
        (i.status || '').toLowerCase()
      )
    ).length || 0;

    const totalSiblingItems = siblingItems?.length || 1;
    const allSiblingsAssigned = siblingAssignedCount >= totalSiblingItems && totalSiblingItems > 0;

    // Only set parent WO to 'assigned' when ALL sibling items are assigned
    // Do NOT trigger on 'need_assignment' or partial assignments
    if (allSiblingsAssigned && !isHandoverFlow) {
      const { data: parentWo } = await supabase
        .from('work_orders')
        .select('status')
        .eq('id', woItem.wo_id)
        .single();

      const currentParentStatus = (parentWo?.status || '').toLowerCase();
      // Only transition from draft/pending/need_assignment to assigned
      if (['draft', 'pending', 'need_assignment'].includes(currentParentStatus)) {
        await supabase
          .from('work_orders')
          .update({ status: 'assigned' })
          .eq('id', woItem.wo_id);
      }
    }

    return {
      success: true,
      savedCount: successfulAssignments,
      woItemStatus: allUnitsAssigned ? 'assigned' : 'need_assignment',
      isHandoverFlow,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'object'
          ? JSON.stringify(err)
          : String(err);
    return {
      success: false,
      savedCount: 0,
      woItemStatus: woItem.status,
      error: message,
      isHandoverFlow,
    };
  }
}
