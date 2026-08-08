import { SemanticIntentMatcher } from '../intelligence/SemanticIntentMatcher';
import { IntentKnowledgeRegistry } from '../intelligence/IntentKnowledgeRegistry';
import { CopilotTelemetry } from '../telemetry/CopilotTelemetry';
import { IntentConfidenceEngine } from '../intelligence/IntentConfidenceEngine';
import { UnknownIntentHandler } from '../intelligence/UnknownIntentHandler';
import { IntentAnalytics } from '../intelligence/IntentAnalytics';
import { EntityExtractionEngine } from '../intelligence/extraction/EntityExtractionEngine';
import { EntityResolutionResult } from '../intelligence/entities/models';
import { OperationalContext } from '../context/OperationalContext';
import { GeminiIntentAdapter } from '../intelligence/adapters/GeminiIntentAdapter';

export interface ExplainabilityData {
  advisory?: any;
  warnings?: string[];
}

export interface ResolvedIntent {
  intent: string;
  entities: EntityResolutionResult;
  confidence: number;
  reason?: string;
  suggestions?: string[];
  explainability?: ExplainabilityData;
}

import { PipelineContext } from '../pipeline/PipelineModels';

export class IntentResolver {
  
  static async resolve(pipelineContext: PipelineContext): Promise<ResolvedIntent> {
    const userInput = pipelineContext.userInput;
    const context = pipelineContext.context;
    try {
      const geminiResponse = await GeminiIntentAdapter.extractIntent(userInput);

      // Handle Gemini ambiguities directly via clarification
      if (geminiResponse.ambiguities.length > 0) {
        return {
          intent: 'UNKNOWN',
          entities: new EntityResolutionResult(),
          confidence: 0,
          suggestions: geminiResponse.suggestedClarification ? [geminiResponse.suggestedClarification] : geminiResponse.ambiguities,
          reason: geminiResponse.reasoning
        };
      }

      if (geminiResponse.intent !== 'UNKNOWN' && geminiResponse.confidence >= 0.5) {
        IntentAnalytics.recordResolution(geminiResponse.intent, geminiResponse.confidence);
        
        const map: any = {};
        for (const [key, value] of Object.entries(geminiResponse.entities)) {
          map[key] = {
            status: 'RESOLVED',
            entity: {
              entityType: key,
              resolvedId: value,
              displayName: value,
              confidence: 1.0,
              explanation: {
                matchMethod: 'LLM',
                evidence: `Extracted via Gemini Adapter`,
                source: 'USER_INPUT'
              }
            }
          };
        }
        
        // Enrich with Pinned Context for missing required entities based on Knowledge Registry
        const knowledge = IntentKnowledgeRegistry.get(geminiResponse.intent);
        if (knowledge) {
          const relevantEntities = [...knowledge.requiredEntities, ...knowledge.optionalEntities];
          for (const entityType of relevantEntities) {
            if (!map[entityType]) {
              const pinnedEntity = context.workspace.active(entityType);
              if (pinnedEntity) {
                map[entityType] = {
                  status: 'RESOLVED',
                  entity: {
                    entityType,
                    resolvedId: pinnedEntity,
                    displayName: pinnedEntity,
                    confidence: 1.0,
                    explanation: {
                      matchMethod: 'HISTORY',
                      source: 'PINNED_CONTEXT',
                      evidence: 'Retrieved from active context'
                    }
                  }
                };
              }
            }
          }
        }
        
        return {
          intent: geminiResponse.intent,
          entities: new EntityResolutionResult(map),
          confidence: geminiResponse.confidence,
          reason: geminiResponse.reasoning
        };
      }
    } catch (err: any) {
      CopilotTelemetry.record(pipelineContext, {
        eventType: 'FALLBACK_TRIGGERED',
        payload: {
          reason: err.message || String(err),
          stage: 'IntentResolution'
        }
      });
    }

    // Fallback strategy: if Gemini fails or returns UNKNOWN with low confidence, use legacy semantic matcher
    const candidates = SemanticIntentMatcher.match(userInput);
    
    if (candidates.length === 0) {
      return this.handleUnknown(candidates);
    }

    const topCandidate = candidates[0];

    // Evaluate confidence against baseline
    if (!IntentConfidenceEngine.evaluate(topCandidate)) {
      return this.handleUnknown(candidates);
    }

    IntentAnalytics.recordResolution(topCandidate.intentId, topCandidate.confidence);

    // Dynamic extraction based on registered intent requirements
    const entities = await EntityExtractionEngine.extract(topCandidate.intentId, userInput, context);

    return {
      intent: topCandidate.intentId,
      entities,
      confidence: topCandidate.confidence
    };
  }

  private static handleUnknown(candidates: any[]): ResolvedIntent {
    IntentAnalytics.recordResolution('UNKNOWN', 0);
    return UnknownIntentHandler.handle(candidates);
  }
}
