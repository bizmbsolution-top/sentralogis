import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/admin/sync-status
 * 
 * Syncs stuck driver/fleet statuses by checking against active job orders.
 * Can be called manually or via cron job.
 * 
 * Request body (optional):
 * {
 *   "dryRun": true  // If true, only returns counts without updating
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const today = new Date().toISOString().split('T')[0];
    const activeStatuses = ['SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending'];

    // Find drivers that are on_duty but have no active jobs
    const { data: allOnDutyDrivers, error: driversFetchError } = await supabaseAdmin
      .from('md_drivers')
      .select('id, name, status, is_working')
      .eq('status', 'on_duty');

    if (driversFetchError) {
      console.error('[sync-status] Error fetching on-duty drivers:', driversFetchError);
      return NextResponse.json({ success: false, error: driversFetchError.message }, { status: 500 });
    }

    const driversToReset: any[] = [];
    const driversResetWithShift: any[] = [];

    for (const driver of allOnDutyDrivers || []) {
      // Check for active jobs
      const { data: activeJobs } = await supabaseAdmin
        .from('job_orders')
        .select('id, status')
        .eq('driver_id', driver.id)
        .not('status', 'in', `(${activeStatuses.join(',')})`)
        .limit(1);

      // Check for active shift today
      const { data: activeShift } = await supabaseAdmin
        .from('driver_attendance')
        .select('id')
        .eq('driver_id', driver.id)
        .eq('status', 'CHECK_IN')
        .gte('check_in', `${today}T00:00:00`)
        .limit(1);

      const hasActiveJobs = activeJobs && activeJobs.length > 0;
      const hasActiveShift = activeShift && activeShift.length > 0;

      if (!hasActiveJobs) {
        if (hasActiveShift) {
          // Driver still on shift but no jobs - set to available
          driversResetWithShift.push({ id: driver.id, name: driver.name, reason: 'No active jobs but has shift' });
          if (!dryRun) {
            await supabaseAdmin
              .from('md_drivers')
              .update({ status: 'available', updated_at: new Date().toISOString() })
              .eq('id', driver.id);
          }
        } else {
          // No jobs and no shift - full reset
          driversToReset.push({ id: driver.id, name: driver.name, reason: 'No active jobs, no shift' });
          if (!dryRun) {
            await supabaseAdmin
              .from('md_drivers')
              .update({ status: 'available', is_working: false, updated_at: new Date().toISOString() })
              .eq('id', driver.id);
          }
        }
      }
    }

    // Find fleets that are on_road but have no active jobs
    const { data: allOnRoadFleets, error: fleetsFetchError } = await supabaseAdmin
      .from('md_fleets')
      .select('id, plate_number, status')
      .eq('status', 'on_road');

    if (fleetsFetchError) {
      console.error('[sync-status] Error fetching on-road fleets:', fleetsFetchError);
      return NextResponse.json({ success: false, error: fleetsFetchError.message }, { status: 500 });
    }

    const fleetsToReset: any[] = [];

    for (const fleet of allOnRoadFleets || []) {
      const { data: activeJobs } = await supabaseAdmin
        .from('job_orders')
        .select('id, status')
        .eq('fleet_id', fleet.id)
        .not('status', 'in', `(${activeStatuses.join(',')})`)
        .limit(1);

      if (!activeJobs || activeJobs.length === 0) {
        fleetsToReset.push({ id: fleet.id, plate_number: fleet.plate_number, reason: 'No active jobs' });
        if (!dryRun) {
          await supabaseAdmin
            .from('md_fleets')
            .update({ status: 'available', updated_at: new Date().toISOString() })
            .eq('id', fleet.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        drivers_reset: driversToReset.length,
        drivers_reset_with_shift: driversResetWithShift.length,
        fleets_reset: fleetsToReset.length,
        total_resets: driversToReset.length + driversResetWithShift.length + fleetsToReset.length
      },
      details: {
        drivers_reset: driversToReset,
        drivers_reset_with_shift: driversResetWithShift,
        fleets_reset: fleetsToReset
      },
      synced_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[sync-status] Critical error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/sync-status
 * 
 * Returns current status counts without making changes.
 */
export async function GET() {
  try {
    const activeStatuses = ['SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending'];

    const [onDutyDrivers, onRoadFleets, activeJobs] = await Promise.all([
      supabaseAdmin.from('md_drivers').select('id, name, status, is_working').eq('status', 'on_duty'),
      supabaseAdmin.from('md_fleets').select('id, plate_number, status').eq('status', 'on_road'),
      supabaseAdmin.from('job_orders').select('id, driver_id, fleet_id, status').not('status', 'in', `(${activeStatuses.join(',')})`)
    ]);

    const activeJobDriverIds = new Set((activeJobs.data || []).map(j => j.driver_id).filter(Boolean));
    const activeJobFleetIds = new Set((activeJobs.data || []).map(j => j.fleet_id).filter(Boolean));

    const stuckDrivers = (onDutyDrivers.data || []).filter(d => !activeJobDriverIds.has(d.id));
    const stuckFleets = (onRoadFleets.data || []).filter(f => !activeJobFleetIds.has(f.id));

    return NextResponse.json({
      success: true,
      current_status: {
        on_duty_drivers: onDutyDrivers.data?.length || 0,
        on_road_fleets: onRoadFleets.data?.length || 0,
        active_jobs: activeJobs.data?.length || 0,
        stuck_drivers: stuckDrivers.length,
        stuck_fleets: stuckFleets.length,
        stuck_driver_details: stuckDrivers,
        stuck_fleet_details: stuckFleets
      },
      checked_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[sync-status] GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
