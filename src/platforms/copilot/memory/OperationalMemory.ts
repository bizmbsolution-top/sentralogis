// Mock operational state for memory lookups.
// In a real system, this would query a Redis cache or real-time materialized views.
export class OperationalMemory {
  
  static getDelayedJobs(): string[] {
    return ['JO-999'];
  }

  static getWaitingPod(): string[] {
    return ['JO-888'];
  }

  static getPriorityWorkOrders(): string[] {
    return ['WO-777'];
  }

  static getTrucksInsideGeofence(locationId: string): string[] {
    if (locationId === 'LOC-1') return ['VEH-123', 'VEH-456'];
    return [];
  }
}
