"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignDriverPlannerStrategy = void 0;
var Result_1 = require("../../../../shared/kernel/Result");
var AssignDriverPlannerStrategy = /** @class */ (function () {
    function AssignDriverPlannerStrategy() {
    }
    AssignDriverPlannerStrategy.prototype.buildPlan = function (context) {
        var resolvedEntities = context.businessContext.resolvedEntities;
        var findEntity = function (type) {
            return Object.values(resolvedEntities).find(function (e) { return e.type === type; });
        };
        var driver = findEntity('DRIVER');
        var jobOrder = findEntity('JOB_ORDER');
        var vehicle = findEntity('VEHICLE');
        // Structural Validation
        var isComplete = !!driver && !!jobOrder && !!vehicle;
        var validationStatus = isComplete ? 'PASS' : 'FAIL';
        var relatedEntities = {};
        var resolvedIds = [];
        if (driver) {
            relatedEntities['DRIVER'] = { type: 'DRIVER', id: driver.id };
            resolvedIds.push("DRIVER: ".concat(driver.id));
        }
        if (jobOrder) {
            relatedEntities['JOB_ORDER'] = { type: 'JOB_ORDER', id: jobOrder.id };
            resolvedIds.push("JOB_ORDER: ".concat(jobOrder.id));
        }
        if (vehicle) {
            relatedEntities['VEHICLE'] = { type: 'VEHICLE', id: vehicle.id };
            resolvedIds.push("VEHICLE: ".concat(vehicle.id));
        }
        var steps = [
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
        var plan = {
            intent: 'ASSIGN_DRIVER',
            targetEntity: jobOrder ? { type: 'JOB_ORDER', id: jobOrder.id } : undefined,
            relatedEntities: relatedEntities,
            validationStatus: validationStatus,
            requiredPermissions: ['JobOrder.Update', 'Driver.View'],
            riskLevel: 'LOW',
            steps: steps,
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
        return Result_1.Result.ok(plan);
    };
    return AssignDriverPlannerStrategy;
}());
exports.AssignDriverPlannerStrategy = AssignDriverPlannerStrategy;
