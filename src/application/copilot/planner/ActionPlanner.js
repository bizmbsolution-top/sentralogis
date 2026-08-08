"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionPlanner = void 0;
var Result_1 = require("../../../shared/kernel/Result");
var ActionPlanner = /** @class */ (function () {
    function ActionPlanner() {
        this.strategies = new Map();
    }
    ActionPlanner.prototype.registerStrategy = function (intentName, strategy) {
        this.strategies.set(intentName, strategy);
    };
    ActionPlanner.prototype.plan = function (context) {
        var intentName = context.businessContext.intent.intentName;
        var strategy = this.strategies.get(intentName);
        if (!strategy) {
            return Result_1.Result.fail("No ActionPlanner strategy registered for intent: ".concat(intentName));
        }
        return strategy.buildPlan(context);
    };
    return ActionPlanner;
}());
exports.ActionPlanner = ActionPlanner;
