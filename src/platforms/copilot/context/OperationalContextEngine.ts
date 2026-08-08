import { OperationalSituation } from '../knowledge/OperationalSituation';
import { SituationCatalog } from '../knowledge/SituationCatalog';

// Mock types for the engine
interface TimelineEvent {
  status: string;
  timestamp: number;
  hasPod: boolean;
}

export class OperationalContextEngine {
  
  /**
   * Deterministically interprets operational data into an OperationalSituation.
   */
  static evaluateSituation(events: TimelineEvent[], currentTime: number = Date.now()): OperationalSituation {
    
    if (!events || events.length === 0) {
      return SituationCatalog.NOMINAL;
    }

    const latestEvent = events[events.length - 1];
    const timeSinceLastEventMs = currentTime - latestEvent.timestamp;
    const hoursSinceLastEvent = timeSinceLastEventMs / (1000 * 60 * 60);

    // Rule 1: Arrived at destination, waiting too long, no POD
    if (latestEvent.status === 'ARRIVED' && !latestEvent.hasPod && hoursSinceLastEvent >= 4) {
      return SituationCatalog.WAITING_UNLOADING;
    }

    // Rule 2: Assigned, but no departure after a long time
    if (latestEvent.status === 'ASSIGNED' && hoursSinceLastEvent >= 2) {
      return SituationCatalog.LATE_DEPARTURE;
    }

    // Rule 3: Arrived, moderate time, no POD
    if (latestEvent.status === 'ARRIVED' && !latestEvent.hasPod && hoursSinceLastEvent > 1 && hoursSinceLastEvent < 4) {
      return SituationCatalog.MISSING_POD;
    }

    return SituationCatalog.NOMINAL;
  }
}
