import { runShipmentDomainValidationSuite } from '../lib/domain/shipment/__tests__/shipment-domain.test';
import { runShipmentApiValidationSuite } from '../lib/domain/shipment/__tests__/shipment-api.test';
import { runShipmentCreatorValidationSuite } from '../lib/domain/shipment/__tests__/shipment-creator.test';
import { runFabricatedIdEliminationSuite } from '../lib/domain/shipment/__tests__/fabricated-id-elimination.test';

const suites = [
  { name: 'Shipment Domain', run: runShipmentDomainValidationSuite },
  { name: 'Shipment API', run: runShipmentApiValidationSuite },
  { name: 'Shipment Creator', run: runShipmentCreatorValidationSuite },
  { name: 'U-09 Fabricated-ID Elimination', run: runFabricatedIdEliminationSuite },
];

let totalPass = 0;
let totalFail = 0;

for (const suite of suites) {
  const results = suite.run();
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass).length;
  totalPass += pass;
  totalFail += fail;
  console.log(`\n--- ${suite.name} (${pass}/${results.length} PASS) ---`);
  for (const r of results) {
    const icon = r.pass ? '✓' : '✗';
    console.log(`  ${icon} ${r.testId}: ${r.description}`);
    if (!r.pass) console.log(`    ERROR: ${r.error}`);
  }
}

console.log(`\n========================================`);
console.log(`TOTAL: ${totalPass}/${totalPass + totalFail} PASS, ${totalFail} FAIL`);
console.log(`========================================`);

if (totalFail > 0) process.exit(1);
