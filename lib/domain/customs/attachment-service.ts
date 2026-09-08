/**
 * Sentralogis Target Architecture v1.0 — Phase 4A
 * Domain: Customs Clearance — Cross-Domain Attachment
 * File: lib/domain/customs/attachment-service.ts
 * Description: Progressive cross-domain reference attachment for customs declarations
 *
 * ADR-021: Attachment commands are idempotent, tenant-safe, conflict-aware.
 *
 * DOMAIN BOUNDARY RULES:
 *   ✅ CAN read from shp_shipments (verify tenant)
 *   ✅ CAN read from job_orders (verify tenant)
 *   ✅ CAN write to cus_declarations (set FK columns only)
 *   ❌ CANNOT write to shp_shipments
 *   ❌ CANNOT write to job_orders
 *   ❌ CANNOT write to commercial_work_orders
 */

import { CustomsDeclaration } from './types';
import {
  AttachShipmentCommand,
  AttachTruckingCommand,
  AttachmentResult,
} from '../commercial/types';

// ============================================================================
// ATTACHMENT SERVICE
// ============================================================================

export class CustomsAttachmentService {
  /**
   * Attaches a shipment reference to an existing customs declaration.
   *
   * Behavior (ADR-021):
   * - If shipment_id is NULL → sets it → ATTACHED
   * - If shipment_id is already the same value → no-op → ALREADY_ATTACHED
   * - If shipment_id is set to a different value → CONFLICT (never silent overwrite)
   * - Cross-tenant → FORBIDDEN
   *
   * Does NOT recreate the declaration. Only sets FK columns.
   */
  public static attachShipment(
    declaration: CustomsDeclaration,
    command: AttachShipmentCommand,
    /** Shipment tenant_id for cross-tenant verification */
    shipmentTenantId: string
  ): AttachmentResult {
    // Cross-tenant guard
    if (declaration.tenant_id !== command.tenant_id) {
      return {
        success: false,
        action: 'FORBIDDEN',
        declaration_id: declaration.id,
        reference_type: 'SHIPMENT',
        reference_id: command.shipment_id,
        message: 'Declaration tenant does not match command tenant',
      };
    }
    if (shipmentTenantId !== command.tenant_id) {
      return {
        success: false,
        action: 'FORBIDDEN',
        declaration_id: declaration.id,
        reference_type: 'SHIPMENT',
        reference_id: command.shipment_id,
        message: 'Cross-tenant shipment attachment is forbidden',
      };
    }

    // Idempotent check: already attached to the same shipment
    if (declaration.shipment_id === command.shipment_id) {
      return {
        success: true,
        action: 'ALREADY_ATTACHED',
        declaration_id: declaration.id,
        reference_type: 'SHIPMENT',
        reference_id: command.shipment_id,
        message: 'Declaration is already attached to this shipment',
      };
    }

    // Conflict detection: attached to a DIFFERENT shipment
    if (declaration.shipment_id && declaration.shipment_id !== command.shipment_id) {
      return {
        success: false,
        action: 'CONFLICT',
        declaration_id: declaration.id,
        reference_type: 'SHIPMENT',
        reference_id: command.shipment_id,
        message: `Declaration is already attached to shipment ${declaration.shipment_id}. Detach first before reassigning.`,
      };
    }

    // Attach: shipment_id was NULL → set it
    return {
      success: true,
      action: 'ATTACHED',
      declaration_id: declaration.id,
      reference_type: 'SHIPMENT',
      reference_id: command.shipment_id,
      message: 'Shipment successfully attached to customs declaration',
    };
  }

  /**
   * Attaches a trucking job order reference to an existing customs declaration.
   *
   * Same idempotent + conflict-aware semantics as attachShipment.
   */
  public static attachTrucking(
    declaration: CustomsDeclaration,
    command: AttachTruckingCommand,
    /** Job order tenant_id for cross-tenant verification */
    jobOrderTenantId: string
  ): AttachmentResult {
    // Cross-tenant guard
    if (declaration.tenant_id !== command.tenant_id) {
      return {
        success: false,
        action: 'FORBIDDEN',
        declaration_id: declaration.id,
        reference_type: 'TRUCKING',
        reference_id: command.job_order_id,
        message: 'Declaration tenant does not match command tenant',
      };
    }
    if (jobOrderTenantId !== command.tenant_id) {
      return {
        success: false,
        action: 'FORBIDDEN',
        declaration_id: declaration.id,
        reference_type: 'TRUCKING',
        reference_id: command.job_order_id,
        message: 'Cross-tenant trucking attachment is forbidden',
      };
    }

    // Idempotent check
    if (declaration.job_order_id === command.job_order_id) {
      return {
        success: true,
        action: 'ALREADY_ATTACHED',
        declaration_id: declaration.id,
        reference_type: 'TRUCKING',
        reference_id: command.job_order_id,
        message: 'Declaration is already attached to this job order',
      };
    }

    // Conflict detection
    if (declaration.job_order_id && declaration.job_order_id !== command.job_order_id) {
      return {
        success: false,
        action: 'CONFLICT',
        declaration_id: declaration.id,
        reference_type: 'TRUCKING',
        reference_id: command.job_order_id,
        message: `Declaration is already attached to job order ${declaration.job_order_id}. Detach first before reassigning.`,
      };
    }

    // Attach
    return {
      success: true,
      action: 'ATTACHED',
      declaration_id: declaration.id,
      reference_type: 'TRUCKING',
      reference_id: command.job_order_id,
      message: 'Trucking job order successfully attached to customs declaration',
    };
  }

  /**
   * Applies a successful attachment result to the declaration entity.
   * Returns a new declaration with the reference set. Does NOT mutate the original.
   */
  public static applyAttachment(
    declaration: CustomsDeclaration,
    result: AttachmentResult
  ): CustomsDeclaration {
    if (!result.success || result.action !== 'ATTACHED') {
      return declaration; // No change for idempotent/conflict/forbidden
    }

    const now = new Date().toISOString();
    const updated = { ...declaration, updated_at: now };

    if (result.reference_type === 'SHIPMENT') {
      updated.shipment_id = result.reference_id;
    } else if (result.reference_type === 'TRUCKING') {
      updated.job_order_id = result.reference_id;
    }

    return updated;
  }
}
