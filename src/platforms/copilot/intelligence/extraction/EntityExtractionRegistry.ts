import { EntityExtractionStrategy } from './EntityExtractionStrategy';
import { DriverExtractor } from './extractors/DriverExtractor';
import { VehicleExtractor } from './extractors/VehicleExtractor';
import { JobOrderExtractor } from './extractors/JobOrderExtractor';
import { ContainerExtractor } from './extractors/ContainerExtractor';
import { SealExtractor } from './extractors/SealExtractor';
import { CustomerExtractor } from './extractors/CustomerExtractor';
import { LocationExtractor } from './extractors/LocationExtractor';
import { OrganizationExtractor } from './extractors/OrganizationExtractor';

export class EntityExtractionRegistry {
  private static strategies: Map<string, EntityExtractionStrategy> = new Map();

  static register(strategy: EntityExtractionStrategy) {
    this.strategies.set(strategy.entityType, strategy);
  }

  static get(entityType: string): EntityExtractionStrategy | undefined {
    return this.strategies.get(entityType);
  }

  static loadDefaultExtractors() {
    this.register(new DriverExtractor());
    this.register(new VehicleExtractor());
    this.register(new JobOrderExtractor());
    this.register(new ContainerExtractor());
    this.register(new SealExtractor());
    this.register(new CustomerExtractor());
    this.register(new LocationExtractor());
    this.register(new OrganizationExtractor());
  }
}
