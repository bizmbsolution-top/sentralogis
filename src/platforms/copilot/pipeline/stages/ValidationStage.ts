import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';
import { BusinessValidationBridge } from '../../validation/BusinessValidationBridge';

export class ValidationStage implements PipelineStage {
  readonly name = 'StructuralValidation';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    if (!context.resolvedIntentName || !context.resolvedEntities) {
      return { status: PipelineStatus.TERMINATED, message: 'Missing intent or entities for validation' };
    }

    context.validationResult = await BusinessValidationBridge.validatePreconditions(
      context.resolvedIntentName,
      context.resolvedEntities,
      context.context
    );

    if (!context.validationResult.valid) {
      context.finalResponse = {
        type: 'text',
        content: `Validation failed: ${context.validationResult.blockingErrors.join('. ')}`,
        metrics: {
          intentResolutionMs: 0,
          entityResolutionMs: 0,
          validationMs: 0,
          planningMs: 0,
          totalResponseMs: 0,
        },
        enrichedContext: context.enrichedContext
      };
      return { status: PipelineStatus.BLOCKED };
    }

    return { status: PipelineStatus.CONTINUE };
  }
}
