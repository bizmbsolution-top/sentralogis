import { runIdentityResolverSuite } from '../lib/application/identity/__tests__/identity-resolver.test';
import { runAuthorizationSuite } from '../lib/application/identity/__tests__/authorization.test';
import { runEngagementBridgeSuite } from '../lib/application/engagement/__tests__/engagement-bridge.test';
import { runCommercialWorkOrderSuite } from '../lib/application/commercial-work-orders/__tests__/commercial-work-orders.test';
import { runWorkOrderValidationSuite } from '../lib/application/commercial-work-orders/__tests__/validation.test';
import { runForwardingWriterGuardSuite } from '../lib/application/service-contracts/__tests__/forwarding-writer.test';
import { runExecutionLineageSuite } from '../lib/application/service-contracts/__tests__/trucking-lineage.test';
import { runCapabilityRegistrySuite } from '../lib/application/capabilities/__tests__/capability-registry.test';
import { runCapabilityBindingLifecycleSuite } from '../lib/application/capability-bindings/__tests__/binding-lifecycle.test';
import { runPhase4aContainmentSuite } from '../lib/application/capability-bindings/__tests__/phase4a-containment.test';
import { runPhase2ValidationSuite } from '../lib/domain/service-contracts/__tests__/service-contracts.test';
import { runShipmentDomainValidationSuite } from '../lib/domain/shipment/__tests__/shipment-domain.test';
import { runShipmentApiValidationSuite } from '../lib/domain/shipment/__tests__/shipment-api.test';
import { runShipmentCreatorValidationSuite } from '../lib/domain/shipment/__tests__/shipment-creator.test';
import { runFabricatedIdEliminationSuite } from '../lib/domain/shipment/__tests__/fabricated-id-elimination.test';
import { runStaticArchitectureGatesSuite } from '../lib/__tests__/static-architecture-gates.test';
import { runU10rForensicReconciliationSuite } from '../lib/__tests__/u10r-forensic-reconciliation.test';
import { runU11QuoteIdentityAuthoritySuite } from '../lib/__tests__/u11-quote-identity-authority.test';
import { runU12CommercialLineageSuite } from '../lib/__tests__/u12-commercial-lineage.test';
import { runU12aSalesOrderArchitectureSuite } from '../lib/__tests__/u12a-sales-order-architecture.test';
import { runU13SalesOrderFoundationSuite } from '../lib/__tests__/u13-sales-order-foundation.test';
import { runU13rSalesOrderForensicReconciliationSuite } from '../lib/__tests__/u13r-sales-order-forensic-reconciliation.test';
import { runU14FulfillmentCompositionArchitectureSuite } from '../lib/__tests__/u14-fulfillment-composition-architecture.test';
import { runU14aFulfillmentAdrRatificationSuite } from '../lib/__tests__/u14a-fulfillment-adr-ratification.test';
import { runU15FulfillmentFoundationSuite } from '../lib/__tests__/u15-fulfillment-foundation.test';
import { runU15rFulfillmentForensicReconciliationSuite } from '../lib/__tests__/u15r-fulfillment-forensic-reconciliation.test';
import { runU16FulfillmentOperationalCompositionSuite } from '../lib/__tests__/u16-fulfillment-operational-composition.test';
import { runU16rFulfillmentOperationalCompositionForensicReconciliationSuite } from '../lib/__tests__/u16r-fulfillment-operational-composition-forensic-reconciliation.test';
import { runU16aFulfillmentAdrRatificationSuite } from '../lib/__tests__/u16a-fulfillment-operational-composition-adr-ratification.test';
import { runU17OperationalHandoffContractSuite } from '../lib/__tests__/u17-operational-handoff-contract-architecture.test';
import { runU17rOperationalHandoffContractForensicReconciliationSuite } from '../lib/__tests__/u17r-operational-handoff-contract-forensic-reconciliation.test';
import { runU17aFulfillmentAdrRatificationSuite } from '../lib/__tests__/u17a-fulfillment-operational-handoff-adr-ratification.test';
import { runAdr091Suite } from '../lib/__tests__/adr091-copilot-domain-mutation-authority.test';
import { runAdr092Phase3Suite } from '../lib/__tests__/adr092-phase3-assign-driver-e2e.test';
import { runU18OperationalHandoffFoundationSuite } from '../lib/__tests__/u18-operational-handoff-foundation.test';
import { runU18rOperationalHandoffContractForensicReconciliationSuite } from '../lib/__tests__/u18r-operational-handoff-foundation-forensic-reconciliation.test';
import { runU19OperationalHandoffDomainExecutionSuite } from '../lib/__tests__/u19-operational-handoff-domain-execution-integration.test';
import { runU20OperationalHandoffDomainExecutionIntegrationSuite } from '../lib/__tests__/u20-operational-handoff-domain-execution-integration.test';
import { runU20rOperationalHandoffDomainExecutionForensicReconciliationSuite } from '../lib/__tests__/u20r-operational-handoff-domain-execution-forensic-reconciliation.test';
import { runU21EndToEndCommercialOperationalLifecycleSuite } from '../lib/__tests__/u21-end-to-end-commercial-operational-lifecycle.test';
import { runU21rEndToEndCommercialOperationalLifecycleForensicReconciliationSuite } from '../lib/__tests__/u21r-end-to-end-commercial-operational-lifecycle-forensic-reconciliation.test';
import { runU22CommercialOperationalOrchestrationReadinessSuite } from '../lib/__tests__/u22-commercial-operational-orchestration-readiness.test';
import { runU23CommercialExecutionWorkspaceSuite } from '../lib/__tests__/u23-commercial-execution-workspace-control-tower.test';
import { runU23rCommercialExecutionWorkspaceForensicReconciliationSuite } from '../lib/__tests__/u23r-commercial-execution-workspace-control-tower-forensic-reconciliation.test';
import { runU24CommercialExecutionWorkspaceProductionSuite } from '../lib/__tests__/u24-commercial-execution-workspace-production.test';
import { runU24rCommercialExecutionWorkspaceProductionForensicReconciliationSuite } from '../lib/__tests__/u24r-commercial-execution-workspace-production-forensic-reconciliation.test';
import { runU25RealWorldLogisticsScenarioValidationSuite } from '../lib/__tests__/u25-real-world-logistics-scenario-validation.test';
import { runU25rRealWorldLogisticsScenarioForensicReconciliationSuite } from '../lib/__tests__/u25r-real-world-logistics-scenario-forensic-reconciliation.test';
import { runPhase5BCustomsForwardingOrchestrationSuite } from '../lib/__tests__/phase5b-customs-forwarding-orchestration.test';
import { runData3PartyRoleFoundationSuite } from '../lib/__tests__/data3-party-role-foundation.test';
import { runX3TestSuite } from '../lib/__tests__/x3-w2-canonical-writer.test';
import { runX4TestSuite } from '../lib/__tests__/x4-w3-w4-canonical-writer.test';
import { runX5TestSuite } from '../lib/__tests__/x5-reconciliation.test';
import { runX6TestSuite } from '../lib/__tests__/x6-reader-readiness.test';
import { runPostX4ReconciliationAssessment } from '../lib/__tests__/post-x4-reconciliation-assessment.test';
import { runFinalClosureAssessment } from '../lib/__tests__/data4e-final-closure-assessment.test';
import { runRReaderWaveRASuite } from '../lib/__tests__/r-reader-wave-r-a.test';
import { runUiux4dExternalPortalsSuite } from '../lib/__tests__/uiux4d-external-portals.test';

interface SuiteResult { passed: number; failed: number; total: number }
type SuiteFn = () => SuiteResult | Promise<SuiteResult> | Array<{ testId: string; description: string; pass: boolean; error?: string }>;

function toSuiteResult(r: any): SuiteResult {
  if (Array.isArray(r)) {
    const passed = r.filter((t: any) => t.pass).length;
    const failed = r.filter((t: any) => !t.pass).length;
    return { passed, failed, total: r.length };
  }
  if (r && typeof r === 'object' && 'passed' in r && 'failed' in r && 'total' in r) {
    return r as SuiteResult;
  }
  return { passed: 0, failed: 0, total: 0 };
}

const syncSuites: Array<{ name: string; fn: SuiteFn }> = [
  { name: 'U-01 Identity Resolver', fn: runIdentityResolverSuite },
  { name: 'U-02 Authorization', fn: runAuthorizationSuite },
  { name: 'Service Contracts', fn: runPhase2ValidationSuite },
  { name: 'Shipment Domain', fn: runShipmentDomainValidationSuite as any },
  { name: 'Shipment API', fn: runShipmentApiValidationSuite as any },
  { name: 'Shipment Creator', fn: runShipmentCreatorValidationSuite as any },
  { name: 'U-09 Fabricated-ID Elimination', fn: runFabricatedIdEliminationSuite as any },
  { name: 'U-10 Static Architecture Gates', fn: runStaticArchitectureGatesSuite },
  { name: 'U-10R Forensic Reconciliation', fn: runU10rForensicReconciliationSuite },
  { name: 'U-11 Quote Identity Authority', fn: runU11QuoteIdentityAuthoritySuite },
  { name: 'U-12 Commercial Lineage', fn: runU12CommercialLineageSuite },
  { name: 'U-12A Sales Order Architecture', fn: runU12aSalesOrderArchitectureSuite },
  { name: 'U-14 Fulfillment Composition Architecture', fn: runU14FulfillmentCompositionArchitectureSuite },
  { name: 'U-14A Fulfillment ADR Ratification', fn: runU14aFulfillmentAdrRatificationSuite },
  { name: 'U-16 Fulfillment Operational Composition', fn: runU16FulfillmentOperationalCompositionSuite },
  { name: 'U-16R Fulfillment Operational Composition Forensic Reconciliation', fn: runU16rFulfillmentOperationalCompositionForensicReconciliationSuite },
  { name: 'U-16A Fulfillment ADR Ratification', fn: runU16aFulfillmentAdrRatificationSuite },
  { name: 'U-17 Operational Handoff Contract Architecture', fn: runU17OperationalHandoffContractSuite },
  { name: 'U-17R Operational Handoff Contract Forensic Reconciliation', fn: runU17rOperationalHandoffContractForensicReconciliationSuite },
  { name: 'U-17A Fulfillment ADR Ratification', fn: runU17aFulfillmentAdrRatificationSuite },
  { name: 'ADR-091 Copilot Domain Mutation Authority', fn: runAdr091Suite },
];

const asyncSuites: Array<{ name: string; fn: () => Promise<SuiteResult> }> = [
  { name: 'U-03 Engagement Bridge', fn: runEngagementBridgeSuite },
  { name: 'U-03 Commercial Work Orders', fn: runCommercialWorkOrderSuite },
  { name: 'U-03 Work Order Validation', fn: runWorkOrderValidationSuite },
  { name: 'U-08 Forwarding Writer Guard', fn: runForwardingWriterGuardSuite },
  { name: 'U-07 Execution Lineage', fn: runExecutionLineageSuite },
  { name: 'U-05 Capability Registry', fn: runCapabilityRegistrySuite },
  { name: 'U-06 Binding Lifecycle', fn: runCapabilityBindingLifecycleSuite },
  { name: 'U-06A Containment', fn: runPhase4aContainmentSuite },
  { name: 'U-13 Sales Order Foundation', fn: runU13SalesOrderFoundationSuite },
  { name: 'U-13R Sales Order Forensic Reconciliation', fn: runU13rSalesOrderForensicReconciliationSuite },
  { name: 'U-15 Fulfillment Foundation', fn: runU15FulfillmentFoundationSuite },
  { name: 'U-15R Fulfillment Forensic Reconciliation', fn: runU15rFulfillmentForensicReconciliationSuite },
  { name: 'U-18 Operational Handoff Foundation', fn: runU18OperationalHandoffFoundationSuite },
  { name: 'U-18R Operational Handoff Forensic Reconciliation', fn: runU18rOperationalHandoffContractForensicReconciliationSuite },
  { name: 'U-19 Operational Handoff Domain Execution Integration', fn: runU19OperationalHandoffDomainExecutionSuite },
  { name: 'U-20 Operational Handoff Domain Execution Integration', fn: runU20OperationalHandoffDomainExecutionIntegrationSuite },
  { name: 'U-20R Operational Handoff Domain Execution Forensic Reconciliation', fn: runU20rOperationalHandoffDomainExecutionForensicReconciliationSuite },
  { name: 'U-21 End-to-End Commercial-Operational Lifecycle', fn: runU21EndToEndCommercialOperationalLifecycleSuite },
  { name: 'U-21R End-to-End Commercial-Operational Lifecycle Forensic Reconciliation', fn: runU21rEndToEndCommercialOperationalLifecycleForensicReconciliationSuite },
  { name: 'U-22 Commercial-Operational Orchestration Readiness', fn: runU22CommercialOperationalOrchestrationReadinessSuite },
  { name: 'U-23 Commercial Execution Workspace & Control Tower', fn: runU23CommercialExecutionWorkspaceSuite },
  { name: 'U-23R Commercial Execution Workspace & Control Tower Forensic Reconciliation', fn: runU23rCommercialExecutionWorkspaceForensicReconciliationSuite },
  { name: 'U-24 Commercial Execution Workspace Production', fn: runU24CommercialExecutionWorkspaceProductionSuite },
  { name: 'U-24R Commercial Execution Workspace Production Forensic Reconciliation', fn: runU24rCommercialExecutionWorkspaceProductionForensicReconciliationSuite },
  { name: 'U-25 Real-World Logistics Scenario Validation', fn: runU25RealWorldLogisticsScenarioValidationSuite },
  { name: 'U-25R Real-World Logistics Scenario Forensic Reconciliation', fn: runU25rRealWorldLogisticsScenarioForensicReconciliationSuite },
  { name: 'Phase 5B Customs-Forwarding Operational Orchestration', fn: runPhase5BCustomsForwardingOrchestrationSuite },
  { name: 'DATA-3 Party Role Foundation', fn: async () => toSuiteResult(runData3PartyRoleFoundationSuite()) },
  { name: 'DATA-4E X3 W2 Tenant Contacts Canonical Writer', fn: async () => { const r = await runX3TestSuite(); return toSuiteResult(r); } },
  { name: 'DATA-4E X4 W3/W4 Party Role Canonical Writer', fn: async () => { const r = await runX4TestSuite(); return toSuiteResult(r); } },
  { name: 'DATA-4E X5 Reconciliation', fn: async () => { const r = await runX5TestSuite(); return toSuiteResult(r); } },
  { name: 'DATA-4E X6 Wave-0 Reader Readiness', fn: async () => { const r = await runX6TestSuite(); return toSuiteResult(r); } },
  { name: 'DATA-4E Post-X4 Reconciliation Assessment', fn: async () => { const r = await runPostX4ReconciliationAssessment(); return toSuiteResult(r); } },
  { name: 'DATA-4E Final Closure Assessment', fn: async () => { const r = await runFinalClosureAssessment(); return toSuiteResult(r); } },
  { name: 'R-Reader Wave R-A Entity Ownership Migration', fn: async () => { const r = await runRReaderWaveRASuite(); return toSuiteResult(r); } },
  { name: 'ADR-092 Phase 3 ASSIGN_DRIVER Integration/E2E', fn: runAdr092Phase3Suite },
  { name: 'UI/UX-4D External Portals & Mobile', fn: async () => toSuiteResult(runUiux4dExternalPortalsSuite()) },
];

let totalPass = 0;
let totalFail = 0;

async function main() {
  // Sync suites
  for (const s of syncSuites) {
    try {
      const r = toSuiteResult(s.fn());
      totalPass += r.passed;
      totalFail += r.failed;
      console.log(`${s.name}: ${r.passed}/${r.total} PASS${r.failed > 0 ? ` (${r.failed} FAIL)` : ''}`);
    } catch (e: any) {
      console.log(`${s.name}: ERROR - ${e.message}`);
      totalFail++;
    }
  }

  // Async suites
  for (const s of asyncSuites) {
    try {
      const r = await s.fn();
      totalPass += r.passed;
      totalFail += r.failed;
      console.log(`${s.name}: ${r.passed}/${r.total} PASS${r.failed > 0 ? ` (${r.failed} FAIL)` : ''}`);
    } catch (e: any) {
      console.log(`${s.name}: ERROR - ${e.message}`);
      totalFail++;
    }
  }

  console.log(`\n========================================`);
  console.log(`FULL REGRESSION: ${totalPass}/${totalPass + totalFail} PASS, ${totalFail} FAIL`);
  console.log(`========================================`);
  if (totalFail > 0) process.exit(1);
}

main();
