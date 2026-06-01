import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('work_orders')
      .select(`
        *,
        customers:md_entities!fk_work_orders_customer (*),
        wo_work_order_items (
          *,
          origin_location:origin_location_id (*),
          destination_location:destination_location_id (*)
        ),
        wo_items (*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { 
      id, customer_id, customer_phone, 
      order_date, execution_date, notes, status, 
      required_units, sbu_type, items, organization_id 
    } = await req.json();

    if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

    // 1. Update Work Order
    const { error: woError } = await supabaseAdmin
      .from('work_orders')
      .update({
        customer_id,
        customer_phone: customer_phone || null,
        order_date: order_date || null,
        execution_date: execution_date || null,
        notes: notes || null,
        status,
        required_units,
        sbu_type,
        organization_id: organization_id || null
      })
      .eq('id', id);

    if (woError) throw woError;

    // 2. Handling Items (Sync approach)
    await supabaseAdmin.from('wo_items').delete().eq('wo_id', id);

    if (items && items.length > 0) {
      const { data: insertedItems, error: itemsError } = await supabaseAdmin
        .from('wo_items')
        .insert(items.map((item: any, index: number) => ({
          wo_id: id,
          tenant_id: item.tenant_id,
          max_jo_count: item.quantity || 1,
          item_code: item.item_code || `WO-ITEM-${String(index + 1).padStart(2, '0')}`,
          sbu_type: item.sbu_type || sbu_type || 'trucking',
          unit_price: item.deal_price || item.item_data?.deal_price || 0,
          total_revenue: (item.deal_price || item.item_data?.deal_price || 0) * (item.quantity || 1),
          item_data: {
            ...(item.item_data || {}),
            truck_type: item.truck_type,
            origin_location_id: item.origin_location_id,
            destination_location_id: item.destination_location_id,
            deal_price: item.deal_price,
            notes: item.notes
          }
        })))
        .select();
      
      if (itemsError) throw itemsError;

      // Process Manifests if any
      const manifestPayloads: any[] = [];
      insertedItems.forEach((insertedItem, index) => {
        const originalItem = items[index];
        if (originalItem.manifests && Array.isArray(originalItem.manifests)) {
          originalItem.manifests.forEach((m: any) => {
            manifestPayloads.push({
              wo_item_id: insertedItem.id,
              tenant_id: item.tenant_id,
              product_sku_id: m.product_sku_id,
              quantity: m.quantity || 1,
              unit_weight_kg: m.unit_weight_kg || 0,
              unit_volume_m3: m.unit_volume_m3 || 0,
              notes: m.notes || null
            });
          });
        }
      });

      if (manifestPayloads.length > 0) {
        const { error: manifestError } = await supabaseAdmin.from('wo_item_manifests').insert(manifestPayloads);
        if (manifestError) console.error('Error inserting manifests:', manifestError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API WO PUT Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customer_id, customer_phone, order_date, execution_date,
      notes, status, source, created_by, sbu_type, items, organization_id
    } = body

    if (!customer_id) return NextResponse.json({ success: false, error: "Customer ID wajib" }, { status: 400 });
    if (!items || items.length === 0) return NextResponse.json({ success: false, error: "Minimal 1 item" }, { status: 400 });

    const required_units = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)

    const today = new Date();
    const mmyy = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
    
    // Get Customer Code
    let customerCode = 'CUS';
    const { data: customerData } = await supabaseAdmin.from('md_entities').select('entity_code, name').eq('id', customer_id).single();
    if (customerData) customerCode = customerData.entity_code || customerData.name?.substring(0, 3).toUpperCase() || 'CUS';
    
    // Get sequence
    const { count } = await supabaseAdmin.from('work_orders').select('*', { count: 'exact', head: true });
    const sequenceStr = String((count || 0) + 1).padStart(2, '0');
    
    // Tenant Code - fallback to HALU
    const tenantCode = 'HALU'; 
    
    const woNumber = `${tenantCode}-${customerCode}-${mmyy}-${sequenceStr}`;

    const { data: woData, error: woError } = await supabaseAdmin
      .from('work_orders')
      .insert({
        wo_number: woNumber,
        customer_id,
        tenant_id: tenant_id,
        order_date: order_date || null,
        execution_date: execution_date || null,
        notes: notes || null,
        status: status || 'draft',
        organization_id: organization_id || null
      })
      .select().single()

    if (woError) throw woError

    if (items && items.length > 0) {
      const { data: insertedItems, error: itemsError } = await supabaseAdmin
        .from('wo_items')
        .insert(items.map((item: any, index: number) => {
          const itemSbuType = (item.sbu_type || sbu_type || 'trucking').toUpperCase();
          const sbuCode = itemSbuType === 'WAREHOUSE' ? 'WH' : 'TR';
          const qtyString = String(item.quantity || 1).padStart(2, '0');
          const finalItemCode = item.item_code || `${woNumber}-${sbuCode}${qtyString}`;
          
          return {
            wo_id: woData.id,
            tenant_id: tenant_id,
            max_jo_count: item.quantity || 1,
            item_code: finalItemCode,
            sbu_type: itemSbuType,
            unit_price: item.deal_price || item.item_data?.deal_price || 0,
            total_revenue: (item.deal_price || item.item_data?.deal_price || 0) * (item.quantity || 1),
            item_data: {
              ...(item.item_data || {}),
              truck_type: item.truck_type,
              origin_location_id: item.origin_location_id,
              destination_location_id: item.destination_location_id,
              deal_price: item.deal_price,
              notes: item.notes
            }
          };
        }))
        .select();
      
      if (itemsError) throw itemsError;
      
      // Process Manifests if any
      const manifestPayloads: any[] = [];
      insertedItems.forEach((insertedItem, index) => {
        const originalItem = items[index];
        if (originalItem.manifests && Array.isArray(originalItem.manifests)) {
          originalItem.manifests.forEach((m: any) => {
            manifestPayloads.push({
              wo_item_id: insertedItem.id,
              tenant_id: tenant_id,
              product_sku_id: m.product_sku_id,
              quantity: m.quantity || 1,
              unit_weight_kg: m.unit_weight_kg || 0,
              unit_volume_m3: m.unit_volume_m3 || 0,
              notes: m.notes || null
            });
          });
        }
      });

      if (manifestPayloads.length > 0) {
        const { error: manifestError } = await supabaseAdmin.from('wo_item_manifests').insert(manifestPayloads);
        if (manifestError) console.error('Error inserting manifests:', manifestError);
      }
      
      // Generate JOs for non-draft
      if (status !== 'draft' && insertedItems && insertedItems.length > 0) {
        const newJobOrders: any[] = [];
        
        for (const woItem of insertedItems) {
          const itemSbuType = (woItem.sbu_type || '').toUpperCase();
          const qty = woItem.max_jo_count || 1;
          
          for (let i = 1; i <= qty; i++) {
            newJobOrders.push({
              tenant_id: woData.tenant_id,
              wo_item_id: woItem.id,
              jo_number: `${woItem.item_code}-${String(i).padStart(2, '0')}`,
              status: 'pending'
            });
          }
        }
        
        if (newJobOrders.length > 0) {
          const { error: joError } = await supabaseAdmin.from('job_orders').insert(newJobOrders);
          if (joError) console.error('Error auto-generating Job Orders:', joError);
        }
      }
    }

    return NextResponse.json({ success: true, wo_number: woNumber, id: woData.id })
  } catch (error: any) {
    console.error('API WO POST Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}