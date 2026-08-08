"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ActionPlanner_1 = require("./src/application/copilot/planner/ActionPlanner");
var PlanValidator_1 = require("./src/application/copilot/planner/PlanValidator");
var Planner_1 = require("./src/application/copilot/planner/Planner");
var AssignDriverPlannerStrategy_1 = require("./src/application/copilot/planner/strategies/AssignDriverPlannerStrategy");
function assert(condition, message) {
    if (!condition)
        throw new Error("FAIL: ".concat(message));
    console.log("  \u2713 ".concat(message));
}
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var actionPlanner, planValidator, planner, createMockContext, context, result, plan, payload, meta, context, result, plan, meta;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Planner Layer Tests (Strict Orchestration)');
                    console.log('─────────────────────────');
                    actionPlanner = new ActionPlanner_1.ActionPlanner();
                    actionPlanner.registerStrategy('ASSIGN_DRIVER', new AssignDriverPlannerStrategy_1.AssignDriverPlannerStrategy());
                    planValidator = new PlanValidator_1.PlanValidator();
                    planner = new Planner_1.Planner(actionPlanner, planValidator);
                    createMockContext = function (resolvedEntities) { return ({
                        intent: { intentName: 'ASSIGN_DRIVER', parameters: {}, entities: [] },
                        confidence: 1.0,
                        tenantId: 'tenant-123',
                        userId: 'user-1',
                        resolvedEntities: resolvedEntities,
                        warnings: [],
                        requiresConfirmation: false,
                        executionPayload: {}
                    }); };
                    console.log('\n1. Successful Planning (All Entities Resolved)');
                    context = createMockContext({
                        'DRIVER': { type: 'DRIVER', id: 'driver-1' },
                        'JOB_ORDER': { type: 'JOB_ORDER', id: 'jo-1' },
                        'VEHICLE': { type: 'VEHICLE', id: 'veh-1' }
                    });
                    return [4 /*yield*/, planner.createPlan(context)];
                case 1:
                    result = _a.sent();
                    assert(result.isSuccess, 'Plan created successfully');
                    plan = result.getValue();
                    assert(plan.intent === 'ASSIGN_DRIVER', 'Intent is correct');
                    assert(plan.isReadyForExecution === true, 'Plan is structurally ready for execution');
                    assert(plan.riskLevel === 'LOW', 'Risk level is LOW');
                    payload = plan.executionPayload;
                    assert(payload.driverId === 'driver-1', 'Payload driverId is correct');
                    assert(payload.jobOrderId === 'jo-1', 'Payload jobOrderId is correct');
                    assert(payload.vehicleId === 'veh-1', 'Payload vehicleId is correct');
                    meta = plan.explainabilityMetadata;
                    assert(meta.whyProposed === 'The user requested to assign a driver to a specific job order.', 'Explainability whyProposed is present');
                    assert(meta.resolvedEntities.length === 3, 'Explainability resolvedEntities length is 3');
                    console.log('\n2. Incomplete Plan (Missing Vehicle)');
                    context = createMockContext({
                        'DRIVER': { type: 'DRIVER', id: 'driver-1' },
                        'JOB_ORDER': { type: 'JOB_ORDER', id: 'jo-1' }
                        // Missing VEHICLE
                    });
                    return [4 /*yield*/, planner.createPlan(context)];
                case 2:
                    result = _a.sent();
                    assert(result.isSuccess, 'Plan created successfully (returns a Plan object)');
                    plan = result.getValue();
                    assert(plan.validationStatus === 'FAIL', 'Structural validation fails at strategy level');
                    assert(plan.isReadyForExecution === false, 'Plan is NOT ready for execution');
                    meta = plan.explainabilityMetadata;
                    assert(meta.resolvedEntities.length === 2, 'Explainability resolvedEntities length is 2');
                    assert(meta.validationsSucceeded.length === 0, 'No structural validations succeeded');
                    console.log('\n─────────────────────────');
                    console.log('All Planner tests passed.');
                    return [2 /*return*/];
            }
        });
    });
}
runTests().catch(function (err) {
    console.error('Test suite failed:', err.message);
    process.exit(1);
});
