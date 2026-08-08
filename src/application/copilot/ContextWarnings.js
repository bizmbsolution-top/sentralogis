"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextWarnings = void 0;
var ContextWarnings = /** @class */ (function () {
    function ContextWarnings() {
        this.warnings = [];
    }
    ContextWarnings.prototype.add = function (warning) {
        this.warnings.push(warning);
    };
    ContextWarnings.prototype.getAll = function () {
        return __spreadArray([], this.warnings, true);
    };
    ContextWarnings.prototype.hasWarnings = function () {
        return this.warnings.length > 0;
    };
    return ContextWarnings;
}());
exports.ContextWarnings = ContextWarnings;
