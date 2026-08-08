// POST /api/easygo/sync-gps
// Sync GPS positions from EasyGo to job_tracking

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

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    }

    const service = new EasyGoSyncService(supabase);
    const result = await service.syncLastPositions(tenantId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[EasyGo Sync GPS] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET handler for cron job
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (if configured)
    const authHeader = req.headers.get('authorization');
    const cronHeader = req.headers.get('x-vercel-cron-schedule');
    const isVercelCron = !!cronHeader;
    
    if (!isVercelCron && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[EasyGo GPS Cron] Starting GPS sync...');

    // Get all tenants with active EasyGo config
    const { data: configs } = await supabase
      .from('gps_provider_configs')
      .select('tenant_id')
      .eq('provider_name', 'easygo')
      .eq('is_active', true);

    if (!configs || configs.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: 'No active EasyGo configs' });
    }

    const service = new EasyGoSyncService(supabase);
    const results = [];

    for (const config of configs) {
      const result = await service.syncLastPositions(config.tenant_id);
      results.push({ tenant_id: config.tenant_id, ...result });
    }

    return NextResponse.json({
      success: true,
      tenants_processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[EasyGo Cron GPS] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
