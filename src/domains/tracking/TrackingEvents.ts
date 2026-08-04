/**
 * Phase 3D Tracking Event Contract
 * These are the immutable business facts produced by the Tracking Platform.
 * Other domains (e.g., Trucking, Warehouse) subscribe to these events.
 */

export interface TrackingEvent {
  eventId: string;
  timestamp: Date;
}

export interface TrackingSessionStarted extends TrackingEvent {
  type: "TrackingSessionStarted";
  sessionId: string;
  referenceType: string; // e.g., 'JOB_ORDER'
  referenceId: string;
}

export interface LocationUpdated extends TrackingEvent {
  type: "LocationUpdated";
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  recordedAt: Date;
}

export interface GeofenceTriggered extends TrackingEvent {
  type: "GeofenceTriggered";
  sessionId: string;
  zoneId: string;
  eventType: "ENTER" | "EXIT";
  latitude: number;
  longitude: number;
  recordedAt: Date;
  referenceId?: string; // e.g., job_route_id for the Trucking domain to map the stop
}
