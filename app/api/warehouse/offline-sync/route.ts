import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload, recorded_at } = body;

    if (!action || !payload) {
      return NextResponse.json({ error: 'Missing action or payload' }, { status: 400 });
    }

    console.log(`[Warehouse Offline Sync] Executing action: ${action} recorded at ${recorded_at}`);

    switch (action) {
      // ==========================================
      // INBOUND ACTIONS
      // ==========================================
      case 'INBOUND_UNLOADING_START': {
        const { receiptId, nextNumber } = payload;
        const { error } = await supabaseAdmin.from('wh_unloading_sessions').insert({
          receipt_id: receiptId,
          session_number: nextNumber,
          start_time: recorded_at || new Date().toISOString(),
        });
        if (error) throw error;
        break;
      }

      case 'INBOUND_UNLOADING_STOP': {
        const { sessionId, stopReason } = payload;
        const { error } = await supabaseAdmin
          .from('wh_unloading_sessions')
          .update({ end_time: recorded_at || new Date().toISOString(), pause_reason: stopReason })
          .eq('id', sessionId);
        if (error) throw error;
        break;
      }

      case 'INBOUND_UNLOADING_FINISH': {
        const { receiptId, activeSessionId, tenantId } = payload;
        
        // 1. End active session if any
        if (activeSessionId) {
          await supabaseAdmin
            .from('wh_unloading_sessions')
            .update({ end_time: recorded_at || new Date().toISOString() })
            .eq('id', activeSessionId);
        }

        // 2. Calculate total minutes (approximate based on latest DB state)
        const { data: allSessions } = await supabaseAdmin
          .from('wh_unloading_sessions')
          .select('start_time, end_time')
          .eq('receipt_id', receiptId);

        const totalMinutes = (allSessions || []).reduce((sum, s) => {
          if (s.end_time) return sum + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000;
          return sum;
        }, 0);

        // 3. Update receipt status
        await supabaseAdmin.from('wh_inbound_receipts')
          .update({ status: 'CHECKING', total_unloading_minutes: Math.round(totalMinutes * 100) / 100 })
          .eq('id', receiptId);

        // 4. Insert log
        await supabaseAdmin.from('wh_milestone_logs').insert({
          tenant_id: tenantId,
          reference_type: 'INBOUND_RECEIPT',
          reference_id: receiptId,
          milestone_event: `Unloading selesai - ${Math.round(totalMinutes)} menit`
        });
        break;
      }

      case 'INBOUND_SUBMIT_CHECKING': {
        const { receiptId, items, damageEntries, staffId, tenantId, nextStatus, isMultiRoleUser, mergedPutawayNext } = payload;
        
        // Update good qty
        for (const item of items) {
          const { error } = await supabaseAdmin
            .from('wh_inbound_receipt_items')
            .update({ actual_good_qty: item.actual_good_qty || 0 })
            .eq('id', item.id);
          if (error) throw error;
        }

        // Process damages
        const itemDamageMap: Record<string, { totalQty: number }> = {};
        for (const d of damageEntries) {
          if (Number(d.qty) <= 0) continue;
          
          const { error } = await supabaseAdmin.from('wh_inbound_damage_records').insert({
            receipt_id: receiptId,
            receipt_item_id: d.receipt_item_id,
            qty: d.qty,
            damage_source: d.damage_source,
            source_notes: d.source_notes,
            source_photo_url: d.source_photo_url,
            damage_condition: d.damage_condition,
            condition_notes: d.condition_notes,
            condition_photo_url: d.condition_photo_url,
            reported_by: staffId,
          });
          if (error) throw error;

          if (!itemDamageMap[d.receipt_item_id]) itemDamageMap[d.receipt_item_id] = { totalQty: 0 };
          itemDamageMap[d.receipt_item_id].totalQty += Number(d.qty);
        }

        // Update rejected qty
        for (const [itemId, info] of Object.entries(itemDamageMap)) {
          await supabaseAdmin.from('wh_inbound_receipt_items')
            .update({ rejected_qty: info.totalQty })
            .eq('id', itemId);
        }

        // Update status
        await supabaseAdmin
          .from('wh_inbound_receipts')
          .update({ status: nextStatus })
          .eq('id', receiptId);

        // Insert milestone
        await supabaseAdmin.from('wh_milestone_logs').insert({
          tenant_id: tenantId,
          reference_type: 'INBOUND_RECEIPT',
          reference_id: receiptId,
          milestone_event: `Tally checking done - ${damageEntries.length} damage records`
        });
        break;
      }

      case 'INBOUND_FINISH_PUTAWAY': {
        const { receipt, goodItems, quarantineRecords, putawayEntries, quarantineEntries, session } = payload;
        
        // Gather all locations to resolve IDs
        const allCodes = new Set<string>();
        for (const item of goodItems) {
          (putawayEntries[item.id] || []).forEach((e: any) => allCodes.add(e.locationCode.trim().toUpperCase()));
        }
        for (const rec of quarantineRecords) {
          (quarantineEntries[rec.id] || []).forEach((e: any) => allCodes.add(e.locationCode.trim().toUpperCase()));
        }

        const { data: locs, error: locErr } = await supabaseAdmin
          .from('md_warehouse_locations')
          .select('id, code')
          .eq('warehouse_id', receipt.warehouse_id)
          .in('code', Array.from(allCodes));

        if (locErr) throw locErr;
        const locMap: Record<string, string> = {};
        locs?.forEach(l => locMap[l.code.toUpperCase()] = l.id);

        // Upsert Inventory Helper
        const upsertInventory = async (item: any, locationId: string, quantity: number, status: string) => {
          const productSkuId = item.product_sku_id || item.product?.id;
          if (!productSkuId) return;

          const expiryDate = item.expiry_date || null;
          const batchNumber = item.batch_number || null;

          let customerId = null;
          const { data: skuData } = await supabaseAdmin.from('md_product_skus').select('customer_id').eq('id', productSkuId).maybeSingle();
          if (skuData?.customer_id) customerId = skuData.customer_id;

          const { data: existing } = await supabaseAdmin
            .from('wh_inventory')
            .select('id, quantity')
            .eq('product_sku_id', productSkuId)
            .eq('location_id', locationId)
            .eq('status', status)
            .eq('warehouse_id', receipt.warehouse_id)
            .eq('batch_number', batchNumber)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin.from('wh_inventory').update({ quantity: Number(existing.quantity) + quantity }).eq('id', existing.id);
          } else {
            await supabaseAdmin.from('wh_inventory').insert({
              tenant_id: receipt.tenant_id,
              warehouse_id: receipt.warehouse_id,
              location_id: locationId,
              product_sku_id: productSkuId,
              customer_id: customerId || undefined,
              quantity,
              status,
              received_date: new Date().toISOString().split('T')[0],
              expiry_date: expiryDate,
              batch_number: batchNumber
            });
          }
        };

        const itemLogs: Record<string, any[]> = {};
        const firstLocations: Record<string, string> = {};

        // GOOD ITEMS
        for (const item of goodItems) {
          const entries = putawayEntries[item.id] || [];
          if (!itemLogs[item.id]) itemLogs[item.id] = [];
          
          for (const entry of entries) {
            const locId = locMap[entry.locationCode.trim().toUpperCase()];
            if (locId) {
              await upsertInventory(item, locId, Number(entry.qty), 'AVAILABLE');
              itemLogs[item.id].push({ location_id: entry.locationCode, quantity: Number(entry.qty), status: 'AVAILABLE' });
            }
          }
          if (entries.length > 0 && locMap[entries[0].locationCode.trim().toUpperCase()]) {
            firstLocations[item.id] = locMap[entries[0].locationCode.trim().toUpperCase()];
          }
        }

        // QUARANTINE ITEMS
        for (const rec of quarantineRecords) {
          const entries = quarantineEntries[rec.id] || [];
          const item = goodItems.find((i: any) => i.id === rec.receipt_item_id) || { product_sku_id: rec.product_sku_id, expiry_date: null, batch_number: null }; // Mock item
          
          if (!itemLogs[rec.receipt_item_id]) itemLogs[rec.receipt_item_id] = [];
          for (const entry of entries) {
            const locId = locMap[entry.locationCode.trim().toUpperCase()];
            if (locId) {
              await upsertInventory(item, locId, Number(entry.qty), 'QUARANTINE');
              itemLogs[rec.receipt_item_id].push({ location_id: entry.locationCode, quantity: Number(entry.qty), status: 'QUARANTINE' });
            }
          }
          if (entries.length > 0 && locMap[entries[0].locationCode.trim().toUpperCase()]) {
            const locId = locMap[entries[0].locationCode.trim().toUpperCase()];
            if (!firstLocations[rec.receipt_item_id]) {
              firstLocations[rec.receipt_item_id] = locId;
            }
            await supabaseAdmin.from('wh_inbound_damage_records').update({ quarantine_location_id: locId }).eq('id', rec.id);
          }
        }

        // UPDATE RECEIPTS & ITEMS
        for (const itemId of Object.keys(itemLogs)) {
          await supabaseAdmin.from('wh_inbound_receipt_items')
            .update({ 
              putaway_location_id: firstLocations[itemId] || null, 
              putaway_entries: itemLogs[itemId],
              putaway_at: recorded_at || new Date().toISOString() 
            })
            .eq('id', itemId);
        }

        await supabaseAdmin.from('wh_inbound_receipts').update({ status: 'COMPLETED' }).eq('id', receipt.id);

        if (receipt.wo_item_id) {
           await supabaseAdmin.from('job_orders').update({ status: 'completed' }).eq('wo_item_id', receipt.wo_item_id);
        }

        if (receipt.transfer_id) {
           await supabaseAdmin.from('wh_transfer_orders').update({ status: 'RECEIVED' }).eq('id', receipt.transfer_id);
           await supabaseAdmin.from('wh_transfer_details').update({ status: 'RECEIVED' }).eq('transfer_id', receipt.transfer_id);
        }
        break;
      }

      // ==========================================
      // OUTBOUND ACTIONS
      // ==========================================
      case 'OUTBOUND_SUBMIT_PICKING': {
        const { shipmentId, pickingEntries, shipmentItems } = payload;
        
        // Resolve locations
        const locCodes = [...new Set(pickingEntries.map((pe: any) => pe.location_code.trim().toUpperCase()))];
        const { data: locs, error: locErr } = await supabaseAdmin.from('md_warehouse_locations').select('id, code').in('code', locCodes as string[]);
        if (locErr) throw locErr;
        const locMap = Object.fromEntries((locs || []).map(l => [l.code.toUpperCase(), l.id]));

        const groupedBySku: Record<string, any[]> = {};
        pickingEntries.forEach((pe: any) => {
           if (!groupedBySku[pe.sku_id]) groupedBySku[pe.sku_id] = [];
           const lId = locMap[pe.location_code.trim().toUpperCase()];
           if (lId) {
             groupedBySku[pe.sku_id].push({ location_id: lId, location_code: pe.location_code.trim().toUpperCase(), qty: Number(pe.qty) });
           }
        });

        // Update items
        for (const item of shipmentItems) {
           const entries = groupedBySku[item.product_sku_id] || [];
           const totalPicked = entries.reduce((sum, e) => sum + e.qty, 0);
           await supabaseAdmin.from('wh_outbound_shipment_items').update({
              picked_qty: totalPicked,
              picking_entries: entries
           }).eq('id', item.id);
        }

        await supabaseAdmin.from('wh_outbound_shipments').update({ status: 'READY_FOR_CHECKING' }).eq('id', shipmentId);
        break;
      }

      case 'OUTBOUND_SECURITY_SUBMIT': {
        const { shipmentId, updates } = payload;
        const { error } = await supabaseAdmin.from('wh_outbound_shipments').update(updates).eq('id', shipmentId);
        if (error) throw error;
        break;
      }

      case 'OUTBOUND_SUBMIT_CHECKING': {
        const { shipmentId, checkingItems, damageEntries, nextStatus } = payload;
        
        // Update items
        for (const item of checkingItems) {
           const dmgs = damageEntries.filter((d: any) => d.shipment_item_id === item.id);
           const dmgQty = dmgs.reduce((acc: number, d: any) => acc + Number(d.qty), 0);
           await supabaseAdmin.from('wh_outbound_shipment_items')
              .update({ checked_qty: item.checked_qty, damage_qty: dmgQty })
              .eq('id', item.id);
        }
        
        // Insert damage records
        const damageToInsert = damageEntries.map((d: any) => ({
           shipment_item_id: d.shipment_item_id,
           damage_qty: Number(d.qty),
           damage_source: d.damage_source || 'OTHER',
           damage_condition: d.damage_condition || 'TOTAL_DAMAGE',
           damage_notes: d.damage_notes || '',
           photo_url: d.photo_url || ''
        }));
        if (damageToInsert.length > 0) {
           await supabaseAdmin.from('wh_outbound_damage_records').insert(damageToInsert);
        }

        await supabaseAdmin.from('wh_outbound_shipments').update({ status: nextStatus }).eq('id', shipmentId);
        break;
      }

      case 'OUTBOUND_START_LOADING': {
        const { shipmentId, nextNumber } = payload;
        await supabaseAdmin.from('wh_loading_sessions').insert({
          shipment_id: shipmentId,
          session_number: nextNumber,
          start_time: recorded_at || new Date().toISOString()
        });
        await supabaseAdmin.from('wh_outbound_shipments').update({ status: 'LOADING' }).eq('id', shipmentId);
        break;
      }

      case 'OUTBOUND_STOP_LOADING': {
        const { activeSessionId, stopReason } = payload;
        if (activeSessionId) {
          await supabaseAdmin.from('wh_loading_sessions')
            .update({ end_time: recorded_at || new Date().toISOString(), pause_reason: stopReason })
            .eq('id', activeSessionId);
        }
        break;
      }

      case 'OUTBOUND_FINISH_LOADING': {
        const { shipmentId, activeSessionId, tenantId } = payload;
        
        if (activeSessionId) {
          await supabaseAdmin
            .from('wh_loading_sessions')
            .update({ end_time: recorded_at || new Date().toISOString() })
            .eq('id', activeSessionId);
        }

        const { data: allSessions } = await supabaseAdmin
          .from('wh_loading_sessions')
          .select('start_time, end_time')
          .eq('shipment_id', shipmentId);

        const mins = (allSessions || []).reduce((sum, s) => {
          if (s.end_time) return sum + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000;
          return sum;
        }, 0);

        await supabaseAdmin.from('wh_outbound_shipments')
          .update({ status: 'READY_FOR_DOCUMENTS', total_loading_minutes: Math.round(mins * 100) / 100 })
          .eq('id', shipmentId);
        break;
      }

      case 'OUTBOUND_UPLOAD_DOCS': {
        const { shipmentId, bastUrl, sjUrl } = payload;
        const updates: any = { status: 'COMPLETED' };
        if (bastUrl || sjUrl) {
           updates.bast_url = bastUrl;
           updates.surat_jalan_url = sjUrl;
        }
        await supabaseAdmin.from('wh_outbound_shipments').update(updates).eq('id', shipmentId);
        break;
      }

      // ==========================================
      // REPACKING ACTIONS
      // ==========================================
      case 'REPACKING_NEXT_STAGE': {
        const { repackingId, nextStage } = payload;
        // In the original, it called updateRepackingStageAdmin which just updates current_stage
        // But for stage 3 it might do something else? Actually updateRepackingStageAdmin just updates the stage and maybe creates milestones.
        // Let's just update current_stage.
        const { error } = await supabaseAdmin.from('wh_repacking_orders').update({ current_stage: nextStage }).eq('id', repackingId);
        if (error) throw error;
        break;
      }

      case 'REPACKING_COMPLETE': {
        const { repackingId, resultItems, putawayEntries, warehouseId, repackingLocationId } = payload;
        
        // 1. Gather codes
        const allCodes = new Set<string>();
        for (const item of resultItems) {
           const entries = putawayEntries[item.id] || [];
           for (const e of entries) {
              allCodes.add(e.locationCode.trim().toUpperCase());
           }
        }

        const { data: locs, error: locErr } = await supabaseAdmin
           .from('md_warehouse_locations')
           .select('id, code')
           .eq('warehouse_id', warehouseId)
           .in('code', Array.from(allCodes));

        if (locErr) throw locErr;
        const locMap: Record<string, string> = {};
        locs?.forEach(l => locMap[l.code.toUpperCase()] = l.id);

        const splitPayload: Record<string, { locationId: string; qty: number }[]> = {};
        for (const item of resultItems) {
           const entries = putawayEntries[item.id] || [];
           const itemEntries = entries.map((e: any) => ({
              locationId: locMap[e.locationCode.trim().toUpperCase()],
              qty: Number(e.qty)
           }));
           splitPayload[item.id] = itemEntries;
        }

        const staff_id = body.staff_id;
        const { completeRepackingOrderAdmin: finishRepacking } = await import('@/app/warehouse/portal/repacking/[id]/actions');
        await finishRepacking(repackingId, 'System (Offline Sync)', splitPayload, staff_id || 'system-offline', repackingLocationId);
        break;
      }

      // ==========================================
      // INTERNAL ACTIONS
      // ==========================================
      case 'INTERNAL_MOVEMENT_EXECUTE': {
        const { movementId } = payload;
        const { error } = await supabaseAdmin.rpc('execute_internal_movement', { p_movement_id: movementId });
        if (error) throw error;
        break;
      }

      // ==========================================
      // STAFF ABSENSI
      // ==========================================
      case 'STAFF_ATTENDANCE': {
        const { type, attendanceId } = payload;
        const tenant_id = body.tenant_id;
        const staff_id = body.staff_id;
        
        if (type === 'CHECK_IN') {
          const { error } = await supabaseAdmin.from('wh_staff_attendance').insert({
            tenant_id,
            staff_id,
            status: 'CHECK_IN',
            created_at: recorded_at || new Date().toISOString()
          });
          if (error) throw error;
        } else {
          if (attendanceId && attendanceId !== 'pending-sync') {
            const { error } = await supabaseAdmin.from('wh_staff_attendance')
              .update({
                check_out_time: recorded_at || new Date().toISOString(),
                status: 'CHECK_OUT'
              })
              .eq('id', attendanceId);
            if (error) throw error;
          } else {
             // Fallback: update latest attendance for this staff_id today
             const startOfDay = new Date(recorded_at || new Date().toISOString());
             startOfDay.setHours(0, 0, 0, 0);
             const { data: latest } = await supabaseAdmin.from('wh_staff_attendance')
               .select('id')
               .eq('staff_id', staff_id)
               .gte('created_at', startOfDay.toISOString())
               .order('created_at', { ascending: false })
               .limit(1)
               .maybeSingle();
             
             if (latest) {
               await supabaseAdmin.from('wh_staff_attendance')
                 .update({ check_out_time: recorded_at || new Date().toISOString(), status: 'CHECK_OUT' })
                 .eq('id', latest.id);
             }
          }
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return NextResponse.json({ success: true, action });
  } catch (err: any) {
    console.error(`[Warehouse Offline Sync] Error executing action:`, err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
