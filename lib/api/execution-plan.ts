/**
 * Sentralogis Target Architecture v1.0
 * Domain: Forwarding & Journey Orchestration
 * File: lib/api/execution-plan.ts
 * Description: Client API Helper for Canonical Execution Plan and Multi-Modal Legs
 */

import {
  ExecutionPlan,
  ExecutionLeg,
  LegUnitAllocation,
  CreateExecutionLegDTO
} from '@/lib/domain/shipment/types';

export interface ExecutionPlanResponse {
  success: boolean;
  data: {
    execution_plan: ExecutionPlan | null;
    legs: ExecutionLeg[];
    allocations: LegUnitAllocation[];
  };
}

/**
 * Loads the active Execution Plan, legs, and unit allocations for a shipment
 */
export async function fetchExecutionPlan(shipmentId: string): Promise<ExecutionPlanResponse['data']> {
  const res = await fetch(`/api/v1/forwarding/shipments/${shipmentId}/execution-plan`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to fetch execution plan (HTTP ${res.status})`);
  }

  return json.data;
}

/**
 * Creates or replaces the entire Execution Plan with ordered legs atomically
 */
export async function saveOrReplaceExecutionPlan(
  shipmentId: string,
  legs: CreateExecutionLegDTO[]
): Promise<ExecutionPlanResponse['data']> {
  const res = await fetch(`/api/v1/forwarding/shipments/${shipmentId}/execution-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ legs })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to save execution plan (HTTP ${res.status})`);
  }

  return json.data;
}

/**
 * Appends a new Execution Leg to the shipment's active plan
 */
export async function addExecutionLeg(
  shipmentId: string,
  leg: CreateExecutionLegDTO
): Promise<ExecutionLeg> {
  const res = await fetch(`/api/v1/forwarding/shipments/${shipmentId}/legs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leg)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to add execution leg (HTTP ${res.status})`);
  }

  return json.data as ExecutionLeg;
}

/**
 * Updates an existing execution leg (status, schedule, route, provider)
 */
export async function updateExecutionLeg(
  shipmentId: string,
  legId: string,
  updates: Partial<ExecutionLeg>
): Promise<ExecutionLeg> {
  const res = await fetch(`/api/v1/forwarding/shipments/${shipmentId}/legs/${legId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to update execution leg (HTTP ${res.status})`);
  }

  return json.data as ExecutionLeg;
}

/**
 * Deletes an execution leg and its unit allocations
 */
export async function deleteExecutionLeg(shipmentId: string, legId: string): Promise<void> {
  const res = await fetch(`/api/v1/forwarding/shipments/${shipmentId}/legs/${legId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to delete execution leg (HTTP ${res.status})`);
  }
}

/**
 * Assigns cargo units to an execution leg
 */
export async function assignUnitsToLeg(
  shipmentId: string,
  legId: string,
  unitIds: string[]
): Promise<LegUnitAllocation[]> {
  const res = await fetch(`/api/v1/forwarding/shipments/${shipmentId}/legs/${legId}/units`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unit_ids: unitIds })
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to assign units to leg (HTTP ${res.status})`);
  }

  return json.data as LegUnitAllocation[];
}

/**
 * Removes a cargo unit allocation from an execution leg
 */
export async function removeUnitFromLeg(
  shipmentId: string,
  legId: string,
  unitId: string
): Promise<void> {
  const res = await fetch(`/api/v1/forwarding/shipments/${shipmentId}/legs/${legId}/units/${unitId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Failed to remove unit from leg (HTTP ${res.status})`);
  }
}
