import { OperationalInsight } from '../insight/OperationalInsight';
import { DecisionAdvisoryEngine } from '../policy/DecisionAdvisoryEngine';

export interface WhyNotExplanation {
  actionRejected: string;
  reason: string;
  evidence: string[];
}

export class WhyNotEngine {
  
  /**
   * Deterministically explains why a requested action is counter-productive
   * based on the current operational insight by querying the Policy Registry.
   */
  static evaluateRejection(requestedAction: string, insight: OperationalInsight): WhyNotExplanation | null {
    // Normalise requested action into intent. 
    // For MVP, we map strings explicitly, but in production IntentResolver handles this.
    let intent = '';
    const actionNorm = requestedAction.toLowerCase();
    if (actionNorm.includes('replace driver') || actionNorm.includes('reassign driver')) intent = 'REPLACE_DRIVER';
    if (actionNorm.includes('cancel job')) intent = 'CANCEL_JOB';

    if (!intent) return null;

    const advisory = DecisionAdvisoryEngine.generateAdvisory(intent, insight);

    if (advisory.status === 'REJECTED') {
      return {
        actionRejected: intent,
        reason: advisory.reason || 'Action violates operational policy.',
        evidence: advisory.evidence || []
      };
    }

    return null;
  }
}
