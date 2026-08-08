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
var BusinessContextEngine_1 = require("./src/application/copilot/BusinessContextEngine");
var EntityResolver_1 = require("./src/application/copilot/EntityResolver");
var EntityLookupService_1 = require("./src/application/copilot/EntityLookupService");
var AmbiguityResolver_1 = require("./src/application/copilot/AmbiguityResolver");
var DriverLookupProvider_1 = require("./src/application/copilot/providers/DriverLookupProvider");
function assert(condition, message) {
    if (!condition)
        throw new Error("FAIL: ".concat(message));
    console.log("  \u2713 ".concat(message));
}
var MockWarehouseProvider = /** @class */ (function () {
    function MockWarehouseProvider() {
    }
    MockWarehouseProvider.prototype.supports = function (entityType) {
        return entityType === 'WAREHOUSE';
    };
    MockWarehouseProvider.prototype.lookup = function (searchTerm, tenantId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (searchTerm === 'WH-1') {
                    return [2 /*return*/, [{
                                id: 'wh-uuid-1',
                                display: 'WH-1',
                                type: 'WAREHOUSE',
                                confidenceScore: 1.0,
                                tenantId: tenantId,
                                metadata: { reason: 'exact_match_code' }
                            }]];
                }
                return [2 /*return*/, []];
            });
        });
    };
    return MockWarehouseProvider;
}());
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var mockTenantId, mockContext, createIntent, mockData, mockError, mockSupabase, lookupService, ambiguityResolver, entityResolver, engine, intent, result, candidate, intent, result, intent, result, intent, result, intent, result, candidate;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('BusinessContextEngine Hardening Tests');
                    console.log('─────────────────────────');
                    mockTenantId = 'tenant-123';
                    mockContext = {
                        userId: 'user-1',
                        tenantId: mockTenantId,
                        role: 'ADMIN',
                        trace: { traceId: '1', spanId: '1' }
                    };
                    createIntent = function (type, value) { return ({
                        intentName: 'ASSIGN_DRIVER',
                        parameters: { action: 'assign' },
                        entities: [{ type: type, value: value }]
                    }); };
                    mockData = [];
                    mockError = null;
                    mockSupabase = {
                        from: function () { return mockSupabase; },
                        select: function () { return mockSupabase; },
                        eq: function () { return mockSupabase; },
                        or: function () { return mockSupabase; },
                        limit: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, ({ data: mockData, error: mockError })];
                        }); }); }
                    };
                    lookupService = new EntityLookupService_1.EntityLookupService();
                    lookupService.registerProvider(new DriverLookupProvider_1.DriverLookupProvider(mockSupabase));
                    lookupService.registerProvider(new MockWarehouseProvider()); // Extensibility test
                    ambiguityResolver = new AmbiguityResolver_1.AmbiguityResolver();
                    entityResolver = new EntityResolver_1.EntityResolver(lookupService, ambiguityResolver);
                    engine = new BusinessContextEngine_1.BusinessContextEngine(entityResolver);
                    console.log('\n1. Single Driver successfully resolved (Explainability)');
                    mockData = [{ id: 'uuid-1', name: 'Budi Santoso', tenant_id: mockTenantId }];
                    mockError = null;
                    intent = createIntent('DRIVER', 'Budi Santoso');
                    return [4 /*yield*/, engine.buildContext(intent, mockContext)];
                case 1:
                    result = _c.sent();
                    assert(result.isSuccess, 'resolved successfully');
                    candidate = result.getValue().resolvedEntities['DRIVER:Budi Santoso'];
                    assert(candidate.id === 'uuid-1', 'ID matches');
                    assert(((_a = candidate.metadata) === null || _a === void 0 ? void 0 : _a.reason) === 'exact_match_name', 'Explainability metadata is present');
                    console.log('\n2. Multiple Drivers (Ambiguous)');
                    mockData = [
                        { id: 'uuid-1', name: 'Budi Santoso', tenant_id: mockTenantId },
                        { id: 'uuid-2', name: 'Budi Hartono', tenant_id: mockTenantId }
                    ];
                    intent = createIntent('DRIVER', 'Budi');
                    return [4 /*yield*/, engine.buildContext(intent, mockContext)];
                case 2:
                    result = _c.sent();
                    assert(result.isFailure, 'failed as ambiguous');
                    assert(result.error.includes('Ambiguous'), 'error mentions Ambiguous');
                    console.log('\n3. Missing Driver');
                    mockData = [];
                    intent = createIntent('DRIVER', 'Unknown');
                    return [4 /*yield*/, engine.buildContext(intent, mockContext)];
                case 3:
                    result = _c.sent();
                    assert(result.isFailure, 'failed as missing');
                    assert(result.error.includes('Not Found'), 'error mentions Not Found');
                    console.log('\n4. Wrong Tenant');
                    mockData = [{ id: 'uuid-1', name: 'Budi', tenant_id: 'other-tenant' }];
                    intent = createIntent('DRIVER', 'Budi');
                    return [4 /*yield*/, engine.buildContext(intent, mockContext)];
                case 4:
                    result = _c.sent();
                    assert(result.isFailure, 'failed permission');
                    assert(result.error.includes('Permission Denied'), 'error mentions Permission Denied');
                    console.log('\n5. Generic Extensibility (Warehouse Mock)');
                    intent = createIntent('WAREHOUSE', 'WH-1');
                    return [4 /*yield*/, engine.buildContext(intent, mockContext)];
                case 5:
                    result = _c.sent();
                    assert(result.isSuccess, 'resolved generic entity successfully');
                    candidate = result.getValue().resolvedEntities['WAREHOUSE:WH-1'];
                    assert(candidate.id === 'wh-uuid-1', 'Mock Warehouse ID matches');
                    assert(((_b = candidate.metadata) === null || _b === void 0 ? void 0 : _b.reason) === 'exact_match_code', 'Explainability metadata is present for generic entity');
                    console.log('\n─────────────────────────');
                    console.log('All BusinessContextEngine tests passed.');
                    return [2 /*return*/];
            }
        });
    });
}
runTests().catch(function (err) {
    console.error('Test suite failed:', err.message);
    process.exit(1);
});
