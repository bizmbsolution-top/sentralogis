import { PipelineContext, PipelineStage, PipelineStatus } from './PipelineModels';
import { CopilotMetrics, PerformanceMetrics } from '../metrics/PerformanceMetrics';

export class CopilotPipeline {
  private _stages: PipelineStage[] = [];

  register(stage: PipelineStage): this {
    this._stages.push(stage);
    return this;
  }

  async execute(context: PipelineContext): Promise<void> {
    const metrics = new PerformanceMetrics();
    metrics.start();

    for (const stage of this._stages) {
      const t0 = performance.now();
      try {
        const result = await stage.execute(context);
        const metricKey = `${stage.name}Ms` as keyof CopilotMetrics;
        metrics.record(metricKey, performance.now() - t0);

        if (result.status !== PipelineStatus.CONTINUE) {
          // If the pipeline needs to halt (e.g. requires clarification or blocked)
          // The stage is expected to have populated context.finalResponse appropriately.
          // We break the execution loop here.
          break;
        }
      } catch (err: any) {
        console.error(`Pipeline error at stage ${stage.name}:`, err);
        
        context.finalResponse = {
          type: 'text',
          content: 'An unexpected internal error occurred while processing your request.',
          metrics: metrics.finish(),
          enrichedContext: context.enrichedContext
        };
        break;
      }
    }

    if (context.finalResponse && !context.finalResponse.metrics) {
      context.finalResponse.metrics = metrics.finish();
    }
  }
}
