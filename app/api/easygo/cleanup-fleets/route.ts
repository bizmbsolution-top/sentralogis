// POST /api/easygo/cleanup-fleets
// Merge duplicate fleets: keep the one with easygo_vehicle_id, delete others
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id;
    const dryRun = body.dry_run !== false; // default true

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    }

    // Find duplicate plate_numbers (same plate, multiple fleet rows)
    const { data: allFleets } = await supabase
      .from('md_fleets')
      .select('id, fleet_code, plate_number, easygo_vehicle_id, entity_id, status, is_active')
      .eq('tenant_id', tenantId)
      .order('plate_number');

    if (!allFleets || allFleets.length === 0) {
      return NextResponse.json({ message: 'No fleets found', duplicates: 0 });
    }

    // Group by plate_number
    const plateMap = new Map<string, typeof allFleets>();
    for (const f of allFleets) {
      const key = f.plate_number?.trim().toUpperCase();
      if (!key) continue;
      const list = plateMap.get(key) || [];
      list.push(f);
      plateMap.set(key, list);
    }

    // Find duplicates
    const duplicates: Array<{
      plate_number: string;
      keep: typeof allFleets[0];
      delete: typeof allFleets;
    }> = [];

    for (const [plate, fleets] of plateMap) {
      if (fleets.length <= 1) continue;

      // Prefer the one with easygo_vehicle_id
      const withEasygo = fleets.find(f => f.easygo_vehicle_id);
      const withoutEasygo = fleets.filter(f => !f.easygo_vehicle_id);

      if (withEasygo && withoutEasygo.length > 0) {
        duplicates.push({
          plate_number: plate,
          keep: withEasygo,
          delete: withoutEasygo,
        });
      } else if (!withEasygo) {
        // No easygo on any — keep the first, delete rest
        duplicates.push({
          plate_number: plate,
          keep: fleets[0],
          delete: fleets.slice(1),
        });
      }
    }

    const deletedIds: string[] = [];
    const errors: string[] = [];

    if (!dryRun) {
      for (const dup of duplicates) {
        for (const fleet of dup.delete) {
          // Check for related data first
          const { count: joCount } = await supabase
            .from('job_orders')
            .select('*', { count: 'exact', head: true })
            .eq('fleet_id', fleet.id);

          if (joCount && joCount > 0) {
            errors.push(`${fleet.fleet_code} (${dup.plate_number}): has ${joCount} job orders — skipped`);
            continue;
          }

          // Check job_tracking
          const { count: jtCount } = await supabase
            .from('job_tracking')
            .select('*', { count: 'exact', head: true })
            .eq('fleet_id', fleet.id);

          if (jtCount && jtCount > 0) {
            errors.push(`${fleet.fleet_code} (${dup.plate_number}): has ${jtCount} tracking records — skipped`);
            continue;
          }

          const { error } = await supabase
            .from('md_fleets')
            .delete()
            .eq('id', fleet.id);

          if (error) {
            errors.push(`Delete ${fleet.fleet_code} failed: ${error.message}`);
          } else {
            deletedIds.push(fleet.id);
          }
        }

        // Update the kept fleet's fleet_code to EG format
        const egCode = `EG-${dup.plate_number.replace(/\s+/g, '').toUpperCase()}`;
        if (dup.keep.fleet_code !== egCode) {
          await supabase
            .from('md_fleets')
            .update({ fleet_code: egCode, updated_at: new Date().toISOString() })
            .eq('id', dup.keep.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      total_fleets: allFleets.length,
      duplicate_plates: duplicates.length,
      duplicates: duplicates.map(d => ({
        plate_number: d.plate_number,
        keep: { id: d.keep.id, fleet_code: d.keep.fleet_code, easygo: !!d.keep.easygo_vehicle_id },
        will_delete: d.delete.map(f => ({ id: f.id, fleet_code: f.fleet_code, easygo: !!f.easygo_vehicle_id })),
      })),
      deleted_count: deletedIds.length,
      errors,
    });
  } catch (error: any) {
    console.error('[EasyGo Cleanup] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
