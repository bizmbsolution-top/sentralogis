import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ containerId: string }> }
) {
  try {
    const { containerId } = await params;
    const body = await req.json();
    const { tenant_id, user_id, box_code, volume_cbm, colli, weight_kg, seal_number } = body;

    if (!tenant_id || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing tenant_id or user_id' }, { status: 400 });
    }

    const { data: container, error: containerError } = await supabaseAdmin
      .from('fw_container_assignments')
      .select('id, consolidation_id, status, container_number')
      .eq('id', containerId)
      .eq('tenant_id', tenant_id)
      .single();

    if (containerError || !container) {
      return NextResponse.json({ success: false, error: 'Container tidak ditemukan' }, { status: 404 });
    }

    const { data: existingBox } = await supabaseAdmin
      .from('fw_box_assignments')
      .select('id')
      .eq('container_assignment_id', containerId)
      .eq('box_code', box_code)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (existingBox) {
      return NextResponse.json({ success: false, error: `Box dengan kode ${box_code} sudah ada di container ini` }, { status: 409 });
    }

    const { data: newBox, error: boxError } = await supabaseAdmin
      .from('fw_box_assignments')
      .insert([{
        tenant_id,
        container_assignment_id: containerId,
        box_code,
        volume_cbm: volume_cbm || null,
        colli: colli || null,
        weight_kg: weight_kg || null,
        seal_number: seal_number || null,
        status: 'packed'
      }])
      .select('id, box_code')
      .single();

    if (boxError) {
      console.error('Create box error:', boxError);
      return NextResponse.json({ success: false, error: 'Gagal membuat box' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newBox });
  } catch (error: any) {
    console.error('Create box error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ containerId: string }> }
) {
  try {
    const { containerId } = await params;
    const { searchParams } = new URL(req.url);
    const tenant_id = searchParams.get('tenant_id');

    if (!tenant_id) {
      return NextResponse.json({ success: false, error: 'Missing tenant_id' }, { status: 400 });
    }

    const { data: boxes, error } = await supabaseAdmin
      .from('fw_box_assignments')
      .select('*')
      .eq('container_assignment_id', containerId)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch boxes error:', error);
      return NextResponse.json({ success: false, error: 'Gagal memuat data box' }, { status: 500 });
    }

    const boxesWithItems = await Promise.all(
      (boxes || []).map(async (box: any) => {
        const { data: boxItems } = await supabaseAdmin
          .from('fw_box_items')
          .select(`
            id, quantity, description, commodity, volume_cbm, gross_weight_kg,
            wo_item:wo_items (id, item_code, status, work_order:work_orders (id, wo_number, customer:md_entities!customer_id (id, name)))
          `)
          .eq('box_assignment_id', box.id)
          .eq('tenant_id', tenant_id);

        return {
          ...box,
          items: boxItems || []
        };
      })
    );

    return NextResponse.json({ success: true, data: boxesWithItems });
  } catch (error: any) {
    console.error('Fetch boxes error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
