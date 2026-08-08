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
exports.HistoryManager = void 0;
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var HistoryManager = /** @class */ (function () {
    function HistoryManager(outputDir) {
        this.historyPath = path.join(outputDir, 'history', 'history.json');
        this.ensureDir(path.dirname(this.historyPath));
    }
    HistoryManager.prototype.append = function (record) {
        var history = [];
        if (fs.existsSync(this.historyPath)) {
            try {
                var data = fs.readFileSync(this.historyPath, 'utf8');
                history = JSON.parse(data);
            }
            catch (e) {
                console.warn('Failed to parse history.json, starting fresh.');
            }
        }
        history.push(record);
        fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
    };
    HistoryManager.prototype.ensureDir = function (dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    };
    return HistoryManager;
}());
exports.HistoryManager = HistoryManager;
