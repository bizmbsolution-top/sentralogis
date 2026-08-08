// POST /api/easygo/sync-vehicles
// Sync vehicles from EasyGo to md_fleets

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EasyGoSyncService } from '@/src/application/gps/EasyGoSyncService';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id;

    console.log('[EasyGo Sync Vehicles] Starting sync for tenant:', tenantId);

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    }

    // Verify tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const service = new EasyGoSyncService(supabase);
    const result = await service.syncVehicles(tenantId);

    return NextResponse.json({
      success: true,
      tenant: tenant.name,
      ...result,
    });
  } catch (error: any) {
    console.error('[EasyGo Sync Vehicles] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
