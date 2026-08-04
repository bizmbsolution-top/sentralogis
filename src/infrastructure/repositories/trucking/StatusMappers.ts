/**
 * Legacy Status Mapping Utilities
 * 
 * The legacy database uses lowercase string statuses (e.g., 'available', 'on_duty', 'pending').
 * The domain layer uses typed enums (e.g., DriverStatus.AVAILABLE, JobOrderStatus.ASSIGNED).
 * 
 * These mappers translate between the two representations.
 * They exist ONLY in the infrastructure layer.
 */

import { DriverStatus } from '../../../domains/trucking/driver/Driver';
import { VehicleStatus } from '../../../domains/trucking/vehicle/Vehicle';
import { JobOrderStatus } from '../../../domains/trucking/job-order/JobOrderStatus';

// ─── Driver Status ────────────────────────────────────────────────────────────

const LEGACY_TO_DRIVER_STATUS: Record<string, DriverStatus> = {
  'available': DriverStatus.AVAILABLE,
  'on_duty': DriverStatus.ON_DUTY,
  'on_road': DriverStatus.ON_DUTY,
  'unavailable': DriverStatus.UNAVAILABLE,
  'off_duty': DriverStatus.UNAVAILABLE,
};

const DRIVER_STATUS_TO_LEGACY: Record<DriverStatus, string> = {
  [DriverStatus.AVAILABLE]: 'available',
  [DriverStatus.ON_DUTY]: 'on_duty',
  [DriverStatus.UNAVAILABLE]: 'unavailable',
};

/**
 * Maps legacy DB driver status string to domain enum.
 * Legacy aliases: 'on_road' → ON_DUTY, 'off_duty' → UNAVAILABLE
 * Unknown values are logged and default to UNAVAILABLE.
 */
export function mapLegacyToDriverStatus(legacy: string): DriverStatus {
  const mapped = LEGACY_TO_DRIVER_STATUS[legacy];
  if (mapped === undefined) {
    console.warn(`[StatusMapper] Unknown legacy driver status: '${legacy}', defaulting to UNAVAILABLE`);
    return DriverStatus.UNAVAILABLE;
  }
  return mapped;
}

export function mapDriverStatusToLegacy(status: DriverStatus): string {
  return DRIVER_STATUS_TO_LEGACY[status] ?? 'unavailable';
}

// ─── Vehicle Status ───────────────────────────────────────────────────────────

const LEGACY_TO_VEHICLE_STATUS: Record<string, VehicleStatus> = {
  'available': VehicleStatus.AVAILABLE,
  'on_road': VehicleStatus.IN_USE,
  'on_duty': VehicleStatus.IN_USE,
  'maintenance': VehicleStatus.MAINTENANCE,
};

const VEHICLE_STATUS_TO_LEGACY: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: 'available',
  [VehicleStatus.IN_USE]: 'on_road',
  [VehicleStatus.MAINTENANCE]: 'maintenance',
};

/**
 * Maps legacy DB vehicle (fleet) status string to domain enum.
 * Legacy aliases: 'on_duty' → IN_USE
 * Unknown values are logged and default to MAINTENANCE.
 */
export function mapLegacyToVehicleStatus(legacy: string): VehicleStatus {
  const mapped = LEGACY_TO_VEHICLE_STATUS[legacy];
  if (mapped === undefined) {
    console.warn(`[StatusMapper] Unknown legacy vehicle status: '${legacy}', defaulting to MAINTENANCE`);
    return VehicleStatus.MAINTENANCE;
  }
  return mapped;
}

export function mapVehicleStatusToLegacy(status: VehicleStatus): string {
  return VEHICLE_STATUS_TO_LEGACY[status] ?? 'available';
}

// ─── JobOrder Status ──────────────────────────────────────────────────────────

const LEGACY_TO_JO_STATUS: Record<string, JobOrderStatus> = {
  'pending': JobOrderStatus.PENDING_ASSIGNMENT,
  'assigned': JobOrderStatus.ASSIGNED,
  'driver_accepted': JobOrderStatus.DRIVER_ACCEPTED,
  'in_progress': JobOrderStatus.IN_PROGRESS,
  'delivered': JobOrderStatus.DELIVERED,
  'pod_submitted': JobOrderStatus.POD_SUBMITTED,
  'completed': JobOrderStatus.COMPLETED,
  'cancelled': JobOrderStatus.CANCELLED,
};

const JO_STATUS_TO_LEGACY: Record<JobOrderStatus, string> = {
  [JobOrderStatus.PENDING_ASSIGNMENT]: 'pending',
  [JobOrderStatus.ASSIGNED]: 'assigned',
  [JobOrderStatus.DRIVER_ACCEPTED]: 'driver_accepted',
  [JobOrderStatus.IN_PROGRESS]: 'in_progress',
  [JobOrderStatus.DELIVERED]: 'delivered',
  [JobOrderStatus.POD_SUBMITTED]: 'pod_submitted',
  [JobOrderStatus.COMPLETED]: 'completed',
  [JobOrderStatus.CANCELLED]: 'cancelled',
};

/**
 * Maps legacy DB job order status string to domain enum.
 * Unknown values are logged and default to PENDING_ASSIGNMENT.
 */
export function mapLegacyToJobOrderStatus(legacy: string): JobOrderStatus {
  const mapped = LEGACY_TO_JO_STATUS[legacy];
  if (mapped === undefined) {
    console.warn(`[StatusMapper] Unknown legacy job order status: '${legacy}', defaulting to PENDING_ASSIGNMENT`);
    return JobOrderStatus.PENDING_ASSIGNMENT;
  }
  return mapped;
}

export function mapJobOrderStatusToLegacy(status: JobOrderStatus): string {
  return JO_STATUS_TO_LEGACY[status] ?? 'pending';
}
