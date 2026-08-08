import { SemanticMatchResult } from './SemanticIntentMatcher';
import { IntentKnowledgeRegistry } from './IntentKnowledgeRegistry';

import { EntityResolutionResult } from './entities/models';

export interface UnknownIntentResponse {
  intent: 'UNKNOWN';
  entities: EntityResolutionResult;
  confidence: number;
  reason: string;
  suggestions: string[];
}

export class UnknownIntentHandler {
  
  static handle(candidates: SemanticMatchResult[]): UnknownIntentResponse {
    const topCandidates = candidates
      .slice(0, 3)
      .map(c => IntentKnowledgeRegistry.get(c.intentId)?.displayName || c.intentId);

    return {
      intent: 'UNKNOWN',
      entities: new EntityResolutionResult(),
      confidence: 0,
      reason: 'Confidence score fell below required thresholds for all known intents.',
      suggestions: topCandidates
    };
  }
}
