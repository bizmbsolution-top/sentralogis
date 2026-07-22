import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenant_id,
      user_id,
      wo_id,
      sub_type,
      moda,
      service_type,
      delivery_type,
      origin_location_id,
      origin_location_name,
      destination_location_id,
      destination_location_name,
      quantity,
      uom,
      selling_price,
      total_revenue,
      notes
    } = body;

    if (!tenant_id || !wo_id || !sub_type || !moda || !service_type || !delivery_type) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Insert fw_order_headers
    const { data: headerData, error: headerError } = await supabaseAdmin
      .from('fw_order_headers')
      .insert([{
        tenant_id,
        wo_id,
        sub_type,
        moda,
        service_type,
        delivery_type,
        origin_location_id,
        origin_location_name,
        destination_location_id,
        destination_location_name,
        selling_price_snapshot: selling_price,
        status: 'need_assignment',
        created_by: user_id
      }])
      .select('id')
      .single();

    if (headerError) throw headerError;

    // Generate legs from template
    const templateKey = `${moda}_${service_type}_${delivery_type}`.toLowerCase();
    const templates: Record<string, any> = {
      'sea_fcl_door_to_door': [
        { leg_type: 'pickup', leg_number: 1, vendor_type: 'trucking_origin', uom: 'container' },
        { leg_type: 'main_carriage', leg_number: 2, vendor_type: 'shipping_line', uom: 'container' },
        { leg_type: 'delivery', leg_number: 3, vendor_type: 'trucking_dest', uom: 'container' }
      ],
      'sea_fcl_port_to_port': [
        { leg_type: 'main_carriage', leg_number: 1, vendor_type: 'shipping_line', uom: 'container' }
      ],
      'sea_fcl_door_to_port': [
        { leg_type: 'pickup', leg_number: 1, vendor_type: 'trucking_origin', uom: 'container' },
        { leg_type: 'main_carriage', leg_number: 2, vendor_type: 'shipping_line', uom: 'container' }
      ],
      'sea_fcl_port_to_door': [
        { leg_type: 'main_carriage', leg_number: 1, vendor_type: 'shipping_line', uom: 'container' },
        { leg_type: 'delivery', leg_number: 2, vendor_type: 'trucking_dest', uom: 'container' }
      ],
      'sea_lcl_door_to_door': [
        { leg_type: 'pickup', leg_number: 1, vendor_type: 'trucking_origin', uom: 'cbm' },
        { leg_type: 'main_carriage', leg_number: 2, vendor_type: 'shipping_line', uom: 'cbm' },
        { leg_type: 'delivery', leg_number: 3, vendor_type: 'trucking_dest', uom: 'cbm' }
      ],
      'land_ftl_door_to_door': [
        { leg_type: 'pickup', leg_number: 1, vendor_type: 'trucking_origin', uom: 'unit' },
        { leg_type: 'main_carriage', leg_number: 2, vendor_type: 'trucking_own', uom: 'unit' },
        { leg_type: 'delivery', leg_number: 3, vendor_type: 'trucking_dest', uom: 'unit' }
      ]
    };

    const legs = templates[templateKey];
    if (legs) {
      const legsPayload = legs.map((leg: any) => ({
        tenant_id,
        fw_order_header_id: headerData.id,
        leg_type: leg.leg_type,
        leg_number: leg.leg_number,
        execution_mode: 'OWN',
        vendor_type: leg.vendor_type,
        origin_location_id,
        origin_location_name,
        destination_location_id,
        destination_location_name,
        qty: quantity,
        uom: leg.uom,
        selling_price: selling_price,
        cost_amount: 0,
        purchase_price: 0,
        status: 'pending',
        notes: notes
      }));

      const { error: legsError } = await supabaseAdmin
        .from('fw_legs')
        .insert(legsPayload);

      if (legsError) throw legsError;
    }

    return NextResponse.json({ success: true, header_id: headerData.id });

  } catch (error: any) {
    console.error('Create forwarding order header error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}