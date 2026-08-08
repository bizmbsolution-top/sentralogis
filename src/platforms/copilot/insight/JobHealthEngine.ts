import { SituationCatalog } from '../knowledge/SituationCatalog';
import { OperationalSituation } from '../knowledge/OperationalSituation';

export class JobHealthEngine {
  
  static calculateHealth(situation: OperationalSituation): 'HEALTHY' | 'ATTENTION' | 'DELAYED' | 'CRITICAL' {
    switch (situation.id) {
      case SituationCatalog.NOMINAL.id:
        return 'HEALTHY';
      
      case SituationCatalog.WAITING_UNLOADING.id:
      case SituationCatalog.DRIVER_WAITING.id:
        return 'DELAYED';
      
      case SituationCatalog.LATE_DEPARTURE.id:
        return 'CRITICAL';
      
      case SituationCatalog.MISSING_POD.id:
        return 'ATTENTION';
        
      default:
        return 'HEALTHY';
    }
  }
}
