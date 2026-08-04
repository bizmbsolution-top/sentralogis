import { ITrackingRepository } from '../../../domains/tracking/repositories/ITrackingRepository';
import { TrackingEvent } from '../../../domains/tracking/TrackingEvents';
import { Result } from '../../../shared/kernel/Result';
import { IRequestContext } from '../../../domains/security/contracts/IRequestContext';
import { IPermissionEngine } from '../../../domains/security/contracts/IPermissionEngine';
import { TrackingSession } from '../../../domains/tracking/TrackingSession';

const RESOURCE = 'tracking.session';

export class TrackingService {
  constructor(
    private readonly permissionEngine: IPermissionEngine,
    private readonly trackingRepo: ITrackingRepository
  ) {}

  /**
   * Processes a GPS ping from a tracking session.
   * Emits events if boundaries are crossed or state changes.
   */
  public async recordPing(
    ctx: IRequestContext,
    referenceType: string,
    referenceId: string,
    lat: number,
    lng: number,
    recordedAt: Date,
    accuracy?: number
  ): Promise<Result<TrackingEvent[]>> {
    
    if (!this.permissionEngine.can(ctx, 'update', RESOURCE)) {
      return Result.fail<TrackingEvent[]>('Unauthorized to record tracking ping.');
    }

    // 1. Restore Aggregate
    let session = await this.trackingRepo.findByReference(referenceType, referenceId, ctx.tenantId);
    
    if (!session) {
      // If not exists, we create a new empty one for safety (though normally findByReference handles legacy mapping)
      const sessionResult = TrackingSession.create(referenceType, referenceId, crypto.randomUUID(), ctx.tenantId);
      if (sessionResult.isFailure) {
        return Result.fail<TrackingEvent[]>(sessionResult.error as string);
      }
      session = sessionResult.getValue();
    }

    // 2. Delegate to Aggregate to execute business rules
    const pingResult = session.recordPing(lat, lng, recordedAt, accuracy);
    if (pingResult.isFailure) {
      return pingResult;
    }

    // 3. Persist State
    const saveResult = await this.trackingRepo.save(session);
    if (saveResult.isFailure) {
      return Result.fail<TrackingEvent[]>(saveResult.error as string);
    }

    return pingResult;
  }
}
