import { StructuralValidationResult } from '../validation/ValidationModels';
import { EnrichedOperationalContext } from '../engine/ContextEnricher';
import { EntityResolutionResult } from '../intelligence/entities/models';
import { OperationalContext } from '../context/OperationalContext';
import { ExplainabilityData } from './ExplainabilityData';
import { ExplainabilityDirector } from './ExplainabilityDirector';

export class ExplainabilityGenerator {
  
  static generate(
    intent: string,
    entities: EntityResolutionResult,
    validationResult: StructuralValidationResult,
    context: OperationalContext,
    enrichedContext?: EnrichedOperationalContext
  ): ExplainabilityData {
    return ExplainabilityDirector.assemble(
      intent,
      entities,
      validationResult,
      context,
      enrichedContext
    );
  }
}
