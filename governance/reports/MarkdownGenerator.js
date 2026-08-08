"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownGenerator = void 0;
var MarkdownGenerator = /** @class */ (function () {
    function MarkdownGenerator() {
    }
    MarkdownGenerator.generateRepositoryHealth = function (scores) {
        return "# Repository Health Report\n\n## Overall Status\n**Production Ready:** ".concat(scores.isProductionReady ? 'YES' : 'NO', "\n**Overall Health Score:** ").concat(scores.overallHealth, " / 100\n\n## Sub-Scores\n- **Architecture Maturity:** ").concat(scores.architectureMaturity, " / 100\n- **Technical Debt:** ").concat(scores.technicalDebt, " / 100\n- **TypeScript Health:** ").concat(scores.typescriptHealth, " / 100\n- **Test Health:** ").concat(scores.testHealth, " / 100\n- **Security Health:** ").concat(scores.securityHealth, " / 100\n- **Dependency Health:** ").concat(scores.dependencyHealth, " / 100\n\n## Generated Date\n").concat(new Date().toISOString(), "\n");
    };
    MarkdownGenerator.generateArchitectureMaturity = function (scores, metrics) {
        return "# Architecture Maturity Report\n\n**Score:** ".concat(scores.architectureMaturity, " / 100\n\n## Layer Analysis\n- **Circular Dependencies Detected:** ").concat(metrics.circularDependencies, "\n- **Layer Violations (Domain -> Presentation):** ").concat(metrics.layerViolations, "\n\n*Note: A zero indicates clean architecture boundaries based on the current heuristic scan.*\n");
    };
    MarkdownGenerator.generateTechnicalDebt = function (scores, metrics) {
        return "# Technical Debt Report\n\n**Score:** ".concat(scores.technicalDebt, " / 100\n\n## Debt Markers\n- **TODOs:** ").concat(metrics.todoCount, "\n- **FIXMEs:** ").concat(metrics.fixmeCount, "\n- **HACKs:** ").concat(metrics.hackCount, "\n- **XXXs:** ").concat(metrics.xxxCount, "\n\n## Code Smells\n- **Deep Nesting (>4 levels):** ").concat(metrics.deepNestingCount, " occurrences\n- **Long Functions (>100 lines):** ").concat(metrics.longFunctionsCount, " occurrences\n- **Large Files (>500 lines):** ").concat(metrics.largeFilesCount, " occurrences\n");
    };
    MarkdownGenerator.generateTypescriptHealth = function (scores, metrics, tsErrors) {
        return "# TypeScript Health Report\n\n**Score:** ".concat(scores.typescriptHealth, " / 100\n\n## Usage Metrics\n- **'any' Usage:** ").concat(metrics.anyUsage, " instances\n- **Non-null Assertions (!.):** ").concat(metrics.nullAssertions, " instances\n\n## Error Summary\n- **Total Errors:** ").concat(tsErrors.length, "\n");
    };
    MarkdownGenerator.generatePriorityBacklog = function (tsErrors) {
        var md = "# Priority Backlog\n\n";
        var _loop_1 = function (pLevel) {
            md += "## Priority ".concat(pLevel, "\n");
            var filtered = tsErrors.filter(function (e) { return e.priority === pLevel; });
            if (filtered.length === 0) {
                md += "*No errors in this priority.*\n\n";
                return "continue";
            }
            var sorted = filtered.sort(function (a, b) { return a.file.localeCompare(b.file); });
            sorted.slice(0, 50).forEach(function (e) {
                md += "- **[".concat(e.file, ":").concat(e.line, "]** ").concat(e.category, ": ").concat(e.message, "\n");
            });
            if (sorted.length > 50)
                md += "*(Showing top 50 out of ".concat(sorted.length, ")*\n");
            md += '\n';
        };
        for (var pLevel = 1; pLevel <= 4; pLevel++) {
            _loop_1(pLevel);
        }
        return md;
    };
    MarkdownGenerator.generateAffectedFiles = function (tsErrors) {
        var md = "# Affected Files Report\n\n";
        var groups = {};
        tsErrors.forEach(function (e) {
            groups[e.file] = (groups[e.file] || 0) + 1;
        });
        var sorted = Object.entries(groups).sort(function (a, b) { return b[1] - a[1]; });
        sorted.forEach(function (_a) {
            var file = _a[0], count = _a[1];
            md += "**".concat(file, "**\n- ").concat(count, " errors\n\n");
        });
        return md;
    };
    return MarkdownGenerator;
}());
exports.MarkdownGenerator = MarkdownGenerator;
