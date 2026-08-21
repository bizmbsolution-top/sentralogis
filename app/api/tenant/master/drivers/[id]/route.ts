import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/phone';

type TenantAccessQuery = {
  from(table: 'user_tenants'): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column: string, value: string): {
          single(): PromiseLike<{ data: { tenant_id: string } | null }>;
        };
      };
    };
  };
};

// PUT /api/tenant/master/drivers/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: driverId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { entity_id, name, phone, whatsapp, address, sim_number, sim_class, sim_expiry, status, is_active } = payload;

    // Resolve driver from DB to get authoritative tenant_id
    const { data: driverInfo } = await supabase
      .from('md_drivers')
      .select('tenant_id')
      .eq('id', driverId)
      .single();

    if (!driverInfo) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    const tenant_id = driverInfo.tenant_id;

    // Verify tenant authorization (user must have access to tenant_id)
    const { data: tenantAccess } = await (supabase as unknown as TenantAccessQuery)
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id as string)
      .single();

    if (!tenantAccess && user.user_metadata?.tenant_id !== tenant_id) {
      return NextResponse.json({ error: 'Forbidden tenant access' }, { status: 403 });
    }

    if (!name || (!whatsapp && !phone)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const contactNumber = whatsapp || phone;
    let canonicalPhone: string;
    try {
      canonicalPhone = normalizePhone(contactNumber || '');
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Invalid phone format' }, { status: 400 });
    }

    if (canonicalPhone) {
      const { data: existingDrivers } = await supabase
        .from('md_drivers')
        .select('id, name, driver_code, whatsapp')
        .eq('tenant_id', tenant_id || '')
        .neq('id', driverId)
        .not('whatsapp', 'is', null);

      if (existingDrivers) {
        const conflict = existingDrivers.find(d => {
          try {
            return normalizePhone(d.whatsapp || '') === canonicalPhone;
          } catch {
            return false;
          }
        });
        if (conflict) {
          return NextResponse.json({ 
            error: `Nomor WhatsApp ini sudah digunakan oleh driver ${conflict.name} (${conflict.driver_code || '-'}) di tenant ini. Silakan gunakan nomor lain.`,
            code: 'TENANT_PHONE_ALREADY_USED',
            existing_driver: conflict
          }, { status: 409 });
        }
      }
    }

    const { data, error } = await supabase.rpc('update_driver', {
      p_driver_id: driverId,
      p_tenant_id: tenant_id!,
      p_name: name,
      p_whatsapp: contactNumber,
      p_is_active: is_active !== undefined ? is_active : true,
      p_address: address || null,
      p_sim_number: sim_number || null,
      p_sim_class: sim_class || null,
      p_sim_expiry: sim_expiry || null,
      p_status: status || 'available',
      p_entity_id: entity_id || null
    });

    if (error) {
      console.error('[API] Update driver error:', error);
      if (error.message?.includes('PROFILE_CONFLICT')) {
        return NextResponse.json({ error: 'Nomor HP sudah digunakan oleh profil pengemudi lain.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] PUT /api/tenant/master/drivers/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/tenant/master/drivers/[id]
// DEACTIVATE only (Soft Delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: driverId } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve driver from DB to get authoritative tenant_id
    const { data: driverInfo } = await supabase
      .from('md_drivers')
      .select('tenant_id')
      .eq('id', driverId)
      .single();

    if (!driverInfo) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    const tenantId = driverInfo.tenant_id;

    // Verify tenant authorization (user must have access to tenant_id)
    const { data: tenantAccess } = await (supabase as unknown as TenantAccessQuery)
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId as string)
      .single();

    if (!tenantAccess && user.user_metadata?.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden tenant access' }, { status: 403 });
    }

    const { data, error } = await supabase.rpc('deactivate_driver', {
      p_driver_id: driverId,
      p_tenant_id: tenantId!
    });

    if (error) {
      console.error('[API] Deactivate driver error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] DELETE /api/tenant/master/drivers/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
