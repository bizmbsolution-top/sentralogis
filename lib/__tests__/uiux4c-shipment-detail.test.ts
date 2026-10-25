/**
 * Sentralogis — UI/UX-4C Remediation: Test Coverage
 * File: lib/__tests__/uiux4c-shipment-detail.test.ts
 *
 * Test coverage for the Shipment Detail workspace:
 * - Route rendering (page delegates to ShipmentDetailWorkspace)
 * - Tab contract (5 tabs with correct IDs and labels)
 * - Data-state behavior (loading, error, not-found, loaded)
 * - Canonical data source (fetchShipmentById, not direct supabase)
 * - Existing component reuse (ExecutionHealthBar, ExceptionsPanel, ShipmentStatusBadge)
 * - Exception resolution uses existing canonical PATCH endpoint
 * - No fake/static/mock data injected
 * - No database writes
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());

function readFile(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

export function runUiux4cShipmentDetailSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  const workspacePath = path.join(ROOT, 'components', 'workspaces', 'shipment', 'ShipmentDetailWorkspace.tsx');
  const pagePath = path.join(ROOT, 'app', '(dashboard)', 'sbu', 'forwarding', 'shipments', '[id]', 'page.tsx');
  const apiPath = path.join(ROOT, 'app', 'api', 'v1', 'forwarding', 'shipments', '[id]', 'route.ts');
  const apiHelperPath = path.join(ROOT, 'lib', 'domain', 'shipment', 'api-helper.ts');
  const apiLibPath = path.join(ROOT, 'lib', 'api', 'forwarding-shipments.ts');

  // =========================================================================
  // S1: Component existence and export contract
  // =========================================================================
  assert('S1-01', 'ShipmentDetailWorkspace.tsx exists and exports the component', () => {
    const src = readFile(workspacePath);
    if (!src) throw new Error('ShipmentDetailWorkspace.tsx not found');
    if (!src.includes('export function ShipmentDetailWorkspace') && !src.includes('export const ShipmentDetailWorkspace')) {
      throw new Error('ShipmentDetailWorkspace is not exported');
    }
  });

  assert('S1-02', 'Shipment detail page delegates to ShipmentDetailWorkspace', () => {
    const src = readFile(pagePath);
    if (!src.includes('ShipmentDetailWorkspace')) {
      throw new Error('Page does not import or render ShipmentDetailWorkspace');
    }
    if (!src.includes('return <ShipmentDetailWorkspace />')) {
      throw new Error('Page does not render ShipmentDetailWorkspace as its sole content');
    }
  });

  // =========================================================================
  // S2: Tab contract
  // =========================================================================
  assert('S2-01', 'Workspace defines 5 canonical tabs with correct IDs', () => {
    const src = readFile(workspacePath);
    const expectedTabs = ['overview', 'plan', 'units', 'exceptions', 'timeline'];
    for (const t of expectedTabs) {
      if (!src.includes(`id: '${t}'`) && !src.includes(`id: "${t}"`)) {
        throw new Error(`Tab '${t}' not found in workspace tab definition`);
      }
    }
  });

  assert('S2-02', 'Tabs have human-readable labels', () => {
    const src = readFile(workspacePath);
    const expectedLabels = ['Overview', 'Execution Plan', 'Units / Containers', 'Exceptions', 'Timeline'];
    for (const label of expectedLabels) {
      if (!src.includes(`label: '${label}'`) && !src.includes(`label: "${label}"`)) {
        throw new Error(`Tab label '${label}' not found`);
      }
    }
  });

  assert('S2-03', 'Tab rendering uses switch/case on activeTab', () => {
    const src = readFile(workspacePath);
    if (!src.includes('renderTab')) {
      throw new Error('No renderTab dispatch function found');
    }
    if (!src.includes('switch')) {
      throw new Error('Tab rendering does not use switch statement');
    }
  });

  // =========================================================================
  // S3: Data-state behavior
  // =========================================================================
  assert('S3-01', 'Workspace handles loading state', () => {
    const src = readFile(workspacePath);
    if (!src.includes('loading')) {
      throw new Error('No loading state handling found');
    }
    if (!src.includes('setLoading(true)')) {
      throw new Error('Loading state not set to true on fetch');
    }
  });

  assert('S3-02', 'Workspace handles error state', () => {
    const src = readFile(workspacePath);
    if (!src.includes('error')) {
      throw new Error('No error state handling found');
    }
    if (!src.includes("setError(err.message")) {
      throw new Error('Error message not set from caught error');
    }
  });

  assert('S3-03', 'Workspace handles shipment-not-found state', () => {
    const src = readFile(workspacePath);
    if (!src.includes('Shipment not found')) {
      throw new Error('No "Shipment not found" fallback state');
    }
  });

  assert('S3-04', 'Workspace renders shipment number in header', () => {
    const src = readFile(workspacePath);
    if (!src.includes('s.shipment_number') && !src.includes('shipment_number')) {
      throw new Error('Shipment number not rendered in header');
    }
  });

  assert('S3-05', 'Exceptions tab badge shows unresolved count', () => {
    const src = readFile(workspacePath);
    if (!src.includes('unresolvedExceptions')) {
      throw new Error('No unresolved exceptions count logic');
    }
    if (!src.includes('unresolvedExceptions.length')) {
      throw new Error('Unresolved count not used for badge');
    }
  });

  // =========================================================================
  // S4: Canonical data source
  // =========================================================================
  assert('S4-01', 'Workspace uses fetchShipmentById for data fetching', () => {
    const src = readFile(workspacePath);
    if (!src.includes('fetchShipmentById')) {
      throw new Error('Does not use fetchShipmentById from canonical API lib');
    }
    if (!src.includes("from '@/lib/api/forwarding-shipments'")) {
      throw new Error('Does not import from canonical API lib path');
    }
  });

  assert('S4-02', 'No direct supabase.from in workspace component', () => {
    const src = readFile(workspacePath);
    if (src.includes("supabase.from") || src.includes("supabaseAdmin.from")) {
      throw new Error('Workspace performs direct supabase.from() call');
    }
  });

  assert('S4-03', 'No database writes (INSERT/UPDATE/DELETE/UPSERT) in workspace', () => {
    const src = readFile(workspacePath);
    const mutationPatterns = [/\.insert\(/, /\.update\(/, /\.delete\(/, /\.upsert\(/];
    const lines = src.split('\n');
    for (const line of lines) {
      if (mutationPatterns.some(p => p.test(line))) {
        throw new Error(`Found DB mutation call in workspace: ${line.trim()}`);
      }
    }
  });

  assert('S4-04', 'No fake/static data strings in workspace', () => {
    const src = readFile(workspacePath);
    const forbidden = ['mock', 'fakeData', 'dummy', 'lorem ipsum', 'placeholder-'];
    const lowerSrc = src.toLowerCase();
    for (const f of forbidden) {
      if (lowerSrc.includes(f)) {
        throw new Error(`Found '${f}' (fake/static data marker) in workspace`);
      }
    }
  });

  // =========================================================================
  // S5: Existing component reuse
  // =========================================================================
  assert('S5-01', 'Workspace reuses ExecutionHealthBar from control-tower', () => {
    const src = readFile(workspacePath);
    if (!src.includes("from '@/components/control-tower/ExecutionHealthBar'")) {
      throw new Error('Does not import ExecutionHealthBar from control-tower');
    }
  });

  assert('S5-02', 'Workspace reuses ExceptionsPanel from control-tower', () => {
    const src = readFile(workspacePath);
    if (!src.includes("from '@/components/control-tower/ExceptionsPanel'")) {
      throw new Error('Does not import ExceptionsPanel from control-tower');
    }
  });

  assert('S5-03', 'Workspace reuses ShipmentStatusBadge', () => {
    const src = readFile(workspacePath);
    if (!src.includes("from '@/components/workspaces/forwarding/ShipmentStatusBadge'")) {
      throw new Error('Does not import ShipmentStatusBadge');
    }
  });

  assert('S5-04', 'No duplicate component definitions in workspace', () => {
    const src = readFile(workspacePath);
    const duplicatePatterns = [
      'function ExecutionHealthBar',
      'function ExceptionsPanel',
      'function ShipmentStatusBadge',
      'export const ShipmentStatusBadge',
      'export function ExecutionHealthBar',
    ];
    for (const p of duplicatePatterns) {
      if (src.includes(p)) {
        throw new Error(`Found duplicate component definition: ${p}`);
      }
    }
  });

  // =========================================================================
  // S6: Exception resolution — existing canonical endpoint
  // =========================================================================
  assert('S6-01', 'Exception resolution calls existing PATCH endpoint', () => {
    const src = readFile(workspacePath);
    if (!src.includes('`/api/v1/forwarding/shipments/${shipmentId}/exceptions/${exceptionId}`')) {
      throw new Error('Exception resolution does not call existing canonical PATCH endpoint');
    }
    if (!src.includes("method: 'PATCH'")) {
      throw new Error('Exception resolution does not use PATCH method');
    }
  });

  assert('S6-02', 'Exception resolution endpoint is server-side authorized', () => {
    const src = readFile(apiHelperPath);
    if (!src.includes('resolveApiAuthContext')) {
      throw new Error('API helper does not use resolveApiAuthContext for server-side auth');
    }
  });

  assert('S6-03', 'PATCH route handler delegates to ExceptionService.resolveException', () => {
    const routePath = path.join(ROOT, 'app', 'api', 'v1', 'forwarding', 'shipments', '[id]', 'exceptions', '[exceptionId]', 'route.ts');
    const src = readFile(routePath);
    if (!src.includes('resolveException')) {
      throw new Error('PATCH route does not call ExceptionService.resolveException');
    }
  });

  // =========================================================================
  // S7: Shipment data lineage
  // =========================================================================
  assert('S7-01', 'Workspace accesses canonical ShipmentAggregate fields', () => {
    const src = readFile(workspacePath);
    const requiredFields = [
      'shipment_number', 'customer_id', 'origin_location_id',
      'destination_location_id', 'global_status', 'etd', 'eta',
      'master_bl_number', 'house_bl_number',
    ];
    for (const field of requiredFields) {
      if (!src.includes(field)) {
        throw new Error(`Workspace does not reference canonical field: ${field}`);
      }
    }
  });

  assert('S7-02', 'Workspace renders execution legs with transport mode', () => {
    const src = readFile(workspacePath);
    if (!src.includes('execution_legs')) {
      throw new Error('Workspace does not access execution_legs from aggregate');
    }
    if (!src.includes('transport_mode')) {
      throw new Error('Workspace does not reference transport_mode on legs');
    }
  });

  assert('S7-03', 'Workspace renders units with container-specific fields', () => {
    const src = readFile(workspacePath);
    if (!src.includes('units')) {
      throw new Error('Workspace does not access units from aggregate');
    }
  });

  assert('S7-04', 'Workspace renders milestones with labels', () => {
    const src = readFile(workspacePath);
    if (!src.includes('milestones')) {
      throw new Error('Workspace does not access milestones from aggregate');
    }
    if (!src.includes('milestone_label')) {
      throw new Error('Workspace does not render milestone_label');
    }
  });

  assert('S7-05', 'Timeline combines milestones, exceptions, and execution legs', () => {
    const src = readFile(workspacePath);
    if (!src.includes('Milestones') && !src.includes('milestones')) {
      throw new Error('Timeline does not reference milestones');
    }
    if (!src.includes('exceptions')) {
      throw new Error('Timeline does not reference exceptions');
    }
    if (!src.includes('execution_legs')) {
      throw new Error('Timeline does not reference execution_legs');
    }
    if (!src.includes('Timeline')) {
      throw new Error('Timeline tab label not found');
    }
  });

  // =========================================================================
  // S8: Navigation contract
  // =========================================================================
  assert('S8-01', 'Shipment detail route maps to shipments navigation section', () => {
    const navSrc = readFile(path.join(ROOT, 'lib', 'navigation', 'types.tsx'));
    if (!navSrc.includes('/sbu/forwarding/shipments')) {
      throw new Error('Navigation types do not map /sbu/forwarding/shipments route');
    }
    if (!navSrc.includes('shipments')) {
      throw new Error('Navigation types do not include shipments section');
    }
  });

  assert('S8-02', 'Workspace has back navigation', () => {
    const src = readFile(workspacePath);
    if (!src.includes('router.back()')) {
      throw new Error('No back navigation button');
    }
  });

  return results;
}
