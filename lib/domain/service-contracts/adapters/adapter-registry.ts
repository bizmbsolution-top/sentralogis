/**
 * Sentralogis Target Architecture v1.0
 * Domain: Cross-Domain Service Contracts
 * File: lib/domain/service-contracts/adapters/adapter-registry.ts
 * Description: Pluggable Adapter Registry managing SBU capability executors
 */

import { ServiceRequestAdapter } from './service-request-adapter.interface';
import { TruckingServiceRequestAdapter } from './trucking-adapter';
import { CustomsServiceRequestAdapter } from './customs-adapter';
import { WarehouseServiceRequestAdapter } from './warehouse-adapter';
import { ServiceTargetDomain } from '../types';
import { CapabilityNotSupportedError } from '../errors';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<ServiceTargetDomain, ServiceRequestAdapter[]> = new Map();

  private constructor() {
    // Register default core SBU adapters
    this.register(new TruckingServiceRequestAdapter());
    this.register(new CustomsServiceRequestAdapter());
    this.register(new WarehouseServiceRequestAdapter());
  }

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  public register(adapter: ServiceRequestAdapter): void {
    const list = this.adapters.get(adapter.targetDomain) || [];
    list.push(adapter);
    this.adapters.set(adapter.targetDomain, list);
  }

  public getAdapter(targetDomain: ServiceTargetDomain, serviceProductSku: string): ServiceRequestAdapter {
    const list = this.adapters.get(targetDomain);
    if (!list || list.length === 0) {
      throw new CapabilityNotSupportedError(targetDomain, serviceProductSku);
    }

    const matchedAdapter = list.find(a => a.supports(serviceProductSku));
    if (!matchedAdapter) {
      // If no specific SKU matcher, fallback to the first domain adapter if available
      return list[0];
    }

    return matchedAdapter;
  }
}
