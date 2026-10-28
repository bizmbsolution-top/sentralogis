import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity(null, req);
    if (!ctx || !ctx.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 });
    }

    const tenantId = ctx.tenantId;

    // Fetch tenant_users, tenant_sbus, tenant_roles, md_warehouses, and regions
    const [staffRes, sbuRes, roleRes, whRes, regionsRes] = await Promise.all([
      (supabaseAdmin as any)
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      (supabaseAdmin as any)
        .from('tenant_sbus')
        .select('*')
        .eq('tenant_id', tenantId),
      (supabaseAdmin as any)
        .from('tenant_roles')
        .select('*'),
      (supabaseAdmin as any)
        .from('md_warehouses')
        .select('*')
        .eq('tenant_id', tenantId),
      (supabaseAdmin as any)
        .from('md_trucking_regions')
        .select('*')
        .order('name'),
    ]);

    const staffList = staffRes.data || [];
    const userIds = staffList.map((s: any) => s.user_id).filter(Boolean);

    const profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await (supabaseAdmin as any)
        .from('profiles')
        .select('id, email, full_name, role')
        .in('id', userIds);
      if (profs) {
        profs.forEach((p: any) => {
          profileMap[p.id] = p;
        });
      }
    }

    const sbuMap = (sbuRes.data || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});
    const roleMap = (roleRes.data || []).reduce((acc: any, r: any) => ({ ...acc, [r.role_code]: r }), {});
    const whMap = (whRes.data || []).reduce((acc: any, w: any) => ({ ...acc, [w.id]: w }), {});

    const enrichedStaff = staffList.map((s: any) => {
      const prof = profileMap[s.user_id] || {};
      return {
        ...s,
        email: prof.email || s.email || 'N/A',
        profiles: {
          email: prof.email || 'N/A',
          full_name: prof.full_name || s.full_name,
          role: prof.role || s.role_code,
        },
        tenant_roles: roleMap[s.role_code] || { role_name: s.role_code },
        tenant_sbus: sbuMap[s.sbu_id] || null,
        warehouse: s.warehouse_id ? whMap[s.warehouse_id] : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        staff: enrichedStaff,
        sbus: (sbuRes.data || []).filter((s: any) => s.status === 'active'),
        warehouses: whRes.data || [],
        regions: regionsRes.data || [],
        roles: roleRes.data || [],
      },
    });
  } catch (error: any) {
    console.error('[API /api/admin/users] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
