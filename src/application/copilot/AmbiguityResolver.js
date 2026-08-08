"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmbiguityResolver = void 0;
var AmbiguityResolver = /** @class */ (function () {
    function AmbiguityResolver() {
    }
    AmbiguityResolver.prototype.resolve = function (candidates, originalValue, entityType, tenantId) {
        if (!candidates || candidates.length === 0) {
            return {
                status: 'NOT_FOUND',
                candidates: [],
                originalValue: originalValue,
                entityType: entityType
            };
        }
        // Filter by tenantId strictly
        var tenantCandidates = candidates.filter(function (c) { return c.tenantId === tenantId; });
        if (tenantCandidates.length === 0) {
            // If there were candidates but none matched the tenant, it's a security/tenant mismatch
            return {
                status: 'PERMISSION_DENIED',
                candidates: [],
                originalValue: originalValue,
                entityType: entityType
            };
        }
        if (tenantCandidates.length === 1) {
            return {
                status: 'RESOLVED',
                candidates: tenantCandidates,
                resolvedEntity: tenantCandidates[0],
                originalValue: originalValue,
                entityType: entityType
            };
        }
        // Sort candidates by confidence score descending
        tenantCandidates.sort(function (a, b) { return b.confidenceScore - a.confidenceScore; });
        var highestScore = tenantCandidates[0].confidenceScore;
        var topCandidates = tenantCandidates.filter(function (c) { return c.confidenceScore === highestScore; });
        if (topCandidates.length === 1) {
            return {
                status: 'RESOLVED',
                candidates: tenantCandidates,
                resolvedEntity: topCandidates[0],
                originalValue: originalValue,
                entityType: entityType
            };
        }
        // Still ambiguous (multiple exact matches or multiple soft matches tied for top score)
        return {
            status: 'AMBIGUOUS',
            candidates: tenantCandidates,
            originalValue: originalValue,
            entityType: entityType
        };
    };
    return AmbiguityResolver;
}());
exports.AmbiguityResolver = AmbiguityResolver;
