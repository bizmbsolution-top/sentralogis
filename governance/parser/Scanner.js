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
exports.CodeScanner = void 0;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var CodeScanner = /** @class */ (function () {
    function CodeScanner() {
        this.metrics = {
            totalFiles: 0,
            totalLines: 0,
            todoCount: 0,
            fixmeCount: 0,
            hackCount: 0,
            deprecatedApiCount: 0,
            deepNestingCount: 0,
            longFunctionsCount: 0,
            largeFilesCount: 0,
            circularDependencies: 0,
            layerViolations: 0,
            anyUsage: 0,
            nullAssertions: 0,
            duplicatedCodeCount: 0,
            complexModulesCount: 0,
        };
    }
    CodeScanner.prototype.scanRepository = function (rootDir) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.walkDir(rootDir);
                return [2 /*return*/, this.metrics];
            });
        });
    };
    CodeScanner.prototype.walkDir = function (dir) {
        var files = fs.readdirSync(dir);
        for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
            var file = files_1[_i];
            if (['node_modules', '.git', '.next', 'dist', 'governance'].includes(file))
                continue;
            var fullPath = path.join(dir, file);
            var stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                this.walkDir(fullPath);
            }
            else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                this.scanFile(fullPath);
            }
        }
    };
    CodeScanner.prototype.scanFile = function (filePath) {
        this.metrics.totalFiles++;
        var content = fs.readFileSync(filePath, 'utf8');
        var lines = content.split('\n');
        this.metrics.totalLines += lines.length;
        if (lines.length > 500)
            this.metrics.largeFilesCount++;
        var functionLength = 0;
        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
            var line = lines_1[_i];
            if (line.includes('TODO'))
                this.metrics.todoCount++;
            if (line.includes('FIXME'))
                this.metrics.fixmeCount++;
            if (line.includes('HACK'))
                this.metrics.hackCount++;
            if (line.includes('@deprecated'))
                this.metrics.deprecatedApiCount++;
            if (line.includes(': any') || line.includes('<any>'))
                this.metrics.anyUsage++;
            if (line.includes('!.') || line.match(/\w+!/))
                this.metrics.nullAssertions++;
            // Deep nesting heuristic (> 4 tabs/spaces)
            if (line.match(/^ {16,}\S/) || line.match(/^\t{4,}\S/)) {
                this.metrics.deepNestingCount++;
            }
            // Long function heuristic
            if (line.includes('function ') || line.includes('=> {')) {
                functionLength = 1;
            }
            else if (functionLength > 0) {
                functionLength++;
                if (functionLength > 100) {
                    this.metrics.longFunctionsCount++;
                    functionLength = 0;
                }
            }
            if (line.trim() === '}')
                functionLength = 0;
            // Architecture Violation heuristic
            if (filePath.includes('domain') && line.includes('import ') && (line.includes('components') || line.includes('ui'))) {
                this.metrics.layerViolations++;
            }
        }
    };
    return CodeScanner;
}());
exports.CodeScanner = CodeScanner;
