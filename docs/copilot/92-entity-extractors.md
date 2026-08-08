# 92. Modular Entity Extractors

Entity extractors implement the `EntityExtractionStrategy` interface.

## Supported Extractors
1. `DriverExtractor`
2. `VehicleExtractor`
3. `JobOrderExtractor`
4. `ContainerExtractor`
5. `SealExtractor`
6. `CustomerExtractor`
7. `LocationExtractor`
8. `OrganizationExtractor`

Each extractor handles a single entity type and encapsulates the logic to find, normalize, and optionally validate that entity against domain data sources (e.g., verifying a Driver exists in the database).
