import { DecisionPolicyEvaluator } from './DecisionPolicyEvaluator';
import { AlternativeRecommendationEngine } from './AlternativeRecommendationEngine';
import { ConsequenceEngine } from './ConsequenceEngine';
import { OperationalInsight } from '../insight/OperationalInsight';
import { DecisionPolicyRegistry } from './DecisionPolicyRegistry';

export interface DecisionAdvisoryOutput {
  status: 'ALLOWED' | 'WARNING' | 'REJECTED';
  reason?: string;
  evidence?: string[];
  alternativeActions: string[];
  expectedBenefits: string[];
  possibleConsequences: string[];
}

export class DecisionAdvisoryEngine {
  
  static generateAdvisory(intent: string, insight?: OperationalInsight): DecisionAdvisoryOutput {
    if (!insight) {
       return {
          status: 'ALLOWED',
          alternativeActions: [],
          expectedBenefits: [],
          possibleConsequences: []
       };
    }

    const evaluation = DecisionPolicyEvaluator.evaluate(intent, insight);
    const policy = DecisionPolicyRegistry.getPolicy(intent);

    let alternatives: string[] = [];
    let benefits: string[] = [];
    let consequences: string[] = [];

    // Only populate alternatives and consequences if it's rejected or a warning
    if (evaluation.status !== 'ALLOWED' && policy) {
       alternatives = AlternativeRecommendationEngine.generate(intent);
       consequences = ConsequenceEngine.generateConsequences(intent);
       benefits = policy.expectedBenefits;
    }

    return {
      status: evaluation.status,
      reason: evaluation.reason,
      evidence: evaluation.evidence,
      alternativeActions: alternatives,
      expectedBenefits: benefits,
      possibleConsequences: consequences
    };
  }
}
