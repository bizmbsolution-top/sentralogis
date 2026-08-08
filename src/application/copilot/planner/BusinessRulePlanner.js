"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRulePlanner = void 0;
var BusinessRulePlanner = /** @class */ (function () {
    function BusinessRulePlanner() {
    }
    /**
     * Applies domain-specific read-only rules to generate preconditions.
     * Note: This does not execute logic, it just validates states.
     */
    BusinessRulePlanner.prototype.evaluateRules = function (context, action) {
        var _a;
        var preconditions = [];
        // Example logic for generic rules (this could also be delegated to strategies)
        if (action === 'ASSIGN_DRIVER') {
            var driver = context.businessContext.resolvedEntities['DRIVER'];
            if (driver) {
                // In a real scenario, stateCache would hold whether the driver is active.
                // We'll mock a generic condition evaluation here.
                var isActive = ((_a = context.stateCache[driver.id]) === null || _a === void 0 ? void 0 : _a.isActive) !== false;
                preconditions.push({
                    name: 'Driver is Active',
                    description: 'The driver must be active to be assigned.',
                    isMet: isActive,
                    failureReason: isActive ? undefined : 'Driver account is inactive or suspended.'
                });
            }
        }
        return preconditions;
    };
    return BusinessRulePlanner;
}());
exports.BusinessRulePlanner = BusinessRulePlanner;
