"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsParser = void 0;
var fs = __importStar(require("fs"));
var ERROR_REGEX = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/;
var ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
var TsParser = /** @class */ (function () {
    function TsParser() {
    }
    TsParser.prototype.parse = function (filePath) {
        if (!fs.existsSync(filePath)) {
            console.warn("[TsParser] Log file not found at ".concat(filePath, ", returning empty array."));
            return [];
        }
        var data = fs.readFileSync(filePath, 'utf8').replace(ANSI_REGEX, '');
        var lines = data.split('\n');
        var errors = [];
        var currentError = null;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            var trimmed = line.trim();
            if (!trimmed)
                continue;
            var match = trimmed.match(ERROR_REGEX);
            if (match) {
                if (currentError)
                    errors.push(currentError);
                currentError = {
                    file: match[1],
                    line: parseInt(match[2], 10),
                    column: parseInt(match[3], 10),
                    errorCode: match[4],
                    message: match[5],
                    severity: 'error',
                    category: 'Uncategorized',
                    priority: 4,
                };
            }
            else if (currentError) {
                currentError.message += ' ' + trimmed;
            }
        }
        if (currentError)
            errors.push(currentError);
        return this.categorize(errors);
    };
    TsParser.prototype.categorize = function (errors) {
        for (var _i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
            var err = errors_1[_i];
            var errorCode = err.errorCode, msg = err.message;
            if (errorCode === 'TS2307' || errorCode === 'TS2724' || msg.includes('Cannot find module')) {
                err.category = 'Missing imports';
                err.priority = 1;
                err.suggestedAction = 'Check import paths or npm install missing modules.';
            }
            else if (errorCode.startsWith('TS5')) {
                err.category = 'Build configuration';
                err.priority = 1;
                err.suggestedAction = 'Fix tsconfig.json options.';
            }
            else if (errorCode === 'TS17004' || errorCode === 'TS2607' || errorCode === 'TS2786') {
                err.category = 'React JSX';
                err.priority = 1;
            }
            else if (errorCode === 'TS2531' || errorCode === 'TS2532' || (errorCode === 'TS2339' && msg.includes('null'))) {
                err.category = 'Nullability';
                err.priority = 2;
                err.suggestedAction = 'Add optional chaining (?) or strict null checks.';
            }
            else if (errorCode === 'TS2304' || errorCode === 'TS2503' || (errorCode === 'TS2582' && !msg.includes('jest') && !msg.includes('describe') && !msg.includes('it'))) {
                err.category = 'Missing global types';
                err.priority = 2;
            }
            else if (errorCode === 'TS2344') {
                err.category = 'Generic constraints';
                err.priority = 3;
            }
            else if (['TS2322', 'TS2345', 'TS2353', 'TS2339', 'TS2769', 'TS7006', 'TS2367', 'TS2698'].includes(errorCode)) {
                err.category = msg.includes("does not exist on type 'never'") ? 'Inference' : 'Type mismatches';
                err.priority = 3;
            }
            else if (errorCode === 'TS2582' && (msg.includes('describe') || msg.includes('it') || msg.includes('jest'))) {
                err.category = 'Jest';
                err.priority = 4;
                err.suggestedAction = 'npm i --save-dev @types/jest';
            }
            else if (errorCode === 'TS6133') {
                err.category = 'Unused variables';
                err.priority = 4;
                err.severity = 'warning';
            }
            else {
                err.category = "Other (".concat(errorCode, ")");
                err.priority = 4;
            }
        }
        return errors;
    };
    return TsParser;
}());
exports.TsParser = TsParser;
