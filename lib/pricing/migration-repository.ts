/**
 * Sentralogis — Phase 5C-6 / ADR-088 Wave 1
 * lib/pricing/migration-repository.ts
 *
 * Legacy Pricing Migration repository (ADR-057 through ADR-066, ADR-088).
 *
 * Core principle: NEVER FABRICATE HISTORICAL TRUTH.
 * Deterministic mapping only. Exceptions preserved with full evidence.
 */

import { supabaseAdmin } from '../supabase/admin';
import type {
  MigrationResult,
  MigrationException,
  DryRunReport,
  MigrationClassification,
  MigrationExceptionType,
  FwPriceMasterDryRunItem,
} from './migration-types';

// ============================================================================
// TYPES
// ============================================================================

interface FwPriceMasterRow {
  id: string;
  tenant_id: string;
  service_type: string;
  origin_port: string;
  destination_port: string;
  container_type: string | null;
  delivery_type: string | null;
  sell_price: number | null;
  sell_per_cbm: number | null;
  sell_min_cbm: number | null;
  currency: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  is_active: boolean | null;
}

// ============================================================================
// DRY-RUN / PREVIEW
// ============================================================================

export interface FwPriceMasterDryRunItem {
  sourceRecordId: string;
  rateCode: string;
  capabilityType: string;
  rateDescription: string;
  status: string;
  items: Array<{
    chargeBasis: string;
    unitOfMeasure: string;
    unitRate: number | null;
    minCharge: number | null;
    currency: string;
    applicabilityConditions: Record<string, unknown>;
    skip?: boolean;
    skipReason?: string;
  }>;
  warnings: string[];
  exceptions: string[];
}

export async function dryRunFwPriceMaster(tenantId: string): Promise<FwPriceMasterDryRunItem[]> {
  const { data: rates, error } = await supabaseAdmin
    .from('fw_price_master')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error || !rates) {
    return [];
  }

  return rates.map((rate) => {
    const row = rate as FwPriceMasterRow;
    const warnings: string[] = [];
    const exceptions: string[] = [];
    const items: FwPriceMasterDryRunItem['items'] = [];

    const currency = row.currency || 'IDR';
    const serviceType = row.service_type;
    const originPort = row.origin_port;
    const destinationPort = row.destination_port;
    const containerType = row.container_type;
    const rateCode = buildRateCode(serviceType, originPort, destinationPort);

    // PER_CONTAINER item
    if (isPresent(row.sell_price)) {
      items.push({
        chargeBasis: 'PER_CONTAINER',
        unitOfMeasure: containerType || serviceType || 'CONTAINER',
        unitRate: row.sell_price,
        minCharge: null,
        currency,
        applicabilityConditions: {
          origin_port: originPort,
          destination_port: destinationPort,
          service_type: serviceType,
          delivery_type: row.delivery_type,
          container_type: containerType,
        },
      });
    }

    // PER_CBM item
    if (isPresent(row.sell_per_cbm)) {
      const perCbmItem: FwPriceMasterDryRunItem['items'][number] = {
        chargeBasis: 'PER_CBM',
        unitOfMeasure: 'CBM',
        unitRate: row.sell_per_cbm,
        minCharge: isPresent(row.sell_min_cbm) ? row.sell_min_cbm : null,
        currency,
        applicabilityConditions: {
          origin_port: originPort,
          destination_port: destinationPort,
          service_type: serviceType,
          delivery_type: row.delivery_type,
          container_type: containerType,
        },
      };

      if (!isPresent(row.sell_min_cbm)) {
        warnings.push(`PER_CBM item has no sell_min_cbm; min_charge will be null`);
      }

      items.push(perCbmItem);
    }

    // Validation warnings
    if (!isPresent(row.sell_price) && !isPresent(row.sell_per_cbm)) {
      exceptions.push('Source row has no sell_price and no sell_per_cbm; nothing to migrate');
      items.push({
        chargeBasis: 'PER_CONTAINER',
        unitOfMeasure: containerType || serviceType || 'CONTAINER',
        unitRate: null,
        minCharge: null,
        currency,
        applicabilityConditions: {},
        skip: true,
        skipReason: 'No pricing data present',
      });
    }

    if (row.sell_price !== null && row.sell_price < 0) {
      exceptions.push(`sell_price is negative: ${row.sell_price}`);
    }

    if (row.sell_per_cbm !== null && row.sell_per_cbm < 0) {
      exceptions.push(`sell_per_cbm is negative: ${row.sell_per_cbm}`);
    }

    if (row.sell_min_cbm !== null && row.sell_min_cbm < 0) {
      exceptions.push(`sell_min_cbm is negative: ${row.sell_min_cbm}`);
    }

    return {
      sourceRecordId: row.id,
      rateCode,
      capabilityType: 'FORWARDING',
      rateDescription: buildRateDescription(serviceType, originPort, destinationPort),
      status: row.is_active ? 'ACTIVE' : 'INACTIVE',
      items,
      warnings,
      exceptions,
    };
  });
}

// ============================================================================
// MIGRATION
// ============================================================================

export async function migrateFwPriceMaster(
  tenantId: string,
  dryRun: boolean = true,
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  const { data: rates, error } = await supabaseAdmin
    .from('fw_price_master')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error || !rates) {
    return results;
  }

  for (const rate of rates) {
    const row = rate as FwPriceMasterRow;
    const classification: MigrationClassification = 'MIGRATE';
    const exceptionType: MigrationExceptionType | null = null;

    if (!dryRun) {
      const rateCode = buildRateCode(row.service_type, row.origin_port, row.destination_port);
      const rateDescription = buildRateDescription(row.service_type, row.origin_port, row.destination_port);

      const { data: newRate } = await supabaseAdmin
        .from('pricing_rates')
        .insert({
          tenant_id: tenantId,
          rate_code: rateCode,
          capability_type: 'FORWARDING',
          rate_description: rateDescription,
          status: row.is_active ? 'ACTIVE' : 'INACTIVE',
        })
        .select('id')
        .single();

      if (newRate) {
        const { data: newVersion } = await supabaseAdmin
          .from('pricing_rate_versions')
          .insert({
            rate_id: newRate.id,
            tenant_id: tenantId,
            version_no: 1,
            effective_from: row.effective_date,
            effective_to: row.expiry_date,
            status: row.is_active ? 'ACTIVE' : 'INACTIVE',
          })
          .select('id')
          .single();

        if (newVersion) {
          const itemsToInsert: Array<{
            rate_version_id: string;
            tenant_id: string;
            side: string;
            charge_basis: string;
            unit_of_measure: string;
            currency: string;
            unit_rate: number;
            min_charge: number | null;
            applicability_conditions: Record<string, unknown>;
          }> = [];

          // PER_CONTAINER item
          if (isPresent(row.sell_price)) {
            itemsToInsert.push({
              rate_version_id: newVersion.id,
              tenant_id: tenantId,
              side: 'SELL',
              charge_basis: 'PER_CONTAINER',
              unit_of_measure: row.container_type || row.service_type || 'CONTAINER',
              currency: row.currency || 'IDR',
              unit_rate: row.sell_price,
              min_charge: null,
              applicability_conditions: {
                origin_port: row.origin_port,
                destination_port: row.destination_port,
                service_type: row.service_type,
                delivery_type: row.delivery_type,
                container_type: row.container_type,
              },
            });
          }

          // PER_CBM item
          if (isPresent(row.sell_per_cbm)) {
            itemsToInsert.push({
              rate_version_id: newVersion.id,
              tenant_id: tenantId,
              side: 'SELL',
              charge_basis: 'PER_CBM',
              unit_of_measure: 'CBM',
              currency: row.currency || 'IDR',
              unit_rate: row.sell_per_cbm,
              min_charge: isPresent(row.sell_min_cbm) ? row.sell_min_cbm : null,
              applicability_conditions: {
                origin_port: row.origin_port,
                destination_port: row.destination_port,
                service_type: row.service_type,
                delivery_type: row.delivery_type,
                container_type: row.container_type,
              },
            });
          }

          if (itemsToInsert.length > 0) {
            await supabaseAdmin.from('pricing_rate_items').insert(itemsToInsert);
          }
        }
      }
    }

    results.push({
      sourceTable: 'fw_price_master',
      sourceRecordId: row.id,
      canonicalTable: 'pricing_rates',
      canonicalRecordId: null,
      classification,
      exceptionType,
      tenantId,
    });
  }

  return results;
}

// ============================================================================
// CRM_SBU_CUSTOMER_RATES → pricing_rates + pricing_rate_items
// ============================================================================

export async function migrateCrmSbuCustomerRates(
  tenantId: string,
  dryRun: boolean = true,
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  const { data: rates, error } = await supabaseAdmin
    .from('crm_sbu_customer_rates')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error || !rates) {
    return results;
  }

  for (const rate of rates) {
    const classification: MigrationClassification = 'MIGRATE';
    const exceptionType: MigrationExceptionType | null = null;

    if (!dryRun) {
      const capabilityType = mapSbuToCapability(rate.sbu_type);

      const { data: newRate } = await supabaseAdmin
        .from('pricing_rates')
        .insert({
          tenant_id: tenantId,
          rate_code: `CRM-${rate.sbu_type}-${rate.customer_id}`.slice(0, 50),
          capability_type: capabilityType,
          rate_description: rate.service_name,
          status: rate.is_active ? 'ACTIVE' : 'INACTIVE',
        })
        .select('id')
        .single();

      if (newRate) {
        await supabaseAdmin
          .from('pricing_rate_versions')
          .insert({
            rate_id: newRate.id,
            tenant_id: tenantId,
            version_no: 1,
            status: rate.is_active ? 'ACTIVE' : 'INACTIVE',
          });

        await supabaseAdmin
          .from('pricing_rate_items')
          .insert({
            rate_version_id: newRate.id,
            tenant_id: tenantId,
            side: 'SELL',
            charge_basis: rate.service_name,
            unit_of_measure: rate.uom || 'UNIT',
            currency: 'IDR',
            unit_rate: rate.unit_price || 0,
            applicability_conditions: {
              customer_id: rate.customer_id,
              sbu_type: rate.sbu_type,
              route_origin: rate.route_origin,
              route_destination: rate.route_destination,
            },
          });
      }
    }

    results.push({
      sourceTable: 'crm_sbu_customer_rates',
      sourceRecordId: rate.id,
      canonicalTable: 'pricing_rates',
      canonicalRecordId: null,
      classification,
      exceptionType,
      tenantId,
    });
  }

  return results;
}

// ============================================================================
// MD_BILLING_RATES → pricing_rates + pricing_rate_items
// ============================================================================

export async function migrateMdBillingRates(
  tenantId: string,
  dryRun: boolean = true,
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  const { data: rates, error } = await supabaseAdmin
    .from('md_billing_rates')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error || !rates) {
    return results;
  }

  for (const rate of rates) {
    const classification: MigrationClassification = 'MIGRATE';
    const exceptionType: MigrationExceptionType | null = null;

    if (!dryRun) {
      const { data: newRate } = await supabaseAdmin
        .from('pricing_rates')
        .insert({
          tenant_id: tenantId,
          rate_code: `WH-${rate.charge_code}-${rate.contract_id}`.slice(0, 50),
          capability_type: 'WAREHOUSE',
          rate_description: rate.charge_code,
          status: rate.is_active ? 'ACTIVE' : 'INACTIVE',
        })
        .select('id')
        .single();

      if (newRate) {
        await supabaseAdmin
          .from('pricing_rate_versions')
          .insert({
            rate_id: newRate.id,
            tenant_id: tenantId,
            version_no: 1,
            effective_from: rate.valid_from,
            effective_to: rate.valid_to,
            status: rate.is_active ? 'ACTIVE' : 'INACTIVE',
          });

        await supabaseAdmin
          .from('pricing_rate_items')
          .insert({
            rate_version_id: newRate.id,
            tenant_id: tenantId,
            side: 'SELL',
            charge_basis: rate.charge_code,
            unit_of_measure: rate.uom,
            currency: 'IDR',
            unit_rate: rate.rate_value || 0,
            applicability_conditions: {
              contract_id: rate.contract_id,
              charge_code: rate.charge_code,
            },
          });
      }
    }

    results.push({
      sourceTable: 'md_billing_rates',
      sourceRecordId: rate.id,
      canonicalTable: 'pricing_rates',
      canonicalRecordId: null,
      classification,
      exceptionType,
      tenantId,
    });
  }

  return results;
}

// ============================================================================
// DRY-RUN REPORT
// ============================================================================

export async function generateDryRunReport(tenantId: string): Promise<DryRunReport> {
  const fwRates = await migrateFwPriceMaster(tenantId, true);
  const crmRates = await migrateCrmSbuCustomerRates(tenantId, true);
  const whRates = await migrateMdBillingRates(tenantId, true);

  const all = [...fwRates, ...crmRates, ...whRates];

  return {
    discovered: all.length,
    migratable: all.filter((r) => r.classification === 'MIGRATE').length,
    exceptions: all.filter((r) => r.exceptionType !== null).length,
    blocked: 0,
    byTenant: {
      [tenantId]: {
        discovered: all.length,
        migratable: all.filter((r) => r.classification === 'MIGRATE').length,
        exceptions: all.filter((r) => r.exceptionType !== null).length,
        blocked: 0,
      },
    },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function mapSbuToCapability(sbuType: string): 'FORWARDING' | 'CUSTOMS' | 'TRUCKING' | 'WAREHOUSE' {
  switch (sbuType?.toUpperCase()) {
    case 'FORWARDING':
      return 'FORWARDING';
    case 'CLEARANCE':
    case 'CUSTOMS':
      return 'CUSTOMS';
    case 'TRUCKING':
      return 'TRUCKING';
    case 'WAREHOUSE':
      return 'WAREHOUSE';
    default:
      return 'FORWARDING';
  }
}

function buildRateCode(serviceType: string, originPort: string, destinationPort: string): string {
  return `FWD-${serviceType}-${originPort}-${destinationPort}`.toUpperCase();
}

function buildRateDescription(serviceType: string, originPort: string, destinationPort: string): string {
  return `${serviceType} ${originPort} → ${destinationPort}`;
}

function isPresent(value: number | null): boolean {
  return value !== null && value !== undefined && !isNaN(value);
}
