import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';
import { ProposalService } from '@/lib/copilot/propose/proposal-service';

export class ResponseStage implements PipelineStage {
  readonly name = 'ResponseConstruction';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    if (context.finalResponse) {
      return { status: PipelineStatus.CONTINUE };
    }

    if (!context.resolvedIntentName || !context.resolvedEntities || !context.validationResult || !context.explainabilityData) {
      return { status: PipelineStatus.TERMINATED, message: 'Missing state to build final response' };
    }

    const proposal = await ProposalService.generateProposal(
      {
        intent: context.resolvedIntentName,
        description: `Copilot proposal for ${context.resolvedIntentName}`,
        entities: context.resolvedEntities.resolved().map((e) => ({
          entityType: e.entityType,
          entityId: e.resolvedId,
          displayName: e.displayName || e.resolvedId,
          status: null,
        })),
        context: {
          userId: context.context.user.getId(),
          tenantId: context.context.tenant.getId(),
          permissions: context.context.user.getPermissions(),
          correlationId: context.correlationId,
        },
      },
      context.resolvedEntities,
      context.enrichedContext,
    );

    context.finalResponse = {
      type: 'action_proposal',
      proposal,
      metrics: {
        intentResolutionMs: 0,
        entityResolutionMs: 0,
        validationMs: 0,
        planningMs: 0,
        totalResponseMs: 0,
      },
      enrichedContext: context.enrichedContext,
    };

    return { status: PipelineStatus.SUCCESS };
  }
}
