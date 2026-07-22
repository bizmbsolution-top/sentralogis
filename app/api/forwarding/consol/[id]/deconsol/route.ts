import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { tenant_id, user_id } = body;

    if (!tenant_id || !user_id) {
      return NextResponse.json({ success: false, error: 'Missing tenant_id or user_id' }, { status: 400 });
    }

    const { data: consol, error: consolError } = await supabaseAdmin
      .from('fw_consolidations')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .single();

    if (consolError || !consol) {
      return NextResponse.json({ success: false, error: 'Konsolidasi tidak ditemukan' }, { status: 404 });
    }

    if (consol.status !== 'arrived' && consol.status !== 'shipped') {
      return NextResponse.json({ success: false, error: 'Konsolidasi harus dalam status arrived/shipped untuk deconsol' }, { status: 400 });
    }

    const { data: containers, error: containersError } = await supabaseAdmin
      .from('fw_container_assignments')
      .select('id, status, container_number')
      .eq('consolidation_id', id)
      .eq('tenant_id', tenant_id);

    if (containersError) {
      return NextResponse.json({ success: false, error: 'Gagal memuat container' }, { status: 500 });
    }

    const notArrived = containers?.filter(c => c.status !== 'arrived' && c.status !== 'shipped') || [];
    if (notArrived.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Container ${notArrived.map(c => c.container_number).join(', ')} belum arrived/shipped`
      }, { status: 400 });
    }

    const { data: containerItems, error: itemsError } = await supabaseAdmin
      .from('fw_container_items')
      .select(`
        id, wo_item_id, delivery_type, delivery_address, delivery_contact, delivery_phone,
        volume_cbm, gross_weight_kg, packages, package_type, commodity, description,
        cargo_owner_name, consignee_name, consignee_address, consignee_phone,
        is_deconsoled, deconsoled_at, tracking_token,
        container_assignment:fw_container_assignments(container_number, container_type)
      `)
      .eq('fw_container_assignments.consolidation_id', id)
      .eq('tenant_id', tenant_id);

    if (itemsError) {
      return NextResponse.json({ success: false, error: 'Gagal memuat container items' }, { status: 500 });
    }

    const deliveryWOsCreated: string[] = [];

    for (const item of containerItems || []) {
      if (item.is_deconsoled) continue;

      if (item.delivery_type === 'port_to_door' || item.delivery_type === 'door_to_door') {
        const { data: deliveryWO, error: deliveryWOError } = await supabaseAdmin
          .from('work_orders')
          .insert([{
            tenant_id,
            customer_id: null,
            order_date: new Date().toISOString().split('T')[0],
            execution_date: new Date().toISOString().split('T')[0],
            sbu_type: 'TRUCKING',
            status: 'PENDING',
            notes: `Auto-generated Delivery from Deconsol ${consol.consol_number} (${item.container_assignment?.container_number || 'N/A'})`,
            created_by: user_id,
            updated_by: user_id
          }])
          .select('id')
          .single();

        if (deliveryWOError || !deliveryWO) {
          console.error('Create delivery WO error:', deliveryWOError);
          continue;
        }

        const { error: deliveryItemError } = await supabaseAdmin
          .from('wo_items')
          .insert([{
            tenant_id,
            wo_id: deliveryWO.id,
            item_code: `${deliveryWO.id}-001`,
            status: 'PENDING',
            unit_price: 0,
            total_revenue: 0,
            item_data: {
              is_internal_fwd: true,
              source_deconsol_id: id,
              container_assignment_id: item.container_assignment?.container_number || null,
              delivery_address: item.delivery_address,
              delivery_contact: item.delivery_contact,
              delivery_phone: item.delivery_phone,
              cargo_owner_name: item.cargo_owner_name,
              consignee_name: item.consignee_name,
              volume_cbm: item.volume_cbm,
              gross_weight_kg: item.gross_weight_kg,
              packages: item.packages,
              package_type: item.package_type,
              commodity: item.commodity
            }
          }]);

        if (deliveryItemError) {
          console.error('Create delivery WO item error:', deliveryItemError);
        }

        await supabaseAdmin
          .from('fw_container_items')
          .update({
            last_mile_wo_id: deliveryWO.id,
            is_deconsoled: true,
            deconsoled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        deliveryWOsCreated.push(deliveryWO.id);
      } else {
        await supabaseAdmin
          .from('fw_container_items')
          .update({
            is_deconsoled: true,
            deconsoled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }

    for (const container of containers || []) {
      await supabaseAdmin
        .from('fw_container_assignments')
        .update({ status: 'deconsoled', updated_at: new Date().toISOString() })
        .eq('id', container.id);
    }

    const newStatus = deliveryWOsCreated.length > 0 ? 'deconsol_done' : 'closed';
    await supabaseAdmin
      .from('fw_consolidations')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: `Deconsol berhasil. ${deliveryWOsCreated.length} delivery WO dibuat.`,
      delivery_wo_ids: deliveryWOsCreated
    });
  } catch (error: any) {
    console.error('Deconsol error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
