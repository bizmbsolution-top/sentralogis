import { PlanningContext } from './PlanningContext';
import { ExecutionPlan } from './ExecutionPlan';
import { IActionPlannerStrategy } from './strategies/IActionPlannerStrategy';
import { Result } from '../../../shared/kernel/Result';

export class ActionPlanner {
  private strategies: Map<string, IActionPlannerStrategy> = new Map();

  public registerStrategy(intentName: string, strategy: IActionPlannerStrategy): void {
    this.strategies.set(intentName, strategy);
  }

  public plan(context: PlanningContext): Result<ExecutionPlan> {
    const intentName = context.businessContext.intent.intentName;
    const strategy = this.strategies.get(intentName);

    if (!strategy) {
      return Result.fail<ExecutionPlan>(`No ActionPlanner strategy registered for intent: ${intentName}`);
    }

    return strategy.buildPlan(context);
  }
}
