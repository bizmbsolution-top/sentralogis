// [AI] Mission Control API — Remediate auto-fix anomalies
// [AI] reading from .env.local for Supabase credentials

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function getAdmin() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const { type, table } = await req.json();
    if (!type) {
      return NextResponse.json({ success: false, error: 'Anomaly type required' }, { status: 400 });
    }

    const client = getAdmin();
    if (!client) {
      throw new Error('Supabase admin client not initialized');
    }

    let resolvedCount = 0;

    // SCENARIO 1: Stuck Job Orders
    // Action: Unassign driver, revert status to READY
    if (type === 'stuck_jo') {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data, error } = await client
        .from('job_orders')
        .update({ status: 'READY', driver_id: null, fleet_id: null })
        .eq('status', 'ASSIGNED')
        .is('driver_accepted_at', null)
        .lt('created_at', twoHoursAgo)
        .select('id');

      if (error) throw error;
      resolvedCount = data?.length || 0;
      logger.info('observability', 'AUTO_FIX_STUCK_JO', { payload: { resolvedCount } });
    }
    
    // SCENARIO 2: Over-Reserved Stock in WMS
    // Action: Force sync reserved_quantity down to physical quantity
    else if (type === 'over_reserved') {
      // Supabase-js REST doesn't support col=col in update natively without rpc.
      // So we fetch the over-reserved, then update them.
      const { data: anomalies, error: fetchErr } = await client
        .from('wh_inventory')
        .select('id, quantity, reserved_quantity')
        .gt('reserved_quantity', 0);
        
      if (fetchErr) throw fetchErr;

      const toUpdate = (anomalies || []).filter(inv => inv.reserved_quantity > inv.quantity);
      
      if (toUpdate.length > 0) {
        // Bulk update is possible via insert/upsert, but for safety we do a loop or Promise.all
        await Promise.all(
          toUpdate.map(inv => 
            client.from('wh_inventory').update({ reserved_quantity: inv.quantity }).eq('id', inv.id)
          )
        );
        resolvedCount = toUpdate.length;
        logger.info('observability', 'AUTO_FIX_OVER_RESERVED', { payload: { resolvedCount } });
      }
    }
    
    // SCENARIO 3: Clear historical alerts
    // Action: mark monitoring_checks as pass or delete them
    else if (type === 'clear_alert') {
      const { data, error } = await client
        .from('monitoring_checks')
        .update({ status: 'pass', message: 'Dismissed by Admin' })
        .eq('status', 'fail')
        .select('id');
        
      if (error) throw error;
      resolvedCount = data?.length || 0;
      logger.info('observability', 'ALERTS_CLEARED', { payload: { resolvedCount } });
    }
    
    // Log the remediation action
    logger.info('observability', 'AUTO_FIX_COMPLETED', { payload: { type, table, resolvedCount } });

    return NextResponse.json({ success: true, resolvedCount });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Remediation failed';
    logger.error('observability', 'AUTO_FIX_FAILED', { payload: { error: message }, error: err });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
