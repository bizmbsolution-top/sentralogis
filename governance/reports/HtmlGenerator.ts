import { GovernanceScores } from '../metrics/Calculator';

export class HtmlGenerator {
  public static generateDashboard(scores: GovernanceScores): string {
    const color = (score: number) => score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SentraForge Governance Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; }
        h1 { color: #38bdf8; text-align: center; margin-bottom: 2rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; }
        .card { background: #1e293b; padding: 1.5rem; border-radius: 0.5rem; text-align: center; border: 1px solid #334155; }
        .score { font-size: 3rem; font-weight: bold; margin: 1rem 0; }
        .green { color: #22c55e; }
        .orange { color: #f59e0b; }
        .red { color: #ef4444; }
        .title { color: #94a3b8; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .ready-badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 2rem; font-weight: bold; margin-top: 1rem; }
        .ready { background: #166534; color: #4ade80; }
        .not-ready { background: #991b1b; color: #f87171; }
    </style>
</head>
<body>
    <h1>SentraForge Engineering Governance</h1>
    
    <div style="text-align: center; margin-bottom: 3rem;">
        <div class="ready-badge ${scores.isProductionReady ? 'ready' : 'not-ready'}">
            PRODUCTION READINESS: ${scores.isProductionReady ? 'PASS' : 'FAIL'}
        </div>
    </div>

    <div class="grid">
        <div class="card">
            <div class="title">Overall Health</div>
            <div class="score ${color(scores.overallHealth)}">${scores.overallHealth}</div>
        </div>
        <div class="card">
            <div class="title">Architecture Maturity</div>
            <div class="score ${color(scores.architectureMaturity)}">${scores.architectureMaturity}</div>
        </div>
        <div class="card">
            <div class="title">Technical Debt</div>
            <div class="score ${color(scores.technicalDebt)}">${scores.technicalDebt}</div>
        </div>
        <div class="card">
            <div class="title">TypeScript Health</div>
            <div class="score ${color(scores.typescriptHealth)}">${scores.typescriptHealth}</div>
        </div>
        <div class="card">
            <div class="title">Dependency Health</div>
            <div class="score ${color(scores.dependencyHealth)}">${scores.dependencyHealth}</div>
        </div>
        <div class="card">
            <div class="title">Security Health</div>
            <div class="score ${color(scores.securityHealth)}">${scores.securityHealth}</div>
        </div>
        <div class="card">
            <div class="title">Test Health</div>
            <div class="score ${color(scores.testHealth)}">${scores.testHealth}</div>
        </div>
    </div>
</body>
</html>
    `;
  }
}
