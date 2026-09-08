import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { IdentityResolutionError } from '@/lib/application/identity/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'commercial:manage');

    const { id } = await params;
    const body = await req.json() as { container_assignments?: Array<{ container_assignment_id: string; wo_item_ids: string[]; seal_number?: string | null; bl_number?: string | null }> };
    const { container_assignments } = body;
    const tenant_id = ctx.tenantId;

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
        .select('id, consolidation_id, status, max_volume_cbm, container_number')
        .eq('id', container_assignment_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (containerError || !container) {
        return NextResponse.json({ success: false, error: `Container ${container_assignment_id} tidak ditemukan` }, { status: 404 });
      }

      if (container.consolidation_id !== id) {
        return NextResponse.json({ success: false, error: `Container ${container.container_number} bukan bagian dari konsolidasi ini` }, { status: 400 });
      }

      if (container.status === 'stuffed' || container.status === 'shipped') {
        continue;
      }

      const { data: existingItems, error: existingItemsError } = await supabaseAdmin
        .from('fw_container_items')
        .select('wo_item_id, volume_cbm')
        .eq('container_assignment_id', container_assignment_id)
        .eq('tenant_id', tenant_id);

      if (existingItemsError) {
        console.error('Fetch existing items error:', existingItemsError);
        return NextResponse.json({ success: false, error: 'Gagal memuat data container' }, { status: 500 });
      }

      const existingWoItemIds = new Set((existingItems || []).map(i => i.wo_item_id));
      const duplicateItems = wo_item_ids.filter((woId: string) => existingWoItemIds.has(woId));
      if (duplicateItems.length > 0) {
        return NextResponse.json({ success: false, error: `Item ${duplicateItems.join(', ')} sudah di-assign ke container ini` }, { status: 409 });
      }

      const { data: otherAssignments, error: otherAssignmentsError } = await supabaseAdmin
        .from('fw_container_items')
        .select('id, container_assignment_id')
        .in('wo_item_id', wo_item_ids)
        .neq('container_assignment_id', container_assignment_id)
        .eq('tenant_id', tenant_id);

      if (otherAssignmentsError) {
        console.error('Fetch other assignments error:', otherAssignmentsError);
        return NextResponse.json({ success: false, error: 'Gagal memuat data assignment lain' }, { status: 500 });
      }

      if (otherAssignments && otherAssignments.length > 0) {
        return NextResponse.json({ success: false, error: 'Salah satu item sudah di-assign ke container lain' }, { status: 409 });
      }

      const newItemVolume = wo_item_ids.length > 0 ? wo_item_ids.length * 0 : 0;
      const currentVolume = (existingItems || []).reduce((sum, i) => sum + (Number(i.volume_cbm) || 0), 0);
      const totalVolume = currentVolume + newItemVolume;

      if (container.max_volume_cbm != null && totalVolume > container.max_volume_cbm) {
        return NextResponse.json({ success: false, error: `Total volume ${totalVolume.toFixed(2)} CBM melebihi kapasitas container ${container.max_volume_cbm} CBM` }, { status: 409 });
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
    if (error instanceof IdentityResolutionError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error('Stuffing error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
