import { SupabaseClient } from '@supabase/supabase-js';
import { ITrackingRepository } from '../../../domains/tracking/repositories/ITrackingRepository';
import { TrackingSession, GeofenceZone, TrackingPoint } from '../../../domains/tracking/TrackingSession';
import { Result } from '../../../shared/kernel/Result';

export class SupabaseTrackingRepository implements ITrackingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async findByReference(referenceType: string, referenceId: string, tenantId: string): Promise<TrackingSession | null> {
    try {
      // 1. Try to find existing tracking session
      let sessionId = crypto.randomUUID();
      let status = 'ACTIVE';
      
      const { data: sessionData, error: sessionErr } = await this.supabase
        .from('tracking_sessions')
        .select('*')
        .eq('reference_type', referenceType)
        .eq('reference_id', referenceId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
        
      if (sessionData) {
        sessionId = sessionData.id;
        status = sessionData.status;
      }

      // 2. Load geofences
      let zones: GeofenceZone[] = [];
      
      // Migration backward compatibility: Load job_routes as geofences if referenceType is JOB_ORDER
      if (referenceType === 'JOB_ORDER') {
        const { data: routes } = await this.supabase
          .from('job_routes')
          .select('id, latitude, longitude, location_name, status')
          .eq('job_order_id', referenceId)
          .in('status', ['pending', 'arrived']); // Only active routes
          
        if (routes) {
          zones = routes
            .filter((r: any) => r.latitude !== null && r.longitude !== null)
            .map((r: any) => ({
              id: crypto.randomUUID(),
              latitude: Number(r.latitude),
              longitude: Number(r.longitude),
              radiusMeters: 500, // Legacy hardcoded radius
              zoneType: r.location_name || 'TRANSIT',
              referenceId: r.id
            }));
        }
      }

      // 3. Load latest point to satisfy debounce logic (lastPingAt, lastLatitude, lastLongitude)
      // We don't need all points in memory, just the last one.
      const { data: lastPoint } = await this.supabase
        .from('tracking_points')
        .select('*')
        .eq('session_id', sessionId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const trackingSessionResult = TrackingSession.restore({
        referenceType,
        referenceId,
        status: status as 'ACTIVE'|'COMPLETED'|'CANCELLED',
        zones,
        points: [],
        lastPingAt: lastPoint ? new Date(lastPoint.recorded_at) : undefined,
        lastLatitude: lastPoint ? Number(lastPoint.latitude) : undefined,
        lastLongitude: lastPoint ? Number(lastPoint.longitude) : undefined
      }, sessionId, tenantId);

      return trackingSessionResult;
    } catch (err) {
      console.error('[SupabaseTrackingRepository] Error in findByReference:', err);
      return null;
    }
  }

  public async save(session: TrackingSession): Promise<Result<void>> {
    try {
      // 1. Upsert session
      const { error: sessionErr } = await this.supabase
        .from('tracking_sessions')
        .upsert({
          id: session.id,
          tenant_id: session.tenantId,
          reference_type: session.referenceType,
          reference_id: session.referenceId,
          status: session.status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (sessionErr) return Result.fail<void>(sessionErr.message);

      // 2. Insert new points
      const newPoints = session.latestPoints; // In our simplified aggregate, these are the new ones added
      if (newPoints.length > 0) {
        // Just take the last one since we only push one per ping
        const p = newPoints[newPoints.length - 1];
        await this.supabase.from('tracking_points').insert({
          session_id: session.id,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          recorded_at: p.recordedAt.toISOString()
        });
      }

      return Result.ok<void>();
    } catch (err: any) {
      return Result.fail<void>(err.message);
    }
  }
}
