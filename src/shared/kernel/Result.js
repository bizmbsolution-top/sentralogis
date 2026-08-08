"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Result = void 0;
var Result = /** @class */ (function () {
    function Result(isSuccess, error, value) {
        if (isSuccess && error)
            throw new Error("InvalidOperation: A result cannot be successful and contain an error");
        if (!isSuccess && !error)
            throw new Error("InvalidOperation: A failing result needs to contain an error message");
        this.isSuccess = isSuccess;
        this.isFailure = !isSuccess;
        this.error = error || null;
        this._value = value || null;
    }
    Result.prototype.getValue = function () {
        if (!this.isSuccess)
            throw new Error("Can't get the value of an error result. Use 'error' instead");
        return this._value;
    };
    Result.ok = function (value) {
        return new Result(true, null, value);
    };
    Result.fail = function (error) {
        return new Result(false, error);
    };
    return Result;
}());
exports.Result = Result;
