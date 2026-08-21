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

// POST /api/tenant/master/drivers
// Create a new driver with atomic global identity resolution
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { tenant_id, entity_id, name, phone, whatsapp, pin, address, sim_number, sim_class, sim_expiry, status, is_active, driver_code } = payload;

    if (!tenant_id || !name || (!whatsapp && !phone)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify tenant authorization (user must have access to tenant_id)
    // Here we check if the user belongs to the tenant.
    const { data: tenantAccess } = await (supabase as unknown as TenantAccessQuery)
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    // Fallback: If user has 'tenant_id' in their metadata
    if (!tenantAccess && user.user_metadata?.tenant_id !== tenant_id) {
      return NextResponse.json({ error: 'Forbidden tenant access' }, { status: 403 });
    }

    // Attempt to normalize phone
    const contactNumber = whatsapp || phone;
    let canonicalPhone: string;
    try {
      canonicalPhone = normalizePhone(contactNumber);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Invalid phone format' }, { status: 400 });
    }

    if (canonicalPhone) {
      const { data: existingDrivers } = await supabase
        .from('md_drivers')
        .select('id, name, driver_code, whatsapp')
        .eq('tenant_id', tenant_id)
        .not('whatsapp', 'is', null);

      if (existingDrivers) {
        const conflict = existingDrivers.find(d => {
          try {
            return normalizePhone(d.whatsapp) === canonicalPhone;
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

    // Call RPC to create atomically
    const { data, error } = await supabase.rpc('create_driver', {
      p_tenant_id: tenant_id,
      p_entity_id: entity_id || null,
      p_name: name,
      p_whatsapp: contactNumber,
      p_pin: pin || null,
      p_address: address || null,
      p_sim_number: sim_number || null,
      p_sim_class: sim_class || null,
      p_sim_expiry: sim_expiry || null,
      p_status: status || 'available',
      p_is_active: is_active !== undefined ? is_active : true,
      p_driver_code: driver_code || null
    });

    if (error) {
      console.error('[API] Create driver error:', error);
      if (error.message?.includes('PROFILE_CONFLICT')) {
        return NextResponse.json({ error: 'Driver already exists in this tenant.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /api/tenant/master/drivers error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
