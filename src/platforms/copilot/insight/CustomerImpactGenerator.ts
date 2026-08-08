import { SituationCatalog } from '../knowledge/SituationCatalog';
import { OperationalSituation } from '../knowledge/OperationalSituation';

export class CustomerImpactGenerator {
  
  static generate(situation: OperationalSituation): string[] {
    switch (situation.id) {
      case SituationCatalog.NOMINAL.id:
        return ['Delivery proceeding as scheduled.'];
      
      case SituationCatalog.MISSING_POD.id:
        return ['Customer lacks digital proof of receipt.'];

      case SituationCatalog.WAITING_UNLOADING.id:
      case SituationCatalog.DRIVER_WAITING.id:
        return ['Possible warehouse congestion.', 'Customer resources tied up.'];

      case SituationCatalog.LATE_DEPARTURE.id:
        return ['Customer will experience delivery delay.', 'Customer should receive ETA update.'];

      default:
        return ['No known customer impact.'];
    }
  }
}
