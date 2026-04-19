import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('work_orders')
      .select(`
        *,
        customers (*),
        work_order_items (
          *,
          origin_location:origin_location_id (*),
          destination_location:destination_location_id (*)
        )
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
    await supabaseAdmin.from('work_order_items').delete().eq('work_order_id', id);

    if (items && items.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('work_order_items')
        .insert(items.map((item: any) => ({
          work_order_id: id,
          truck_type: item.truck_type || "N/A",
          origin_location_id: item.origin_location_id || null,
          destination_location_id: item.destination_location_id || null,
          quantity: item.quantity || 1,
          deal_price: item.deal_price || 0,
          sbu_type: item.sbu_type || sbu_type || 'trucking',
          sbu_metadata: item.sbu_metadata || {}
        })));
      
      if (itemsError) throw itemsError;
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

    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const { count } = await supabaseAdmin.from('work_orders').select('*', { count: 'exact', head: true })
    const woNumber = `WO/${dateStr}/${String((count || 0) + 1).padStart(4, '0')}`

    const { data: woData, error: woError } = await supabaseAdmin
      .from('work_orders')
      .insert({
        wo_number: woNumber,
        customer_id,
        customer_phone: customer_phone || null,
        order_date: order_date || null,
        execution_date: execution_date || null,
        notes: notes || null,
        required_units,
        status: status || 'draft', 
        source: source || 'admin_cs',
        created_by: created_by || 'Admin',
        sbu_type: sbu_type || 'trucking',
        organization_id: organization_id || null
      })
      .select().single()

    if (woError) throw woError

    if (items && items.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('work_order_items')
        .insert(items.map((item: any) => ({
          work_order_id: woData.id,
          truck_type: item.truck_type || "N/A",
          origin_location_id: item.origin_location_id || null,
          destination_location_id: item.destination_location_id || null,
          quantity: item.quantity || 1,
          deal_price: item.deal_price || 0,
          sbu_type: item.sbu_type || sbu_type || 'trucking',
          sbu_metadata: item.sbu_metadata || {}
        })))
      
      if (itemsError) throw itemsError
    }

    return NextResponse.json({ success: true, wo_number: woNumber, id: woData.id })
  } catch (error: any) {
    console.error('API WO POST Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}