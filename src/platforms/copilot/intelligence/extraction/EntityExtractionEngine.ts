import { EntityExtractionRegistry } from './EntityExtractionRegistry';
import { IntentKnowledgeRegistry } from '../IntentKnowledgeRegistry';
import { EntityResolutionResult, RawEntityResolutionMap } from '../entities/models';
import { EntityAnalytics } from './EntityAnalytics';
import { OperationalContext } from '../../context/OperationalContext';

export class EntityExtractionEngine {
  
  static async extract(intentId: string, userInput: string, context: OperationalContext): Promise<EntityResolutionResult> {
    const knowledge = IntentKnowledgeRegistry.get(intentId);
    if (!knowledge) return new EntityResolutionResult();

    const extracted: RawEntityResolutionMap = {};

    // Only attempt to extract entities that are relevant to this intent
    const relevantEntities = [...knowledge.requiredEntities, ...knowledge.optionalEntities];
    
    for (const entityType of relevantEntities) {
      const strategy = EntityExtractionRegistry.get(entityType);
      if (strategy) {
        let resolution = await strategy.extract(userInput, context);
        
        // Fallback to operational context memory if not explicitly provided
        const pinnedEntity = context.workspace.active(entityType);
        if (resolution.status === 'UNKNOWN' && pinnedEntity) {
            resolution = {
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

        extracted[entityType] = resolution;
        
        // Track analytics
        EntityAnalytics.recordExtraction(entityType, resolution);
      }
    }

    return new EntityResolutionResult(extracted);
  }
}
