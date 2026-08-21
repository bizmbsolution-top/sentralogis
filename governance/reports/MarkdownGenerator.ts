import { CodeMetrics } from '../parser/Scanner';
import { TsError } from '../parser/TsParser';
import { GovernanceScores } from '../metrics/Calculator';

export class MarkdownGenerator {
  public static generateRepositoryHealth(scores: GovernanceScores): string {
    return `# Repository Health Report

## Overall Status
**Production Ready:** ${scores.isProductionReady ? 'YES' : 'NO'}
**Overall Health Score:** ${scores.overallHealth} / 100

## Sub-Scores
- **Architecture Maturity:** ${scores.architectureMaturity} / 100
- **Technical Debt:** ${scores.technicalDebt} / 100
- **TypeScript Health:** ${scores.typescriptHealth} / 100
- **Test Health:** ${scores.testHealth} / 100
- **Security Health:** ${scores.securityHealth} / 100
- **Dependency Health:** ${scores.dependencyHealth} / 100

## Generated Date
${new Date().toISOString()}
`;
  }

  public static generateArchitectureMaturity(scores: GovernanceScores, metrics: CodeMetrics): string {
    return `# Architecture Maturity Report

**Score:** ${scores.architectureMaturity} / 100

## Layer Analysis
- **Circular Dependencies Detected:** ${metrics.circularDependencies}
- **Layer Violations (Domain -> Presentation):** ${metrics.layerViolations}

*Note: A zero indicates clean architecture boundaries based on the current heuristic scan.*
`;
  }

  public static generateTechnicalDebt(scores: GovernanceScores, metrics: CodeMetrics): string {
    return `# Technical Debt Report

**Score:** ${scores.technicalDebt} / 100

## Debt Markers
- **TODOs:** ${metrics.todoCount}
- **FIXMEs:** ${metrics.fixmeCount}
- **HACKs:** ${metrics.hackCount}
- **Deprecated APIs:** ${metrics.deprecatedApiCount}

## Code Smells
- **Deep Nesting (>4 levels):** ${metrics.deepNestingCount} occurrences
- **Long Functions (>100 lines):** ${metrics.longFunctionsCount} occurrences
- **Large Files (>500 lines):** ${metrics.largeFilesCount} occurrences
`;
  }

  public static generateTypescriptHealth(scores: GovernanceScores, metrics: CodeMetrics, tsErrors: TsError[]): string {
    return `# TypeScript Health Report

**Score:** ${scores.typescriptHealth} / 100

## Usage Metrics
- **'any' Usage:** ${metrics.anyUsage} instances
- **Non-null Assertions (!.):** ${metrics.nullAssertions} instances

## Error Summary
- **Total Errors:** ${tsErrors.length}
`;
  }

  public static generatePriorityBacklog(tsErrors: TsError[]): string {
    let md = `# Priority Backlog\n\n`;
    for (let pLevel = 1; pLevel <= 4; pLevel++) {
      md += `## Priority ${pLevel}\n`;
      const filtered = tsErrors.filter((e: any) => e.priority === pLevel);
      if (filtered.length === 0) {
        md += `*No errors in this priority.*\n\n`;
        continue;
      }
      
      const sorted = filtered.sort((a,b) => a.file.localeCompare(b.file));
      sorted.slice(0, 50).forEach((e: any) => {
        md += `- **[${e.file}:${e.line}]** ${e.category || 'Error'}: ${e.message}\n`;
      });
      if (sorted.length > 50) md += `*(Showing top 50 out of ${sorted.length})*\n`;
      md += '\n';
    }
    return md;
  }

  public static generateAffectedFiles(tsErrors: TsError[]): string {
    let md = `# Affected Files Report\n\n`;
    const groups: Record<string, number> = {};
    
    tsErrors.forEach(e => {
      groups[e.file] = (groups[e.file] || 0) + 1;
    });

    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    
    sorted.forEach(([file, count]) => {
      md += `**${file}**\n- ${count} errors\n\n`;
    });
    
    return md;
  }
}
