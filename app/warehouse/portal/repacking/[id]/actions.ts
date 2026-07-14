'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function fetchRepackingDetailsAdmin(repackingId: string) {
  const { data: repackingData, error: repackingError } = await supabaseAdmin
    .from('wh_repacking_orders')
    .select(`
      *,
      warehouse:warehouse_id(name)
    `)
    .eq('id', repackingId)
    .single();

  if (repackingError) throw repackingError;

  const { data: entriesData, error: entriesError } = await supabaseAdmin
    .from('wh_repacking_items')
    .select(`
      id,
      product_sku_id,
      item_type,
      quantity,
      unit_cost,
      source_location_id,
      target_location_id,
      batch_number,
      expiry_date,
      notes,
      product:md_product_skus(name, sku_code, unit),
      source_location:md_warehouse_locations!source_location_id(code),
      target_location:md_warehouse_locations!target_location_id(code)
    `)
    .eq('repacking_order_id', repackingId);

  if (entriesError) throw entriesError;

  return {
    repacking: repackingData,
    entries: entriesData || []
  };
}

export async function completeRepackingOrderAdmin(
  repackingId: string,
  staffName: string,
  splitEntries: Record<string, { locationId: string, qty: number }[]>,
  staffId: string,
  repackingLocationId?: string
) {
  // If repackingLocationId is provided, update all SOURCE items target_location_id
  if (repackingLocationId) {
    const { error: srcUpdateErr } = await supabaseAdmin
      .from('wh_repacking_items')
      .update({ target_location_id: repackingLocationId })
      .eq('repacking_order_id', repackingId)
      .eq('item_type', 'SOURCE');
    if (srcUpdateErr) throw srcUpdateErr;
  }

  // 1. Update and/or split target locations for result items
  for (const [itemId, entries] of Object.entries(splitEntries)) {
    if (!entries || entries.length === 0) continue;

    // Fetch original item details
    const { data: originalItem, error: getError } = await supabaseAdmin
      .from('wh_repacking_items')
      .select('*')
      .eq('id', itemId)
      .single();
    if (getError || !originalItem) throw new Error('Original item not found');

    // Update the first entry on the original row
    const firstEntry = entries[0];
    const { error: updateError } = await supabaseAdmin
      .from('wh_repacking_items')
      .update({ 
        source_location_id: repackingLocationId || originalItem.source_location_id,
        target_location_id: firstEntry.locationId, 
        quantity: firstEntry.qty 
      })
      .eq('id', itemId);
    if (updateError) throw updateError;

    // For any split entries, duplicate the row with new target location and qty
    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      const { id, created_at, ...copyData } = originalItem; // exclude PK and timestamps
      const newItem = {
        ...copyData,
        source_location_id: repackingLocationId || copyData.source_location_id,
        target_location_id: entry.locationId,
        quantity: entry.qty
      };
      const { error: insertError } = await supabaseAdmin
        .from('wh_repacking_items')
        .insert(newItem);
      if (insertError) throw insertError;
    }
  }

  // 2. Append staff notes to repacking order
  const { data: order } = await supabaseAdmin
    .from('wh_repacking_orders')
    .select('notes')
    .eq('id', repackingId)
    .single();

  const completionNotes = `Pekerjaan diselesaikan di Portal Staff oleh: ${staffName}`;
  const newNotes = order?.notes ? `${order.notes}\n${completionNotes}` : completionNotes;

  const { error: updateError } = await supabaseAdmin
    .from('wh_repacking_orders')
    .update({ notes: newNotes })
    .eq('id', repackingId);

  if (updateError) throw updateError;

  // 3. Execute DB completion RPC
  // Pass staffId (or null) as p_user_id since there is no admin profile id in drivers/staff portal
  const { data, error: rpcError } = await supabaseAdmin.rpc('complete_repacking_order', {
    p_order_id: repackingId,
    p_user_id: staffId
  });

  if (rpcError) throw rpcError;
  return data;
}

export async function updateRepackingStageAdmin(repackingId: string, stage: number) {
  const { error } = await supabaseAdmin
    .from('wh_repacking_orders')
    .update({ current_stage: stage })
    .eq('id', repackingId);

  if (error) throw error;
  return true;
}
