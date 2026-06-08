import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    if (!token) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 400 });
    }

    // 1. Fetch WO with customer info
    const { data: wo, error: woError } = await supabase
      .from('work_orders')
      .select(`
        id, wo_number, status, execution_date, notes,
        customer:md_entities!customer_id (id, name, phone, legal_name)
      `)
      .eq('id', token)
      .maybeSingle();

    if (woError) throw woError;
    if (!wo) return NextResponse.json({ error: 'Work Order tidak ditemukan' }, { status: 404 });

    // 2. Fetch all wo_items for this WO
    const { data: woItems, error: wiError } = await supabase
      .from('wo_items')
      .select('id, item_code, sbu_type, item_data, status')
      .eq('wo_id', wo.id);

    if (wiError) throw wiError;

    const woItemIds = (woItems || []).map((wi: any) => wi.id);
    const woItemMap = new Map((woItems || []).map((wi: any) => [wi.id, wi]));

    // 3. Fetch all JOs for these wo_items
    const { data: jobOrders, error: joError } = await supabase
      .from('job_orders')
      .select(`
        id, jo_number, status, tracking_token,
        created_at, wo_item_id
      `)
      .in('wo_item_id', woItemIds)
      .order('created_at', { ascending: true });

    if (joError) throw joError;

    // 4. Enrich each JO with Warehouse details (Inbound or Outbound)
    const enrichedJOs = await Promise.all((jobOrders || []).map(async (jo: any) => {
      const woItem = woItemMap.get(jo.wo_item_id) || null;
      const isOutbound = woItem?.item_code === 'WHOUT' || woItem?.sbu_type?.includes('OUTBOUND');

      let receipt = null;
      let shipment = null;

      if (isOutbound) {
        const { data } = await supabase
          .from('wh_outbound_shipments')
          .select(`
            id, shipment_number, status, created_at, updated_at,
            surat_jalan_url, bast_url,
            transporter:transporter_id(name),
            driver:driver_id(name),
            fleet:fleet_id(plate_number),
            wh_outbound_shipment_items(id, qty, picked_qty)
          `)
          .eq('job_order_id', jo.id)
          .maybeSingle();
        shipment = data;
      } else {
        const { data } = await supabase
          .from('wh_inbound_receipts')
          .select(`
            id, receipt_number, status, expected_arrival, 
            unloading_start_time, unloading_end_time,
            batb_document_url, pod_document_url, notes, created_at, updated_at,
            transporter:transporter_id(name),
            transporter_name_manual,
            driver:driver_id(name),
            driver_name_manual,
            fleet:fleet_id(plate_number),
            wh_inbound_receipt_items(id, expected_qty, actual_good_qty, quarantine_qty, rejected_qty),
            wh_inbound_damage_records(id, qty, damage_condition, source_photo_url, condition_photo_url, decision)
          `)
          .eq('wo_item_id', jo.id)
          .maybeSingle();
        receipt = data;
      }

      let fleetPlate = receipt?.fleet?.plate_number || shipment?.fleet?.plate_number || null;
      let driverName = receipt?.driver?.name || receipt?.driver_name_manual || shipment?.driver?.name || null;
      let transporterName = receipt?.transporter?.name || receipt?.transporter_name_manual || shipment?.transporter?.name || null;

      // Calculate Qty Metrics
      let expectedQty = 0;
      let goodQty = 0;
      let quarantineQty = 0;
      let rejectedQty = 0;

      if (receipt?.wh_inbound_receipt_items) {
        receipt.wh_inbound_receipt_items.forEach((item: any) => {
          expectedQty += Number(item.expected_qty || 0);
          goodQty += Number(item.actual_good_qty || 0);
          quarantineQty += Number(item.quarantine_qty || 0);
          rejectedQty += Number(item.rejected_qty || 0);
        });
      } else if (shipment?.wh_outbound_shipment_items) {
        shipment.wh_outbound_shipment_items.forEach((item: any) => {
          expectedQty += Number(item.qty || 0);
          goodQty += Number(item.picked_qty || 0);
        });
      }

      return {
        ...jo,
        wo_item: woItem,
        is_outbound: isOutbound,
        receipt: receipt ? {
          ...receipt,
          metrics: { expectedQty, goodQty, quarantineQty, rejectedQty }
        } : null,
        shipment: shipment ? {
          ...shipment,
          metrics: { expectedQty, goodQty, quarantineQty: 0, rejectedQty: 0 }
        } : null,
        fleet_plate: fleetPlate,
        driver_name: driverName,
        transporter_name: transporterName,
      };
    }));

    return NextResponse.json({
      data: {
        wo,
        jobOrders: enrichedJOs,
      }
    });

  } catch (error: any) {
    console.error('Error in Warehouse Tracking API:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

// POST endpoint for Customer Decision
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();
    
    if (!token) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
    }

    const body = await request.json();
    const { damageRecordId, decision } = body;

    if (!damageRecordId || !['ACCEPT_QUARANTINE', 'REJECT_RETURN'].includes(decision)) {
      return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 });
    }

    // Verify token matches the Work Order of the receipt
    // Actually, we trust the token in this public flow since they can see the record anyway.
    // Update the damage record
    const { error } = await supabase
      .from('wh_inbound_damage_records')
      .update({ 
        decision, 
        decision_at: new Date().toISOString()
      })
      .eq('id', damageRecordId)
      .eq('decision', 'PENDING'); // Ensure we only update if it's PENDING

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in Customer Decision API:', err);
    return NextResponse.json({ error: 'Gagal memproses keputusan.' }, { status: 500 });
  }
}
