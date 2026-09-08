/**
 * Sentralogis — Phase 4B / U-18
 * lib/operational-handoff/adapters/index.ts
 *
 * Operational Handoff Adapter Registry.
 */

import { TargetDomain, OperationalHandoffError } from '../types';
import { OperationalHandoffAdapter } from './types';
import { ForwardingHandoffAdapter } from './forwarding';
import { CustomsHandoffAdapter } from './customs';
import { TruckingHandoffAdapter } from './trucking';
import { WarehouseHandoffAdapter } from './warehouse';

const adapters: Record<TargetDomain, OperationalHandoffAdapter> = {
  FORWARDING: new ForwardingHandoffAdapter(),
  CUSTOMS: new CustomsHandoffAdapter(),
  TRUCKING: new TruckingHandoffAdapter(),
  WAREHOUSE: new WarehouseHandoffAdapter(),
};

export function getOperationalHandoffAdapter(domain: TargetDomain): OperationalHandoffAdapter {
  const adapter = adapters[domain];
  if (!adapter) {
    throw new OperationalHandoffError(
      'INVALID_TARGET_DOMAIN',
      `No operational handoff adapter registered for domain: ${domain}`,
    );
  }
  return adapter;
}

export * from './types';
export * from './forwarding';
export * from './customs';
export * from './trucking';
export * from './warehouse';
