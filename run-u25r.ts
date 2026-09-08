import { runU25rRealWorldLogisticsScenarioForensicReconciliationSuite } from './lib/__tests__/u25r-real-world-logistics-scenario-forensic-reconciliation.test';

async function main() {
  const r = await runU25rRealWorldLogisticsScenarioForensicReconciliationSuite();
  console.log(`\nU-25R: ${r.passed}/${r.total} passed, ${r.failed} failed`);
  process.exit(r.failed > 0 ? 1 : 0);
}

main();
