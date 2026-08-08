import { ExecutionPlan } from './ExecutionPlan';

export class PlanValidator {
  /**
   * Evaluates the given plan and determines if it is ready for execution.
   * Performs purely structural validation on the ExecutionPayload and Steps.
   */
  public validate(plan: ExecutionPlan): void {
    let isValid = true;
    
    // Check if the payload matches the intended validation state
    if (plan.validationStatus === 'FAIL') {
      isValid = false;
    }

    // Check Steps Validation Status
    for (const step of plan.steps) {
      if (step.validationStatus === 'FAIL' || step.readyState === 'BLOCKED') {
        isValid = false;
        break;
      }
    }

    plan.isReadyForExecution = isValid;
  }
}
