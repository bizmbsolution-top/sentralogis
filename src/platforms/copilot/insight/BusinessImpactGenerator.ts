import { SituationCatalog } from '../knowledge/SituationCatalog';
import { OperationalSituation } from '../knowledge/OperationalSituation';

export class BusinessImpactGenerator {
  
  static generate(situation: OperationalSituation): string[] {
    switch (situation.id) {
      case SituationCatalog.NOMINAL.id:
        return ['Optimal resource utilization.'];
      
      case SituationCatalog.MISSING_POD.id:
        return ['Invoicing delay.', 'Revenue recognition deferred.'];

      case SituationCatalog.WAITING_UNLOADING.id:
      case SituationCatalog.DRIVER_WAITING.id:
        return ['Driver idle cost accumulating.', 'Vehicle utilization reduced.', 'Potential demurrage exposure.'];

      case SituationCatalog.LATE_DEPARTURE.id:
        return ['Immediate delivery schedule compromised.', 'Potential penalty for late arrival.'];

      default:
        return ['No known business impact.'];
    }
  }
}
