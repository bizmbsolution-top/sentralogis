# Shim Migration Strategy

> Phase 1A Foundation Hardening — Legacy Compatibility Layer

## Purpose

The shim layer provides backward compatibility during the migration from the legacy
flat `lib/` directory structure to the new domain-driven `src/` structure. Shim files
are thin re-export modules that allow existing code to continue using `@/lib/...`
import paths while the actual implementations remain in the root `lib/` directory.

## Why Shims?

The project uses TypeScript path aliases configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

With `baseUrl` set to `./src`, an import like `@/lib/correlation` resolves to
`src/lib/correlation.ts`. However, the actual implementation lives at
`lib/correlation.ts` (project root). Without shims, TypeScript reports
`TS2307: Cannot find module` errors.

Shim files bridge this gap by re-exporting the legacy module:

```ts
// src/lib/correlation.ts (shim)
export * from "../../lib/correlation";
```

## Shim Creation Rules

1. **Selective creation only** — Create shims ONLY for modules that:
   - Currently fail TypeScript compilation (`TS2307` errors)
   - Are imported by active application code
   - Have an existing legacy implementation in root `lib/`

2. **Individual files** — Each shim is a standalone file (no barrel `index.ts` export)

3. **No business logic** — Shims contain only `export * from "..."` statements

4. **No import rewriting** — Existing import paths are NOT globally rewritten

## Current Shim Files

| Shim Path (under `src/`) | Legacy Source (under root) | Created |
|---------------------------|---------------------------|---------|
| `lib/logger.ts` | `lib/logger.ts` | Phase 1A |
| `lib/alerting.ts` | `lib/alerting.ts` | Phase 1A |
| `lib/supabaseClient.ts` | `lib/supabaseClient.ts` | Phase 1A |
| `lib/correlation.ts` | `lib/correlation.ts` | Phase 1A |
| `lib/supabase/client.ts` | `lib/supabase/client.ts` | Phase 1A |
| `lib/utils/dashboardRoute.ts` | `lib/utils/dashboardRoute.ts` | Phase 1A |
| `lib/domain/jo/assignment.ts` | `lib/domain/jo/assignment.ts` | Phase 1A |
| `lib/domain/driver/readiness.ts` | `lib/domain/driver/readiness.ts` | Phase 1A |
| `lib/workflow/registry.ts` | `lib/workflow/registry.ts` | Phase 1A |
| `lib/hooks/useAuth.ts` | `lib/hooks/useAuth.ts` | Phase 1A |

## Temporary Type Declarations

Minimal placeholder types were added under `src/types/` to satisfy compilation:

| Type File | Types Provided | Status |
|-----------|---------------|--------|
| `types/enterprise.ts` | `WorkOrder`, `WorkOrderItem`, `JobOrder`, `Organization`, `InventoryLedgerEntry`, etc. | Temporary — replace during domain migration |

## Migration Timeline

### Phase 1A (Current) — Foundation
- Create shim files for broken imports
- Add temporary type declarations
- Validate TypeScript compilation

### Phase 1B — Domain Extraction
- Move business logic from `lib/` to `src/domains/`
- Replace shims with direct imports to new locations
- Replace temporary types with domain entity types

### Phase 2 — Cleanup
- Remove all shim files
- Remove `src/lib/shims/` directory
- Update `tsconfig.json` to remove legacy path support

## Removal Criteria

A shim file can be removed when ALL of the following conditions are met:

1. The legacy module has been migrated to its final location under `src/domains/`
2. All imports referencing the shim path have been updated to the new location
3. TypeScript compilation passes without the shim
4. The application builds and deploys successfully

## Directory Structure

```
src/
├── lib/
│   ├── logger.ts              ← shim → ../../lib/logger
│   ├── alerting.ts            ← shim → ../../lib/alerting
│   ├── correlation.ts         ← shim → ../../lib/correlation
│   ├── supabaseClient.ts      ← shim → ../../lib/supabaseClient
│   ├── supabase/
│   │   └── client.ts          ← shim → ../../../lib/supabase/client
│   ├── utils/
│   │   └── dashboardRoute.ts  ← shim → ../../../lib/utils/dashboardRoute
│   ├── domain/
│   │   ├── jo/
│   │   │   └── assignment.ts  ← shim → ../../../../lib/domain/jo/assignment
│   │   └── driver/
│   │       └── readiness.ts   ← shim → ../../../../lib/domain/driver/readiness
│   ├── workflow/
│   │   └── registry.ts        ← shim → ../../../lib/workflow/registry
│   ├── hooks/
│   │   └── useAuth.ts         ← shim → ../../../lib/hooks/useAuth
│   ├── shims/                 ← Reference directory (duplicates being cleaned up)
│   └── api/
│       └── request.ts         ← New API contract (not a shim)
├── types/
│   ├── enterprise.ts          ← Temporary type declarations
│   └── ...
└── domains/                   ← Future domain modules
```
