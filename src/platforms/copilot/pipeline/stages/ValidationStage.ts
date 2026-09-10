import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';
import { StructuralValidationResult } from '../../validation/ValidationModels';

export class ValidationStage implements PipelineStage {
  readonly name = 'StructuralValidation';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    if (!context.resolvedIntentName || !context.resolvedEntities) {
      return { status: PipelineStatus.TERMINATED, message: 'Missing intent or entities for validation' };
    }

    if (process.env.NODE_ENV !== 'production') {
      const { BusinessValidationBridge } = await import('../../validation/BusinessValidationBridge');
      context.validationResult = await BusinessValidationBridge.validatePreconditions(
        context.resolvedIntentName,
        context.resolvedEntities,
        context.context,
      );
    } else {
      context.validationResult = {
        valid: true,
        confidenceScore: 1.0,
        blockingErrors: [],
        warnings: [],
        succeededValidations: ['Production validation deferred to EXECUTE boundary'],
        explainability: { whatWasChecked: ['EXECUTE boundary authorization (ExecutionService + domain assertPermission)'] },
      } as StructuralValidationResult;
    }

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
