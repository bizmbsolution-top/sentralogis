import { PlanningContext } from '../PlanningContext';
import { ExecutionPlan } from '../ExecutionPlan';
import { Result } from '../../../../shared/kernel/Result';

export interface IActionPlannerStrategy {
  buildPlan(context: PlanningContext): Result<ExecutionPlan>;
}
