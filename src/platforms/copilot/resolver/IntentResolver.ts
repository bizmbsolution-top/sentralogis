import { SemanticIntentMatcher } from '../intelligence/SemanticIntentMatcher';
import { IntentKnowledgeRegistry } from '../intelligence/IntentKnowledgeRegistry';
import { CopilotTelemetry } from '../telemetry/CopilotTelemetry';
import { IntentConfidenceEngine } from '../intelligence/IntentConfidenceEngine';
import { UnknownIntentHandler } from '../intelligence/UnknownIntentHandler';
import { IntentAnalytics } from '../intelligence/IntentAnalytics';
import { EntityExtractionEngine } from '../intelligence/extraction/EntityExtractionEngine';
import { EntityResolutionResult } from '../intelligence/entities/models';
import { OperationalContext } from '../context/OperationalContext';

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

import { PipelineContext, CopilotResolutionMetadata } from '../pipeline/PipelineModels';
import { OpenAIIntentAdapter, OpenAIAdapterError } from '../intelligence/adapters/OpenAIIntentAdapter';

export class IntentResolver {
  
  static async resolve(pipelineContext: PipelineContext): Promise<ResolvedIntent> {
    const userInput = pipelineContext.userInput;
    const context = pipelineContext.context;

    try {
      const openAiResponse = await OpenAIIntentAdapter.extractIntent(userInput);

      // Successful OpenAI response => AI is AVAILABLE
      pipelineContext.resolutionMetadata = {
        aiStatus: 'AVAILABLE',
        resolutionSource: 'OPENAI'
      };

      // Handle OpenAI ambiguities directly via clarification
      if (openAiResponse.ambiguities.length > 0) {
        return {
          intent: 'UNKNOWN',
          entities: new EntityResolutionResult(),
          confidence: 0,
          suggestions: openAiResponse.suggestedClarification ? [openAiResponse.suggestedClarification] : openAiResponse.ambiguities,
          reason: openAiResponse.reasoning
        };
      }

      if (openAiResponse.intent !== 'UNKNOWN' && openAiResponse.confidence >= 0.5) {
        IntentAnalytics.recordResolution(openAiResponse.intent, openAiResponse.confidence);
        
        const map: any = {};
        for (const [key, value] of Object.entries(openAiResponse.entities)) {
          map[key] = {
            status: 'RESOLVED',
            entity: {
              entityType: key,
              resolvedId: value,
              displayName: value,
              confidence: 1.0,
              explanation: {
                matchMethod: 'LLM',
                evidence: `Extracted via OpenAI Adapter`,
                source: 'USER_INPUT'
              }
            }
          };
        }
        
        // Enrich with Pinned Context for missing required entities based on Knowledge Registry
        const knowledge = IntentKnowledgeRegistry.get(openAiResponse.intent);
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
          intent: openAiResponse.intent,
          entities: new EntityResolutionResult(map),
          confidence: openAiResponse.confidence,
          reason: openAiResponse.reasoning
        };
      }

      // Valid OpenAI response returned UNKNOWN or low confidence
      // MUST result in: AVAILABLE + UNKNOWN + OPENAI (do NOT invoke fallback)
      return {
        intent: 'UNKNOWN',
        entities: new EntityResolutionResult(),
        confidence: openAiResponse.confidence || 0,
        reason: openAiResponse.reasoning || 'OpenAI returned UNKNOWN intent',
        suggestions: openAiResponse.suggestedClarification ? [openAiResponse.suggestedClarification] : []
      };

    } catch (err: any) {
      const failureClass = err instanceof OpenAIAdapterError ? err.failureClass : 'UPSTREAM_FAILURE';
      const aiStatus: 'UNAVAILABLE' | 'DEGRADED' =
        err instanceof OpenAIAdapterError && (err.aiStatus === 'DEGRADED' || err.aiStatus === 'UNAVAILABLE')
          ? err.aiStatus
          : 'UNAVAILABLE';

      pipelineContext.resolutionMetadata = {
        aiStatus,
        resolutionSource: 'NONE', // will become DETERMINISTIC_FALLBACK if fallback matches
        failureClass
      };

      CopilotTelemetry.record(pipelineContext, {
        eventType: 'FALLBACK_TRIGGERED',
        payload: {
          reason: err.message || String(err),
          stage: 'IntentResolution'
        }
      });

      CopilotTelemetry.record(pipelineContext, {
        eventType: 'AI_DEGRADED_OR_UNAVAILABLE',
        payload: {
          aiStatus,
          failureClass,
          reason: err.message || String(err)
        }
      });
    }

    // Fallback strategy: if OpenAI failed, use deterministic semantic matcher
    const candidates = SemanticIntentMatcher.match(userInput);
    
    if (candidates.length === 0) {
      return this.handleUnknown(candidates);
    }

    const topCandidate = candidates[0];

    // Evaluate confidence against baseline
    if (!IntentConfidenceEngine.evaluate(topCandidate)) {
      return this.handleUnknown(candidates);
    }

    // Fallback matched successfully
    if (pipelineContext.resolutionMetadata) {
      pipelineContext.resolutionMetadata.resolutionSource = 'DETERMINISTIC_FALLBACK';
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
