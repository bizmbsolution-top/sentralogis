import { DecisionPolicyRegistry } from './DecisionPolicyRegistry';

export class AlternativeRecommendationEngine {
  
  static generate(intent: string): string[] {
    const policy = DecisionPolicyRegistry.getPolicy(intent);
    
    if (!policy) {
      return [];
    }

    return policy.alternativeActions;
  }
}
