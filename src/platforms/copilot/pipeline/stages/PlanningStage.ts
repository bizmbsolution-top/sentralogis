import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';
import { ActionBridge } from '../../execution/ActionBridge';

export class PlanningStage implements PipelineStage {
  readonly name = 'ExecutionPlanning';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    if (!context.resolvedIntentName) {
      return { status: PipelineStatus.TERMINATED, message: 'Missing intent for planning' };
    }

    context.riskLevel = ActionBridge.getRiskLevel(context.resolvedIntentName);
    context.requiredPermissions = ActionBridge.getRequiredPermissions(context.resolvedIntentName);

    return { status: PipelineStatus.CONTINUE };
  }
}
