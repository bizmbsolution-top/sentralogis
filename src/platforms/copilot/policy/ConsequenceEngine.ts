import { DecisionPolicyRegistry } from './DecisionPolicyRegistry';

export class ConsequenceEngine {
  
  static generateConsequences(intent: string): string[] {
    const policy = DecisionPolicyRegistry.getPolicy(intent);
    
    if (!policy) {
      return [];
    }

    return policy.possibleConsequences;
  }
}
