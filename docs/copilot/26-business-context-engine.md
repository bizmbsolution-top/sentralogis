# 26 - Business Context Engine

## Overview
The Business Context Engine acts as the bridge between the Intent Validator and the Intent Resolver. Its primary responsibility is to transform raw, unstructured entity references (like "Budi" or "JO221") into strongly-typed, tenant-validated system entities.

## Responsibilities
- **Resolve business entities**: Map names, phone numbers, and partial IDs to concrete UUIDs in the database.
- **Detect ambiguities**: Pause execution if an entity reference matches multiple records.
- **Load business context**: Fetch necessary metadata to prepare the execution payload.
- **Verify tenant consistency**: Ensure every matched entity belongs to the current `IRequestContext.tenantId`.
- **Prepare execution payload**: Supply the Intent Resolver with safe, validated IDs.

## What it MUST NOT do
- Execute business rules or state mutations.
- Call Aggregate root methods.
- Save anything to Repositories.

## Architecture & Extensibility
`User -> LLM -> CopilotIntent -> Intent Validator -> Business Context Engine -> Intent Resolver -> Application Service`

The Engine utilizes a **Provider Registry Pattern**. The `EntityLookupService` maintains a registry of `IEntityLookupProvider` instances (e.g. `DriverLookupProvider`, `VehicleLookupProvider`). 

This guarantees **Generic Entity Resolution**: new entities (like Invoice, Warehouse) can be supported seamlessly without modifying the Engine's core logic. The engine delegates lookup and scoring to the appropriate provider.
