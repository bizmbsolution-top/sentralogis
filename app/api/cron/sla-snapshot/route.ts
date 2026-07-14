import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 180;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Verify cron secret if configured
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Fetch all active tenants
    const { data: tenants, error: tErr } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('is_active', true);

    if (tErr) {
      throw new Error(`Failed to fetch tenants: ${tErr.message}`);
    }

    // 3. For each tenant, call capture_sla_snapshot
    const results: string[] = [];
    for (const tenant of tenants || []) {
      const { error: rErr } = await supabaseAdmin.rpc('capture_sla_snapshot', { p_tenant_id: tenant.id });
      if (rErr) {
        console.error(`Error capturing SLA snapshot for tenant ${tenant.id}:`, rErr);
      } else {
        results.push(tenant.id);
      }
    }

    return NextResponse.json({ 
      success: true,
      captured: results.length,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'SLA snapshot cron failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
