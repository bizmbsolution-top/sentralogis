"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverLookupProvider = void 0;
var BaseSupabaseProvider_1 = require("./BaseSupabaseProvider");
var DriverLookupProvider = /** @class */ (function (_super) {
    __extends(DriverLookupProvider, _super);
    function DriverLookupProvider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DriverLookupProvider.prototype.supports = function (entityType) {
        return entityType === 'DRIVER';
    };
    Object.defineProperty(DriverLookupProvider.prototype, "tableName", {
        get: function () { return 'md_drivers'; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DriverLookupProvider.prototype, "entityType", {
        get: function () { return 'DRIVER'; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DriverLookupProvider.prototype, "searchColumns", {
        get: function () { return ['id', 'name', 'phone']; },
        enumerable: false,
        configurable: true
    });
    DriverLookupProvider.prototype.mapToCandidate = function (row, searchTerm) {
        var _a, _b;
        var display = row.name || row.phone || row.id;
        var confidenceScore = 0.5;
        var reason = 'fuzzy_match';
        var normalizedSearch = searchTerm.toLowerCase();
        if (row.id === searchTerm) {
            confidenceScore = 1.0;
            reason = 'exact_match_id';
        }
        else if (((_a = row.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === normalizedSearch) {
            confidenceScore = 1.0;
            reason = 'exact_match_name';
        }
        else if (row.phone === searchTerm) {
            confidenceScore = 1.0;
            reason = 'exact_match_phone';
        }
        else if ((_b = row.name) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(normalizedSearch)) {
            confidenceScore = 0.8;
            reason = 'partial_match_name';
        }
        return {
            id: row.id,
            display: display,
            type: this.entityType,
            confidenceScore: confidenceScore,
            tenantId: row.tenant_id,
            metadata: { reason: reason }
        };
    };
    return DriverLookupProvider;
}(BaseSupabaseProvider_1.BaseSupabaseProvider));
exports.DriverLookupProvider = DriverLookupProvider;
