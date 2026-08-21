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

// POST /api/tenant/master/drivers/resolve-conflict
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { tenant_id, driver_id, conflicting_driver_id, action, new_phone, reason } = payload;

    if (!tenant_id || !driver_id || !action || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'CORRECT_PHONE' && !new_phone) {
      return NextResponse.json({ error: 'New phone is required when correcting phone' }, { status: 400 });
    }

    // Verify tenant authorization (user must have access to tenant_id)
    const { data: tenantAccess } = await (supabase as unknown as TenantAccessQuery)
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (!tenantAccess && user.user_metadata?.tenant_id !== tenant_id) {
      return NextResponse.json({ error: 'Forbidden tenant access' }, { status: 403 });
    }

    // Canonicalize if CORRECT_PHONE
    let finalPhone = new_phone;
    if (action === 'CORRECT_PHONE' && new_phone) {
      try {
        const canonical = normalizePhone(new_phone);
        if (!canonical) {
          return NextResponse.json({ error: 'Invalid new phone format' }, { status: 400 });
        }
      } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Invalid new phone format' }, { status: 400 });
      }
    }

    // Call RPC
    const { data, error } = await supabase.rpc('resolve_driver_collision', {
      p_driver_id: driver_id,
      p_tenant_id: tenant_id,
      p_action: action,
      p_reason: reason,
      p_conflicting_driver_id: conflicting_driver_id || null,
      p_new_phone: finalPhone || null
    });

    if (error) {
      console.error('[API] Resolve collision error:', error);
      if (error.message?.includes('CONFLICT')) {
        return NextResponse.json({ error: 'Nomor HP baru yang dimasukkan juga sudah digunakan oleh driver aktif lainnya.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] POST /api/tenant/master/drivers/resolve-conflict error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
