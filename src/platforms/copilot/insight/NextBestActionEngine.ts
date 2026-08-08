import { SituationCatalog } from '../knowledge/SituationCatalog';
import { OperationalSituation } from '../knowledge/OperationalSituation';

export class NextBestActionEngine {
  
  static generate(situation: OperationalSituation): string[] {
    switch (situation.id) {
      case SituationCatalog.NOMINAL.id:
        return ['Monitor Timeline'];
      
      case SituationCatalog.MISSING_POD.id:
        return ['Request POD via WhatsApp', 'Check driver connectivity'];

      case SituationCatalog.WAITING_UNLOADING.id:
      case SituationCatalog.DRIVER_WAITING.id:
        return ['Contact Customer Warehouse', 'Verify Warehouse Readiness', 'Escalate to Dispatcher'];

      case SituationCatalog.LATE_DEPARTURE.id:
        return ['Contact Driver Immediately', 'Verify Vehicle Status', 'Prepare Replacement Fleet'];

      default:
        return ['Review Operational Timeline'];
    }
  }

  static getRecommendedAttention(situation: OperationalSituation): string {
     switch (situation.id) {
       case SituationCatalog.NOMINAL.id:
         return 'System Monitoring';
       case SituationCatalog.MISSING_POD.id:
         return 'Driver Administration';
       case SituationCatalog.LATE_DEPARTURE.id:
         return 'Dispatcher Intervention';
       default:
         return 'Customer Service';
     }
  }
}
