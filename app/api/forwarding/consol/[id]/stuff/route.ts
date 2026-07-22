import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { tenant_id, user_id, container_assignments } = body;

    if (!tenant_id || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing tenant_id or user_id' }, { status: 400 });
    }

    if (!container_assignments || !Array.isArray(container_assignments) || container_assignments.length === 0) {
      return NextResponse.json({ success: false, error: 'container_assignments harus diisi' }, { status: 400 });
    }

    for (const assignment of container_assignments) {
      const { container_assignment_id, wo_item_ids, seal_number, bl_number } = assignment;

      if (!container_assignment_id || !wo_item_ids || wo_item_ids.length === 0) {
        return NextResponse.json({ success: false, error: 'Setiap assignment harus memiliki container_assignment_id dan wo_item_ids' }, { status: 400 });
      }

      const { data: container, error: containerError } = await supabaseAdmin
        .from('fw_container_assignments')
        .select('id, consolidation_id, status')
        .eq('id', container_assignment_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (containerError || !container) {
        return NextResponse.json({ success: false, error: `Container ${container_assignment_id} tidak ditemukan` }, { status: 404 });
      }

      if (container.status === 'stuffed' || container.status === 'shipped') {
        continue;
      }

      const updateData: any = {
        status: 'stuffed',
        updated_at: new Date().toISOString()
      };
      if (seal_number) updateData.seal_number = seal_number;
      if (bl_number) updateData.bl_number = bl_number;

      const { error: updateContainerError } = await supabaseAdmin
        .from('fw_container_assignments')
        .update(updateData)
        .eq('id', container_assignment_id);

      if (updateContainerError) {
        console.error('Update container error:', updateContainerError);
        return NextResponse.json({ success: false, error: 'Gagal update container assignment' }, { status: 500 });
      }

      for (const wo_item_id of wo_item_ids) {
        const { error: updateItemError } = await supabaseAdmin
          .from('fw_container_items')
          .update({
            is_deconsoled: false,
            deconsoled_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('wo_item_id', wo_item_id)
          .eq('container_assignment_id', container_assignment_id);

        if (updateItemError) {
          console.error('Update container item error:', updateItemError);
        }

        const { data: woItem, error: woItemError } = await supabaseAdmin
          .from('wo_items')
          .select('id, status')
          .eq('id', wo_item_id)
          .single();

        if (woItem && !['DONE', 'COMPLETED', 'STUFFED', 'SHIPPED'].includes(woItem.status)) {
          await supabaseAdmin
            .from('wo_items')
            .update({ status: 'STUFFED', updated_at: new Date().toISOString() })
            .eq('id', wo_item_id);
        }
      }
    }

    const { data: consol, error: consolError } = await supabaseAdmin
      .from('fw_consolidations')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!consolError && consol) {
      const { data: allContainers, error: containersError } = await supabaseAdmin
        .from('fw_container_assignments')
        .select('status')
        .eq('consolidation_id', id)
        .eq('tenant_id', tenant_id);

      if (!containersError && allContainers && allContainers.length > 0) {
        const allStuffed = allContainers.every(c => c.status === 'stuffed' || c.status === 'shipped');
        if (allStuffed && consol.status === 'open') {
          await supabaseAdmin
            .from('fw_consolidations')
            .update({ status: 'stuffing', updated_at: new Date().toISOString() })
            .eq('id', id);
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Stuffing berhasil disimpan' });
  } catch (error: any) {
    console.error('Stuffing error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
