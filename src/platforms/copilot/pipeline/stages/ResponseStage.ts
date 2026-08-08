import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';

export class ResponseStage implements PipelineStage {
  readonly name = 'ResponseConstruction';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    if (context.finalResponse) {
      // If a previous stage already set the final response (e.g. clarification, validation error), we just pass it through
      return { status: PipelineStatus.CONTINUE };
    }

    if (!context.resolvedIntentName || !context.resolvedEntities || !context.validationResult || !context.explainabilityData) {
      return { status: PipelineStatus.TERMINATED, message: 'Missing state to build final response' };
    }

    context.finalResponse = {
      type: 'action_proposal',
      proposal: {
        intent: context.resolvedIntentName,
        entities: context.resolvedEntities,
        riskLevel: context.riskLevel,
        confidence: context.validationResult.confidenceScore,
        requiredPermission: context.requiredPermissions?.join(', ') || '',
        explainability: context.explainabilityData,
        warnings: context.explainabilityData.warnings
      },
      metrics: { totalMs: 0 },
      enrichedContext: context.enrichedContext
    };

    return { status: PipelineStatus.SUCCESS };
  }
}
