/**
 * Sentralogis — SBU Forwarding Wave 1
 * lib/domain/forwarding/service.ts
 *
 * Canonical Forwarding Domain Service.
 * Application boundary for Forwarding operations.
 */

import { assertPermission } from '@/lib/application/identity/resolver';
import type { IdentityContext } from '@/lib/application/identity/types';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ForwardingRepository } from './repository';
import type {
  CreateOrderHeaderInput,
  CreateConsolidationInput,
  CreateContainerAssignmentInput,
  CreateContainerItemInput,
} from './repository';
import type { TruckingServicePayload } from '@/lib/domain/service-contracts/types';

export interface DeconsolResult {
  consol_id: string;
  delivery_jobs_count: number;
  delivery_jobs_created: string[];
}

export interface ForwardingSrIssuer {
  (args: {
    tenant_id: string;
    source_domain: 'FORWARDING';
    target_domain: 'TRUCKING';
    work_order_id: string;
    service_product_sku: string;
    request_payload: TruckingServicePayload;
    idempotency_key: string;
  }): Promise<{
    request: { assigned_domain_job_id?: string | null };
    dispatchResult?: { domainJobId?: string | null } | null;
  }>;
}

export class ForwardingService {
  private repo = new ForwardingRepository();

  /**
   * Creates a forwarding order header linked to a canonical work order.
   * Enforces commercial:manage authorization and server-derived tenant isolation.
   */
  public async createOrderHeader(ctx: IdentityContext, input: CreateOrderHeaderInput): Promise<{
    id: string;
    tracking_token: string;
    status: string;
    service_type: 'FCL' | 'LCL';
  }> {
    assertPermission(ctx, 'commercial:manage');

    const header = await this.repo.createOrderHeader({
      ...input,
      tenant_id: ctx.tenantId,
    });

    return {
      id: header.id,
      tracking_token: header.tracking_token || '',
      status: header.status || 'need_assignment',
      service_type: header.service_type || 'FCL',
    };
  }

  /**
   * Retrieves a forwarding order header by ID with tenant isolation.
   */
  public async getOrderHeader(ctx: IdentityContext, id: string): Promise<{
    id: string;
    work_order_id: string;
    customer_id: string;
    service_type?: 'FCL' | 'LCL';
    vessel_name?: string | null;
    voyage_no?: string | null;
    status?: string;
    tracking_token?: string | null;
  } | null> {
    const header = await this.repo.findOrderHeaderById(id, ctx.tenantId);
    if (!header) return null;

    return {
      id: header.id,
      work_order_id: header.work_order_id,
      customer_id: header.customer_id,
      service_type: header.service_type,
      vessel_name: header.vessel_name,
      voyage_no: header.voyage_no,
      status: header.status,
      tracking_token: header.tracking_token,
    };
  }

  /**
   * Lists forwarding order headers for the current tenant.
   */
  public async listOrderHeaders(ctx: IdentityContext): Promise<Array<{
    id: string;
    work_order_id: string;
    customer_id: string;
    service_type?: 'FCL' | 'LCL';
    vessel_name?: string | null;
    voyage_no?: string | null;
    status?: string;
    tracking_token?: string | null;
    created_at?: string;
  }>> {
    const headers = await this.repo.listOrderHeadersByTenant(ctx.tenantId);
    return headers.map((h) => ({
      id: h.id,
      work_order_id: h.work_order_id,
      customer_id: h.customer_id,
      service_type: h.service_type,
      vessel_name: h.vessel_name,
      voyage_no: h.voyage_no,
      status: h.status,
      tracking_token: h.tracking_token,
      created_at: h.created_at,
    }));
  }

  /**
   * Creates a consolidation with canonical consol number authority.
   */
  public async createConsolidation(ctx: IdentityContext, input: CreateConsolidationInput): Promise<{
    id: string;
    consol_number: string;
    status: string;
  }> {
    assertPermission(ctx, 'commercial:manage');

    const consol = await this.repo.createConsolidation({
      ...input,
      tenant_id: ctx.tenantId,
    });

    return {
      id: consol.id,
      consol_number: consol.consol_number,
      status: consol.status || 'open',
    };
  }

  /**
   * Creates a container assignment within a consolidation.
   */
  public async createContainerAssignment(
    ctx: IdentityContext,
    input: CreateContainerAssignmentInput,
  ): Promise<{ id: string; container_number: string; status: string }> {
    assertPermission(ctx, 'commercial:manage');

    const assignment = await this.repo.createContainerAssignment({
      ...input,
      tenant_id: ctx.tenantId,
    });

    return {
      id: assignment.id,
      container_number: assignment.container_number,
      status: assignment.status || 'empty',
    };
  }

  /**
   * Creates a container item (cargo breakdown) within a container assignment.
   */
  public async createContainerItem(
    ctx: IdentityContext,
    input: CreateContainerItemInput,
  ): Promise<{ id: string; wo_item_id: string }> {
    assertPermission(ctx, 'commercial:manage');

    const item = await this.repo.createContainerItem({
      ...input,
      tenant_id: ctx.tenantId,
    });

    return {
      id: item.id,
      wo_item_id: item.wo_item_id,
    };
  }

  /**
   * Deconsolidates a consolidation and automatically creates delivery JOs
   * for items with delivery_type P2D or D2D.
   */
  public async deconsolConsolidation(
    ctx: IdentityContext,
    consolId: string,
    srIssuer: ForwardingSrIssuer,
  ): Promise<DeconsolResult> {
    assertPermission(ctx, 'commercial:manage');
    const tenant_id = ctx.tenantId;

    const consol = await this.repo.findConsolidationById(consolId, tenant_id);
    if (!consol) {
      throw new Error('Konsolidasi tidak ditemukan');
    }

    if (consol.status !== 'arrived' && consol.status !== 'shipped') {
      throw new Error('Konsolidasi harus dalam status arrived/shipped untuk deconsol');
    }

    const containers = await this.repo.findContainerAssignmentsByConsolidationId(consolId, tenant_id);
    const notArrived = containers.filter(c => c.status !== 'arrived' && c.status !== 'shipped');
    if (notArrived.length > 0) {
      throw new Error(`Container ${notArrived.map(c => c.container_number).join(', ')} belum arrived/shipped`);
    }

    const items = await this.repo.findContainerItemsByConsolidationId(consolId, tenant_id);
    const deliveryJobsCreated: string[] = [];

    for (const item of items) {
      if (item.is_deconsoled) continue;

      if (item.tenant_id !== tenant_id) {
        console.error(`Container item ${item.id} tenant mismatch`);
        continue;
      }

      if (item.delivery_type === 'P2D' || item.delivery_type === 'D2D') {
        const existingSr = await supabaseAdmin
          .from('svc_service_requests')
          .select('id, assigned_domain_job_id')
          .eq('tenant_id', tenant_id)
          .eq('source_domain', 'FORWARDING')
          .eq('target_domain', 'TRUCKING')
          .eq('service_product_sku', 'TRK_LAST_MILE')
          .eq('work_order_id', item.wo_item_id)
          .maybeSingle();

        const existingJobId = (existingSr.data as any)?.assigned_domain_job_id || null;

        if (existingJobId) {
          deliveryJobsCreated.push(existingJobId);
          await this.repo.updateContainerItem(item.id, {
            last_mile_wo_id: existingJobId,
            is_deconsoled: true,
            deconsoled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          continue;
        }

        const lastMilePayload: TruckingServicePayload = {
          route_specification: {
            pickup: {
              location_id: consol.destination_port || 'DEST_PORT',
              location_name: `Deconsol Hub (${consol.destination_port || 'Destination Port'})`,
            },
            dropoff: {
              location_id: consol.destination_port || 'DEST_PORT',
              location_name: item.delivery_address || `Consignee Site: ${item.consignee_name || 'Consignee'}`,
              contact_person: item.delivery_contact || item.consignee_name || undefined,
              contact_phone: item.delivery_phone || item.consignee_phone || undefined,
            },
          },
          cargo_units: [
            {
              unit_id: `unit-deconsol-${item.id}`,
              unit_type: 'CONTAINER',
              container_number: item.container_assignment?.container_number || undefined,
              iso_type: item.container_assignment?.container_type || '20GP',
              gross_weight_kg: Number(item.gross_weight_kg) || 1000,
            },
          ],
        };

        const deterministicKey = `idem-deconsol-lastmile-${item.id}`;

        const { dispatchResult } = await srIssuer({
          tenant_id,
          source_domain: 'FORWARDING',
          target_domain: 'TRUCKING',
          work_order_id: item.wo_item_id,
          service_product_sku: 'TRK_LAST_MILE',
          request_payload: lastMilePayload,
          idempotency_key: deterministicKey,
        });

        const deliveryJobId = dispatchResult?.domainJobId || null;

        await this.repo.updateContainerItem(item.id, {
          last_mile_wo_id: deliveryJobId,
          is_deconsoled: true,
          deconsoled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (deliveryJobId) {
          deliveryJobsCreated.push(deliveryJobId);
        }
      } else {
        await this.repo.updateContainerItem(item.id, {
          is_deconsoled: true,
          deconsoled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    for (const container of containers) {
      await this.repo.updateContainerAssignment(container.id, {
        status: 'deconsoled',
        updated_at: new Date().toISOString(),
      });
    }

    const newStatus = deliveryJobsCreated.length > 0 ? 'deconsol_done' : 'closed';
    await this.repo.updateConsolidation(consolId, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    });

    return {
      consol_id: consolId,
      delivery_jobs_count: deliveryJobsCreated.length,
      delivery_jobs_created: deliveryJobsCreated,
    };
  }
}
