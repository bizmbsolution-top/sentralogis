import { AggregateRoot } from '../../shared/kernel/AggregateRoot';
import { Result } from '../../shared/kernel/Result';
import { TrackingEvent, LocationUpdated, GeofenceTriggered } from './TrackingEvents';

export interface TrackingPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  recordedAt: Date;
}

export interface GeofenceZone {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  zoneType: string;
  referenceId?: string; // links back to a specific route stop
}

export interface TrackingSessionProps extends Record<string, unknown> {
  referenceType: string;
  referenceId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  zones: GeofenceZone[];
  points: TrackingPoint[];
  lastPingAt?: Date;
  lastLatitude?: number;
  lastLongitude?: number;
}

export class TrackingSession extends AggregateRoot<TrackingSessionProps> {
  private constructor(props: TrackingSessionProps, id: string, tenantId: string) {
    super(props, id, tenantId);
  }

  public static create(
    referenceType: string,
    referenceId: string,
    id: string,
    tenantId: string,
    zones: GeofenceZone[] = []
  ): Result<TrackingSession> {
    if (!referenceType || !referenceId) {
      return Result.fail<TrackingSession>('referenceType and referenceId are required.');
    }

    return Result.ok(new TrackingSession({
      referenceType,
      referenceId,
      status: 'ACTIVE',
      zones,
      points: []
    }, id, tenantId));
  }

  public static restore(props: TrackingSessionProps, id: string, tenantId: string): TrackingSession {
    return new TrackingSession(props, id, tenantId);
  }

  public get referenceType(): string { return this.props.referenceType; }
  public get referenceId(): string { return this.props.referenceId; }
  public get status(): string { return this.props.status; }
  public get zones(): GeofenceZone[] { return [...this.props.zones]; }
  
  public get latestPoints(): TrackingPoint[] { 
    // Return only the newly added points that haven't been saved yet if we were tracking them,
    // but typically the aggregate holds the state. For now, returning all loaded points.
    return [...this.props.points]; 
  }

  /**
   * Records a GPS ping, applies debounce rules, and evaluates geofences.
   * Emits Domain Events directly returning them.
   */
  public recordPing(
    latitude: number,
    longitude: number,
    recordedAt: Date,
    accuracy?: number
  ): Result<TrackingEvent[]> {
    if (this.props.status !== 'ACTIVE') {
      return Result.fail<TrackingEvent[]>('Cannot record ping on inactive tracking session.');
    }

    // 1. Debounce Logic: skip if same coords within 60s
    if (this.props.lastPingAt && this.props.lastLatitude && this.props.lastLongitude) {
      const distM = this.calculateHaversineDistance(
        latitude, longitude,
        this.props.lastLatitude, this.props.lastLongitude
      );
      const timeSinceMs = recordedAt.getTime() - this.props.lastPingAt.getTime();
      
      if (distM < 50 && timeSinceMs < 60_000) {
        return Result.ok([]); // Debounced, no events
      }
    }

    // Update aggregate state
    this.props.lastPingAt = recordedAt;
    this.props.lastLatitude = latitude;
    this.props.lastLongitude = longitude;

    const newPoint: TrackingPoint = { latitude, longitude, accuracy, recordedAt };
    this.props.points.push(newPoint);

    const events: TrackingEvent[] = [];

    events.push({
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'LocationUpdated',
      sessionId: this.id,
      latitude,
      longitude,
      accuracy,
      recordedAt
    } as LocationUpdated);

    // 2. Evaluate Geofences
    for (const zone of this.props.zones) {
      const dist = this.calculateHaversineDistance(latitude, longitude, zone.latitude, zone.longitude);
      
      // Basic rule: If within radius, trigger ENTER. 
      // Note: A full implementation would track state per zone to emit EXIT and prevent duplicate ENTERs.
      // For this refactoring, we emit GeofenceTriggered for any zone within range.
      if (dist <= zone.radiusMeters) {
        events.push({
          eventId: crypto.randomUUID(),
          timestamp: new Date(),
          type: 'GeofenceTriggered',
          sessionId: this.id,
          zoneId: zone.id,
          eventType: 'ENTER',
          latitude,
          longitude,
          recordedAt,
          referenceId: zone.referenceId
        } as GeofenceTriggered);
      }
    }

    return Result.ok(events);
  }

  public complete(): Result<void> {
    if (this.props.status !== 'ACTIVE') {
      return Result.fail<void>('Cannot complete an inactive session.');
    }
    this.props.status = 'COMPLETED';
    return Result.ok<void>();
  }

  // Pure domain calculation
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
