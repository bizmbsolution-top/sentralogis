import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boxId: string }> }
) {
  try {
    const { boxId } = await params;
    const body = await req.json();
    const { tenant_id, user_id, wo_item_id, quantity, description, commodity, volume_cbm, gross_weight_kg } = body;

    if (!tenant_id || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing tenant_id or user_id' }, { status: 400 });
    }

    if (!wo_item_id) {
      return NextResponse.json({ success: false, error: 'wo_item_id harus diisi' }, { status: 400 });
    }

    const { data: box, error: boxError } = await supabaseAdmin
      .from('fw_box_assignments')
      .select('id, container_assignment_id, status')
      .eq('id', boxId)
      .eq('tenant_id', tenant_id)
      .single();

    if (boxError || !box) {
      return NextResponse.json({ success: false, error: 'Box tidak ditemukan' }, { status: 404 });
    }

    const { data: existingItem } = await supabaseAdmin
      .from('fw_box_items')
      .select('id, quantity')
      .eq('box_assignment_id', boxId)
      .eq('wo_item_id', wo_item_id)
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (existingItem) {
      const newQty = (existingItem.quantity || 0) + (quantity || 1);
      const { error: updateError } = await supabaseAdmin
        .from('fw_box_items')
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq('id', existingItem.id);

      if (updateError) {
        console.error('Update box item error:', updateError);
        return NextResponse.json({ success: false, error: 'Gagal update item box' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: { id: existingItem.id, quantity: newQty }, message: 'Item quantity updated' });
    }

    const { data: newItem, error: itemError } = await supabaseAdmin
      .from('fw_box_items')
      .insert([{
        tenant_id,
        box_assignment_id: boxId,
        wo_item_id,
        quantity: quantity || 1,
        description: description || null,
        commodity: commodity || null,
        volume_cbm: volume_cbm || null,
        gross_weight_kg: gross_weight_kg || null
      }])
      .select('id')
      .single();

    if (itemError) {
      console.error('Add box item error:', itemError);
      return NextResponse.json({ success: false, error: 'Gagal menambahkan item ke box' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newItem });
  } catch (error: any) {
    console.error('Add box item error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ boxId: string }> }
) {
  try {
    const { boxId } = await params;
    const body = await req.json();
    const { tenant_id, wo_item_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ success: false, error: 'Missing tenant_id' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('fw_box_items')
      .delete()
      .eq('box_assignment_id', boxId)
      .eq('tenant_id', tenant_id);

    if (wo_item_id) {
      query = query.eq('wo_item_id', wo_item_id);
    }

    const { error } = await query;

    if (error) {
      console.error('Delete box item error:', error);
      return NextResponse.json({ success: false, error: 'Gagal menghapus item dari box' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete box item error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
