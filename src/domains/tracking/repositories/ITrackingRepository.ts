import { TrackingSession } from '../TrackingSession';
import { Result } from '../../../shared/kernel/Result';

export interface ITrackingRepository {
  /**
   * Retrieves a TrackingSession by its reference ID (e.g. Job Order ID).
   * For backward compatibility, this method maps legacy `job_routes` into `GeofenceZones`
   * when creating the TrackingSession instance.
   */
  findByReference(referenceType: string, referenceId: string, tenantId: string): Promise<TrackingSession | null>;
  
  /**
   * Saves tracking points and persists geofence events to the database.
   */
  save(session: TrackingSession): Promise<Result<void>>;
}
