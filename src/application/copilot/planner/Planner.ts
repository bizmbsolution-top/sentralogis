import { ResolvedBusinessContext } from '../ResolvedBusinessContext';
import { PlanningContext } from './PlanningContext';
import { PlannerResult } from './PlannerResult';
import { ActionPlanner } from './ActionPlanner';
import { PlanValidator } from './PlanValidator';
import { Result } from '../../../shared/kernel/Result';

export class Planner {
  constructor(
    private readonly actionPlanner: ActionPlanner,
    private readonly planValidator: PlanValidator
  ) {}

  public async createPlan(businessContext: ResolvedBusinessContext): Promise<PlannerResult> {
    // 1. Create the Planning Context
    const planningContext: PlanningContext = {
      businessContext,
      stateCache: {}
    };

    // 2. Generate Base Plan from Intent Strategy
    const basePlanResult = this.actionPlanner.plan(planningContext);
    
    if (basePlanResult.isFailure) {
      return Result.fail(basePlanResult.error as string);
    }

    const plan = basePlanResult.getValue();

    // 3. Validate the assembled Plan
    this.planValidator.validate(plan);

    return Result.ok(plan);
  }
}
