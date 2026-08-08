import { IActionPlannerStrategy } from './IActionPlannerStrategy';
import { PlanningContext } from '../PlanningContext';
import { ExecutionPlan } from '../ExecutionPlan';
import { ExecutionStep } from '../ExecutionStep';
import { Result } from '../../../../shared/kernel/Result';

export class AssignDriverPlannerStrategy implements IActionPlannerStrategy {
  
  public buildPlan(context: PlanningContext): Result<ExecutionPlan> {
    const { resolvedEntities } = context.businessContext;

    const findEntity = (type: string) => {
      return Object.values(resolvedEntities).find(e => e.type === type);
    };

    const driver = findEntity('DRIVER');
    const jobOrder = findEntity('JOB_ORDER');
    const vehicle = findEntity('VEHICLE');

    // Structural Validation
    const isComplete = !!driver && !!jobOrder && !!vehicle;
    
    let validationStatus: 'PASS' | 'FAIL' | 'PENDING' = isComplete ? 'PASS' : 'FAIL';

    const relatedEntities: Record<string, { type: string, id: string }> = {};
    const resolvedIds: string[] = [];
    
    if (driver) {
      relatedEntities['DRIVER'] = { type: 'DRIVER', id: driver.id };
      resolvedIds.push(`DRIVER: ${driver.id}`);
    }
    if (jobOrder) {
      relatedEntities['JOB_ORDER'] = { type: 'JOB_ORDER', id: jobOrder.id };
      resolvedIds.push(`JOB_ORDER: ${jobOrder.id}`);
    }
    if (vehicle) {
      relatedEntities['VEHICLE'] = { type: 'VEHICLE', id: vehicle.id };
      resolvedIds.push(`VEHICLE: ${vehicle.id}`);
    }

    const steps: ExecutionStep[] = [
      {
        id: 'assign-action',
        name: 'Assign Driver to Job Order',
        description: 'Update Job Order aggregate with Driver and Vehicle ID.',
        requiredInputs: isComplete ? {
          driverId: driver.id,
          jobOrderId: jobOrder.id,
          vehicleId: vehicle.id
        } : {},
        dependencies: [],
        validationStatus: isComplete ? 'PASS' : 'FAIL',
        readyState: isComplete ? 'READY' : 'BLOCKED'
      }
    ];

    const plan: ExecutionPlan = {
      intent: 'ASSIGN_DRIVER',
      targetEntity: jobOrder ? { type: 'JOB_ORDER', id: jobOrder.id } : undefined,
      relatedEntities,
      validationStatus,
      requiredPermissions: ['JobOrder.Update', 'Driver.View'],
      riskLevel: 'LOW', 
      steps,
      confirmationRequirements: [],
      executionPayload: isComplete ? {
        driverId: driver.id,
        jobOrderId: jobOrder.id,
        vehicleId: vehicle.id
      } : {},
      explainabilityMetadata: {
        whyProposed: 'The user requested to assign a driver to a specific job order.',
        resolvedEntities: resolvedIds,
        permissionsRequired: ['JobOrder.Update', 'Driver.View'],
        validationsSucceeded: isComplete ? ['All required entities are resolved structurally.'] : [],
        whyConfirmationRequired: 'No explicit confirmation required for LOW risk assignment.'
      },
      isReadyForExecution: false // Populated by PlanValidator
    };

    return Result.ok(plan);
  }
}
