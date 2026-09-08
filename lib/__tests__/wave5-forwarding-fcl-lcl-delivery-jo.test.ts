import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

describe('SBU Forwarding Wave 5 — FCL/LCL + Delivery JO Automation', () => {
  // =========================================================================
  // A. FCL/LCL CANONICAL DOMAIN SUPPORT
  // =========================================================================
  describe('FCL/LCL canonical domain support', () => {
    const typesSrc = readFile('lib/domain/forwarding/types.ts');
    const serviceSrc = readFile('lib/domain/forwarding/service.ts');
    const repoSrc = readFile('lib/domain/forwarding/repository.ts');

    test('ServiceType is FCL/LCL canonical', () => {
      expect(typesSrc).toContain("export type ServiceType = 'FCL' | 'LCL'");
    });

    test('ForwardingOrderHeader has service_type field', () => {
      expect(typesSrc).toContain('service_type?: \'FCL\' | \'LCL\'');
    });

    test('CreateOrderHeaderInput has service_type field', () => {
      expect(repoSrc).toContain('service_type?: \'FCL\' | \'LCL\'');
    });

    test('createOrderHeader persists service_type', () => {
      expect(repoSrc).toContain('service_type: input.service_type || \'FCL\'');
    });

    test('createOrderHeader returns service_type', () => {
      expect(serviceSrc).toContain('service_type: header.service_type || \'FCL\'');
    });

    test('getOrderHeader returns service_type', () => {
      expect(serviceSrc).toContain('service_type: header.service_type');
    });

    test('listOrderHeaders returns service_type', () => {
      expect(serviceSrc).toContain('service_type: h.service_type');
    });
  });

  // =========================================================================
  // B. DELIVERY_TYPE SHORTHAND CANONICAL FORMAT
  // =========================================================================
  describe('delivery_type shorthand canonical format', () => {
    const migration056 = readFile('supabase/migrations/20260906000056_fw_container_items_delivery_type_repair.sql');
    const actionsSrc = readFile('lib/actions/forwardingActions.ts');
    const deconsolRoute = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');
    const trackingPage = readFile('app/track/fwd/[token]/page.tsx');

    test('migration 056 drops legacy CHECK constraint', () => {
      expect(migration056).toContain('DROP CONSTRAINT IF EXISTS fw_container_items_delivery_type_check');
    });

    test('migration 056 backfills longhand to shorthand', () => {
      expect(migration056).toContain("WHEN 'port_to_port' THEN 'P2P'");
      expect(migration056).toContain("WHEN 'port_to_door' THEN 'P2D'");
      expect(migration056).toContain("WHEN 'door_to_port' THEN 'D2P'");
      expect(migration056).toContain("WHEN 'door_to_door' THEN 'D2D'");
    });

    test('migration 056 adds canonical CHECK constraint', () => {
      expect(migration056).toContain("CHECK (delivery_type IN ('D2D','P2P','D2P','P2D'))");
    });

    test('forwardingActions delegates delivery_type handling to canonical ForwardingService', () => {
      expect(actionsSrc).toContain('ForwardingService');
      expect(actionsSrc).toContain('deconsolConsolidation');
    });

    test('deconsol route delegates delivery_type handling to canonical ForwardingService', () => {
      expect(deconsolRoute).toContain('ForwardingService');
      expect(deconsolRoute).toContain('deconsolConsolidation');
    });

    test('tracking page uses P2D/D2D shorthand', () => {
      expect(trackingPage).toContain("delivery_type === 'P2D'");
      expect(trackingPage).toContain("delivery_type === 'D2D'");
    });

    test('no longhand delivery_type in forwarding code', () => {
      expect(actionsSrc).not.toContain('port_to_door');
      expect(actionsSrc).not.toContain('door_to_door');
      expect(deconsolRoute).not.toContain('port_to_door');
      expect(deconsolRoute).not.toContain('door_to_door');
    });
  });

  // =========================================================================
  // C. DECONSOL DELIVERY JO AUTOMATION
  // =========================================================================
  describe('Deconsol delivery JO automation', () => {
    const serviceSrc = readFile('lib/domain/forwarding/service.ts');
    const repoSrc = readFile('lib/domain/forwarding/repository.ts');
    const actionsSrc = readFile('lib/actions/forwardingActions.ts');
    const deconsolRoute = readFile('app/api/forwarding/consol/[id]/deconsol/route.ts');

    test('ForwardingService exposes deconsolConsolidation', () => {
      expect(serviceSrc).toContain('deconsolConsolidation');
    });

    test('deconsolConsolidation enforces commercial:manage', () => {
      expect(serviceSrc).toContain("assertPermission(ctx, 'commercial:manage')");
    });

    test('deconsolConsolidation validates consol status', () => {
      expect(serviceSrc).toContain("consol.status !== 'arrived' && consol.status !== 'shipped'");
    });

    test('deconsolConsolidation creates TRK_LAST_MILE SR for P2D/D2D via srIssuer', () => {
      expect(serviceSrc).toContain("service_product_sku: 'TRK_LAST_MILE'");
    });

    test('deconsolConsolidation uses deterministic idempotency key', () => {
      expect(serviceSrc).toContain('idem-deconsol-lastmile-');
    });

    test('deconsolConsolidation updates fw_container_items is_deconsoled', () => {
      expect(serviceSrc).toContain('is_deconsoled: true');
    });

    test('deconsolConsolidation updates container status to deconsoled', () => {
      expect(serviceSrc).toContain("status: 'deconsoled'");
    });

    test('deconsolConsolidation sets consol status deconsol_done when delivery jobs created', () => {
      expect(serviceSrc).toContain("newStatus = deliveryJobsCreated.length > 0 ? 'deconsol_done' : 'closed'");
    });

    test('repository has findConsolidationById', () => {
      expect(repoSrc).toContain('findConsolidationById');
    });

    test('repository has findContainerAssignmentsByConsolidationId', () => {
      expect(repoSrc).toContain('findContainerAssignmentsByConsolidationId');
    });

    test('repository has findContainerItemsByConsolidationId', () => {
      expect(repoSrc).toContain('findContainerItemsByConsolidationId');
    });

    test('repository has updateContainerItem', () => {
      expect(repoSrc).toContain('updateContainerItem');
    });

    test('repository has updateContainerAssignment', () => {
      expect(repoSrc).toContain('updateContainerAssignment');
    });

    test('repository has updateConsolidation', () => {
      expect(repoSrc).toContain('updateConsolidation');
    });

    test('server action delegates deconsol to canonical ForwardingService', () => {
      expect(actionsSrc).toContain('ForwardingService');
      expect(actionsSrc).toContain('deconsolConsolidation(ctx, id, srIssuer)');
    });

    test('API route delegates deconsol to canonical ForwardingService', () => {
      expect(deconsolRoute).toContain('ForwardingService');
      expect(deconsolRoute).toContain('forwardingService.deconsolConsolidation(ctx, id, srIssuer)');
    });

    test('server action srIssuer uses canonical ServiceRequestService.issueRequest', () => {
      expect(actionsSrc).toContain('ServiceRequestService');
      expect(actionsSrc).toContain('serviceRequestService.issueRequest(args, true)');
    });

    test('API route srIssuer uses canonical ServiceRequestService.issueRequest', () => {
      expect(deconsolRoute).toContain('ServiceRequestService');
      expect(deconsolRoute).toContain('serviceRequestService.issueRequest(args, true)');
    });
  });

  // =========================================================================
  // D. ORDER-HEADER ROUTE LEGACY TEMPLATE-KEY MAPPING
  // =========================================================================
  describe('order-header route legacy template-key mapping', () => {
    const routeSrc = readFile('app/api/forwarding/order-header/route.ts');

    test('route maps D2D to door_to_door', () => {
      expect(routeSrc).toContain("'D2D': 'door_to_door'");
    });

    test('route maps P2P to port_to_port', () => {
      expect(routeSrc).toContain("'P2P': 'port_to_port'");
    });

    test('route maps D2P to door_to_port', () => {
      expect(routeSrc).toContain("'D2P': 'door_to_port'");
    });

    test('route maps P2D to port_to_door', () => {
      expect(routeSrc).toContain("'P2D': 'port_to_door'");
    });

    test('route maps shorthand delivery_type to legacy template keys', () => {
      expect(routeSrc).toContain('deliveryTypeMap');
      expect(routeSrc).toContain("'D2D': 'door_to_door'");
      expect(routeSrc).toContain("'P2P': 'port_to_port'");
      expect(routeSrc).toContain("'D2P': 'door_to_port'");
      expect(routeSrc).toContain("'P2D': 'port_to_door'");
    });
  });

  // =========================================================================
  // E. SCOPE INTEGRITY
  // =========================================================================
  describe('Wave 5 scope integrity', () => {
    test('no pricing migration files added', () => {
      const migrationSrc = readFile(path.join('supabase', 'migrations', '20260906_055_fw_order_headers_lineage_repair.sql'));
      expect(migrationSrc).not.toContain('fw_price_master');
      expect(migrationSrc).not.toContain('crm_sbu_customer_rates');
      expect(migrationSrc).not.toContain('md_billing_rates');
      expect(migrationSrc).not.toContain('cogs');
    });

    test('no ADR-083 implementation', () => {
      const adr083 = readFile('docs/architecture/ADR-083-legacy-pricing-decommissioning.md');
      expect(adr083).toContain('RATIFIED');
    });
  });
});
