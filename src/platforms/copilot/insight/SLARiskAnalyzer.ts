import { SituationCatalog } from '../knowledge/SituationCatalog';
import { OperationalSituation } from '../knowledge/OperationalSituation';

export class SLARiskAnalyzer {
  
  static calculateRisk(situation: OperationalSituation): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (situation.id) {
      case SituationCatalog.NOMINAL.id:
        return 'NONE';
      
      case SituationCatalog.MISSING_POD.id:
        return 'LOW'; // Administrative delay, actual delivery likely complete

      case SituationCatalog.WAITING_UNLOADING.id:
      case SituationCatalog.DRIVER_WAITING.id:
        return 'HIGH'; // Active waiting eats into detention free time SLA

      case SituationCatalog.LATE_DEPARTURE.id:
        return 'CRITICAL'; // Immediate threat to overall delivery SLA

      default:
        return 'NONE';
    }
  }
}
