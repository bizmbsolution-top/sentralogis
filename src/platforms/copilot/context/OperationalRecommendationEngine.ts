import { OperationalSituation } from '../knowledge/OperationalSituation';
import { SituationCatalog } from '../knowledge/SituationCatalog';

export interface OperationalRecommendation {
  situationId: string;
  primaryAdvisory: string;
  actionableSteps: string[];
}

export class OperationalRecommendationEngine {
  
  /**
   * Generates deterministic recommendations based solely on the active Operational Situation.
   */
  static generateRecommendations(situation: OperationalSituation): OperationalRecommendation {
    
    if (situation.id === SituationCatalog.NOMINAL.id) {
      return {
        situationId: situation.id,
        primaryAdvisory: 'Operations are proceeding normally. No immediate intervention required.',
        actionableSteps: []
      };
    }

    return {
      situationId: situation.id,
      primaryAdvisory: `Detected Anomaly: ${situation.name}. ${situation.description}`,
      actionableSteps: situation.recommendedActions
    };
  }
}
