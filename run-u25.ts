import { runU25RealWorldLogisticsScenarioValidationSuite } from './lib/__tests__/u25-real-world-logistics-scenario-validation.test';

async function main() {
  const r = await runU25RealWorldLogisticsScenarioValidationSuite();
  console.log(`\nU-25: ${r.passed}/${r.total} passed, ${r.failed} failed`);
  process.exit(r.failed > 0 ? 1 : 0);
}

main();
