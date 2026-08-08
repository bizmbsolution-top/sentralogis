import { SemanticMatchResult } from './SemanticIntentMatcher';
import { IntentKnowledgeRegistry } from './IntentKnowledgeRegistry';

export class IntentConfidenceEngine {
  
  /**
   * Deterministically calculates final confidence using semantic match scores
   * and checking against the intent's baseline threshold.
   */
  static evaluate(match: SemanticMatchResult): boolean {
    const knowledge = IntentKnowledgeRegistry.get(match.intentId);
    if (!knowledge) return false;

    // Reject if below the configured baseline threshold
    if (match.confidence < knowledge.baseConfidenceThreshold) {
      return false;
    }

    return true;
  }
}
