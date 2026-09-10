import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';
import { ContextEnricher } from '../../engine/ContextEnricher';

export class ContextStage implements PipelineStage {
  readonly name = 'ContextEnrichment';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    const jobOrderEntity = context.resolvedEntities?.resolve('JobOrder');

    if (jobOrderEntity && jobOrderEntity.resolvedId && context.identity) {
      context.enrichedContext = await ContextEnricher.enrichFromDatabase(
        jobOrderEntity.resolvedId,
        context.identity,
      );
    }

    return { status: PipelineStatus.CONTINUE };
  }
}
