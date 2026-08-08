import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';
import { ExplainabilityGenerator } from '../../metrics/ExplainabilityGenerator';

export class ExplainabilityStage implements PipelineStage {
  readonly name = 'ExplainabilityGeneration';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    if (!context.resolvedIntentName || !context.resolvedEntities || !context.validationResult) {
      return { status: PipelineStatus.TERMINATED, message: 'Missing required state for explainability' };
    }

    context.explainabilityData = ExplainabilityGenerator.generate(
      context.resolvedIntentName,
      context.resolvedEntities,
      context.validationResult,
      context.context,
      context.enrichedContext
    );

    return { status: PipelineStatus.CONTINUE };
  }
}
