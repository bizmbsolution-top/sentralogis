"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanValidator = void 0;
var PlanValidator = /** @class */ (function () {
    function PlanValidator() {
    }
    /**
     * Evaluates the given plan and determines if it is ready for execution.
     * Performs purely structural validation on the ExecutionPayload and Steps.
     */
    PlanValidator.prototype.validate = function (plan) {
        var isValid = true;
        // Check if the payload matches the intended validation state
        if (plan.validationStatus === 'FAIL') {
            isValid = false;
        }
        // Check Steps Validation Status
        for (var _i = 0, _a = plan.steps; _i < _a.length; _i++) {
            var step = _a[_i];
            if (step.validationStatus === 'FAIL' || step.readyState === 'BLOCKED') {
                isValid = false;
                break;
            }
        }
        plan.isReadyForExecution = isValid;
    };
    return PlanValidator;
}());
exports.PlanValidator = PlanValidator;
