import { DecisionPolicyRegistry } from './DecisionPolicyRegistry';
import { DecisionPolicyResult } from './DecisionPolicy';
import { OperationalInsight } from '../insight/OperationalInsight';

export class DecisionPolicyEvaluator {
  
  static evaluate(intent: string, insight: OperationalInsight): DecisionPolicyResult {
    const policy = DecisionPolicyRegistry.getPolicy(intent);
    
    if (!policy) {
      return { status: 'ALLOWED' };
    }

    const currentSituationId = insight.situation.id;

    const blocked = policy.blockedSituations.find(s => s.situationId === currentSituationId);
    if (blocked) {
      return {
        status: 'REJECTED',
        reason: blocked.reason,
        evidence: blocked.evidence
      };
    }

    const warning = policy.warningSituations.find(s => s.situationId === currentSituationId);
    if (warning) {
      return {
        status: 'WARNING',
        reason: warning.reason,
        evidence: warning.evidence
      };
    }

    return { status: 'ALLOWED' };
  }
}
