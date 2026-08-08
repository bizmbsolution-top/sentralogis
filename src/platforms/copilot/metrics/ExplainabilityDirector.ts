import { ExplainabilityBuilder } from './ExplainabilityBuilder';
import { ExplainabilityData } from './ExplainabilityData';
import { ActionBridge } from '../execution/ActionBridge';
import { StructuralValidationResult } from '../validation/ValidationModels';
import { EnrichedOperationalContext } from '../engine/ContextEnricher';
import { SituationCatalog } from '../knowledge/SituationCatalog';
import { DecisionAdvisoryEngine } from '../policy/DecisionAdvisoryEngine';
import { EntityResolutionResult } from '../intelligence/entities/models';
import { OperationalContext } from '../context/OperationalContext';

export class ExplainabilityDirector {
  static assemble(
    intent: string,
    entities: EntityResolutionResult,
    validationResult: StructuralValidationResult,
    context: OperationalContext,
    enrichedContext?: EnrichedOperationalContext
  ): ExplainabilityData {
    const builder = ExplainabilityBuilder.create();
    
    // 1. Proposed Reason
    builder.setProposedReason(`You requested to ${intent.toLowerCase().replace(/_/g, ' ')}.`);
    
    // 2. Entities
    builder.setResolvedEntities(entities.toExplainability());
    
    // 3. Validation
    builder.setWhatWasChecked(validationResult.explainability.whatWasChecked);
    builder.setValidationsSucceeded(validationResult.succeededValidations);
    builder.addBlockingErrors(validationResult.blockingErrors);
    builder.addWarnings(validationResult.warnings);
    
    // 4. Context Fallbacks
    if (context.workspace.hasPinnedEntities()) {
      builder.addWarning(`I utilized the active context for missing entities.`);
    }

    // 5. Timeline / Enriched Context Insights
    if (enrichedContext && enrichedContext.situation.id !== SituationCatalog.NOMINAL.id) {
      builder.setOperationalReason(`Based on the active timeline, I detected: ${enrichedContext.situation.name}. ${enrichedContext.situation.description}`);
      builder.setInsight(enrichedContext.insight);
      builder.setAdvisory(DecisionAdvisoryEngine.generateAdvisory(intent, enrichedContext.insight));
    }

    // 6. Execution Confirmation
    const resolvedTypes = entities.resolved().map(e => e.entityType);
    builder.setConfirmationReason(ActionBridge.generateExplanation(intent, resolvedTypes));

    return builder.build();
  }
}
