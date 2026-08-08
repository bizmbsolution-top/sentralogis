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
exports.BaseSupabaseProvider = void 0;
var BaseSupabaseProvider = /** @class */ (function () {
    function BaseSupabaseProvider(supabase) {
        this.supabase = supabase;
    }
    BaseSupabaseProvider.prototype.lookup = function (searchTerm, tenantId) {
        return __awaiter(this, void 0, void 0, function () {
            var isUuid, query, orConditions, _a, data, error, e_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!searchTerm || searchTerm.trim() === '')
                            return [2 /*return*/, []];
                        isUuid = searchTerm.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
                        query = this.supabase.from(this.tableName).select('*, tenant_id').eq('tenant_id', tenantId);
                        if (isUuid) {
                            query = query.eq('id', searchTerm);
                        }
                        else {
                            orConditions = this.searchColumns
                                .filter(function (col) { return col !== 'id' && col !== 'tenant_id'; })
                                .map(function (col) { return "".concat(col, ".ilike.%").concat(searchTerm, "%"); })
                                .join(',');
                            if (orConditions) {
                                query = query.or(orConditions);
                            }
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, query.limit(10)];
                    case 2:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error) {
                            console.error("[".concat(this.constructor.name, "] Error searching ").concat(this.tableName, ":"), error);
                            return [2 /*return*/, []];
                        }
                        if (!data)
                            return [2 /*return*/, []];
                        return [2 /*return*/, data.map(function (row) { return _this.mapToCandidate(row, searchTerm); })];
                    case 3:
                        e_1 = _b.sent();
                        console.error("[".concat(this.constructor.name, "] Lookup exception:"), e_1);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return BaseSupabaseProvider;
}());
exports.BaseSupabaseProvider = BaseSupabaseProvider;
