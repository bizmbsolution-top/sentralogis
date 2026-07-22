import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenant_id,
      user_id,
      customer_id,
      order_date,
      execution_date,
      service_type, // FCL / LCL
      delivery_type, // D2D / P2P / D2P / P2D
      origin_port,
      destination_port,
      containers, // Array of container items
      notes,
      status = 'PENDING'
    } = body;

    if (!tenant_id || !customer_id || !service_type || !origin_port || !destination_port) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const generateWo = async (sbuCode: string) => {
      const today = new Date();
      const mmyy = `${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
      
      let customerCode = 'CUS';
      const { data: customerData } = await supabaseAdmin.from('md_entities').select('entity_code, name').eq('id', customer_id).single();
      if (customerData) customerCode = customerData.entity_code || customerData.name?.substring(0, 3).toUpperCase() || 'CUS';
      
      const { count } = await supabaseAdmin.from('work_orders').select('*', { count: 'exact', head: true });
      // Add random number to avoid race condition if exact count fails on heavy load, but for now just use count
      const sequenceStr = String((count || 0) + Math.floor(Math.random() * 10) + 1).padStart(3, '0');
      
      let tenantCode = 'HQ'; 
      const { data: tenantData } = await supabaseAdmin.from('md_tenants').select('tenant_code, name, initial').eq('id', tenant_id).single();
      if (tenantData) {
        tenantCode = tenantData.initial || tenantData.tenant_code?.split('-')[0] || tenantData.name?.substring(0, 4).toUpperCase() || 'HQ';
      }
      
      return `${tenantCode}-${customerCode}-${sbuCode}-${mmyy}-${sequenceStr}`;
    };

    // 1. Generate WO Number for Forwarding
    const wo_number = await generateWo('FWD');

    // 2. Insert WO record
    const { data: woData, error: woError } = await supabaseAdmin
      .from('work_orders')
      .insert([{
        tenant_id,
        wo_number,
        customer_id,
        order_date,
        execution_date,
        sbu_type: 'FORWARDING',
        status: status || 'PENDING',
        notes,
        created_by: user_id,
        updated_by: user_id
      }])
      .select('id')
      .single();

    if (woError) throw woError;
    const wo_id = woData.id;

    // 3. Process Containers
    for (let i = 0; i < containers.length; i++) {
      const cont = containers[i];
      
      // Generate WO Item for Forwarding
      const { data: itemData, error: itemError } = await supabaseAdmin
        .from('wo_items')
        .insert([{
          tenant_id,
          wo_id,
          item_code: `${wo_number}-${(i + 1).toString().padStart(3, '0')}`,
          status: 'PENDING',
          unit_price: cont.sell_price || 0,
          total_revenue: cont.sell_price || 0,
          created_by: user_id
        }])
        .select('id')
        .single();
        
      if (itemError) throw itemError;
      const wo_item_id = itemData.id;
      
      let pickup_wo_id = null;
      let last_mile_wo_id = null;

      // 4. Auto-create WO Trucking if D2D/D2P/P2D
      if (['D2D', 'D2P'].includes(delivery_type)) {
        const trkWoNumber = await generateWo('TRK');
        const { data: trkWo, error: trkWoError } = await supabaseAdmin
          .from('work_orders')
          .insert([{
            tenant_id,
            wo_number: trkWoNumber,
            customer_id, // Same cargo owner
            order_date,
            execution_date,
            sbu_type: 'TRUCKING',
            status: 'PENDING',
            notes: `Auto-generated Pickup for FWD ${wo_number}`,
            created_by: user_id
          }])
          .select('id')
          .single();
          
        if (trkWoError) throw trkWoError;
        pickup_wo_id = trkWo.id;

        // Create 1 wo_item for trucking
        await supabaseAdmin.from('wo_items').insert([{
          tenant_id,
          wo_id: trkWo.id,
          item_code: `${trkWoNumber}-001`,
          status: 'PENDING',
          unit_price: cont.cogs_pickup || 0, // Trucking revenue = FWD COGS
          total_revenue: cont.cogs_pickup || 0,
          item_data: {
            is_internal_fwd: true,
            source_fwd_wo_id: wo_id,
            container_type: cont.container_type,
            pickup_address: cont.pickup_address,
            origin_port
          }
        }]);
      }

      if (['D2D', 'P2D'].includes(delivery_type)) {
        const trkWoNumber = await generateWo('TRK');
        const { data: trkWo, error: trkWoError } = await supabaseAdmin
          .from('work_orders')
          .insert([{
            tenant_id,
            wo_number: trkWoNumber,
            customer_id, 
            order_date,
            execution_date,
            sbu_type: 'TRUCKING',
            status: 'PENDING',
            notes: `Auto-generated Last Mile for FWD ${wo_number}`,
            created_by: user_id
          }])
          .select('id')
          .single();
          
        if (trkWoError) throw trkWoError;
        last_mile_wo_id = trkWo.id;

        // Create 1 wo_item for trucking
        await supabaseAdmin.from('wo_items').insert([{
          tenant_id,
          wo_id: trkWo.id,
          item_code: `${trkWoNumber}-001`,
          status: 'PENDING',
          unit_price: cont.cogs_last_mile || 0,
          total_revenue: cont.cogs_last_mile || 0,
          item_data: {
            is_internal_fwd: true,
            source_fwd_wo_id: wo_id,
            container_type: cont.container_type,
            delivery_address: cont.delivery_address,
            destination_port
          }
        }]);
      }

      // 5. Insert fw_container_items
      const generateTrackingToken = () => {
        return typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now().toString(36);
      };

      const { error: fwContError } = await supabaseAdmin
        .from('fw_container_items')
        .insert([{
          tenant_id,
          wo_item_id,
          delivery_type,
          delivery_address: cont.delivery_address || null,
          pickup_wo_id,
          last_mile_wo_id,
          price_master_id: cont.price_master_id || null,
          sell_price_snapshot: cont.sell_price || 0,
          cogs_pickup: cont.cogs_pickup || 0,
          cogs_port_haulage_origin: cont.cogs_port_haulage_origin || 0,
          cogs_ocean_freight: cont.cogs_ocean_freight || 0,
          cogs_thc_origin: cont.cogs_thc_origin || 0,
          cogs_thc_dest: cont.cogs_thc_dest || 0,
          cogs_port_haulage_dest: cont.cogs_port_haulage_dest || 0,
          cogs_last_mile: cont.cogs_last_mile || 0,
          cogs_documentation: cont.cogs_documentation || 0,
          cogs_other: cont.cogs_other || 0,
          volume_cbm: cont.volume_cbm || null,
          gross_weight_kg: cont.gross_weight_kg || null,
          commodity: cont.commodity || null,
          tracking_token: generateTrackingToken()
        }]);
        
      if (fwContError) throw fwContError;
    }

    return NextResponse.json({ success: true, wo_id });

  } catch (error: any) {
    console.error('Create FWD WO Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
