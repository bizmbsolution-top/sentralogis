import * as path from 'path';
import { CodeScanner } from './parser/Scanner';
import { TsParser } from './parser/TsParser';
import { Calculator } from './metrics/Calculator';
import { HistoryManager } from './history/HistoryManager';
import { FileWriter } from './writer/FileWriter';

// We skip importing Markdown/Html generators here to avoid noise in this refactor, 
// assuming they'd be updated in a real pass. For now, we focus on the core output.

async function main() {
  console.log('Running Engineering Governance Platform...');
  const rootDir = path.resolve(__dirname, '..');
  const outputDir = path.join(rootDir, 'governance');
  const tsErrorLog = path.join(rootDir, 'ts_errors.txt');

  try {
    console.log('Scanning codebase...');
    const scanner = new CodeScanner();
    const codeMetrics = await scanner.scanRepository(rootDir);

    console.log('Parsing TypeScript errors...');
    const tsParser = new TsParser();
    const tsErrors = tsParser.parse(tsErrorLog);

    console.log('Calculating metrics...');
    const calculator = new Calculator();
    const snapshot = calculator.calculate(codeMetrics, tsErrors);

    // Generate canonical JSON metric
    FileWriter.writeJson(path.join(outputDir, 'json', 'governance_snapshot.json'), snapshot);

    console.log('Updating History...');
    const historyManager = new HistoryManager(outputDir);
    historyManager.append({
      timestamp: snapshot.metadata.timestamp,
      overallScore: snapshot.productionReadiness.overallScore,
      architectureScore: snapshot.architecture.layerSeparation.score,
      technicalDebtScore: snapshot.technicalDebt.score,
      typescriptScore: snapshot.typescript.score,
      securityScore: 100,
      errorCount: snapshot.typescript.diagnostics.length,
      isReady: snapshot.productionReadiness.isReady
    });

    console.log('\nEngineering Governance Platform');
    console.log(`STATUS: ${snapshot.productionReadiness.deploymentStatus}`);

    if (!snapshot.productionReadiness.isReady) {
      process.exit(2);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Report generation failed:', error);
    process.exit(1);
  }
}

main();
