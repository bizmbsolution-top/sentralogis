/**
 * Sentralogis — Phase 5C-6
 * lib/pricing/migration-service.ts
 *
 * Legacy Pricing Migration service (ADR-057 through ADR-066).
 *
 * Core principle: NEVER FABRICATE HISTORICAL TRUTH.
 */

import type { IdentityContext } from '../application/identity/types';
import { assertPermission } from '../application/identity/resolver';
import {
  migrateFwPriceMaster,
  migrateCrmSbuCustomerRates,
  migrateMdBillingRates,
  generateDryRunReport,
} from './migration-repository';
import type { MigrationResult, DryRunReport } from './migration-types';

export class PricingMigrationService {
  constructor(private readonly ctx: IdentityContext) {}

  async dryRun(tenantId: string): Promise<DryRunReport> {
    assertPermission(this.ctx, 'commercial:manage');
    return generateDryRunReport(tenantId);
  }

  async migrate(tenantId: string): Promise<MigrationResult[]> {
    assertPermission(this.ctx, 'commercial:manage');

    const fwResults = await migrateFwPriceMaster(tenantId, false);
    const crmResults = await migrateCrmSbuCustomerRates(tenantId, false);
    const whResults = await migrateMdBillingRates(tenantId, false);

    return [...fwResults, ...crmResults, ...whResults];
  }
}
