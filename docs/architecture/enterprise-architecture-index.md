# Enterprise Architecture Index v1.0

## 1. Purpose
The Enterprise Architecture Index is the primary entry point and master navigation document for the SentraForge architecture documentation suite. 

It explains how all architectural documents, catalogs, and artifacts relate to each other to form a cohesive engineering baseline. It establishes the recommended reading order for engineers, architects, AI coding assistants, new developers, and technical reviewers, ensuring a consistent understanding of domain ownership, capability evolution, and technical governance.

## 2. Architecture Hierarchy
The enterprise architecture follows a strict hierarchy of governance and implementation details:

`Enterprise Constitution`
↓
`Enterprise Capability Map`
↓
`Enterprise Domain Catalog`
↓
`Enterprise Data Catalog`
↓
`Enterprise Event Catalog`
↓
`Enterprise Repository Catalog`
↓
`Enterprise Application & API Catalog`
↓
`Enterprise Request Flow Catalog`
↓
`Enterprise UI Architecture Catalog`
↓
`Enterprise Integration Catalog`
↓
`Enterprise Deployment & Operations Blueprint`

**Responsibilities of each layer:**
- **Constitution**: Defines the immutable engineering principles.
- **Capability/Domain Catalogs**: Define *what* business functions exist and who owns them.
- **Data/Event Catalogs**: Map persistent state and state changes to their owning domains.
- **Repository/Application Catalogs**: Define *how* domains are implemented structurally.
- **Request Flow/UI/Integration**: Map the orchestration of user intent down through the application layers.

## 3. Architecture Documentation Catalog
| Document | Purpose | Ownership | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Enterprise Constitution** | Core engineering philosophy | Platform Engineering | Validated | `architecture-constitution-v1.md` |
| **Enterprise Capability Map** | Business capabilities | Platform Engineering | Validated | `enterprise-capability-map.md` |
| **Enterprise Domain Catalog** | Domain boundary definitions | Platform Engineering | Validated | `enterprise-domain-catalog.md` |
| **Enterprise Data Catalog** | Data ownership mapping | Platform Engineering | Validated | `enterprise-data-catalog.md` |
| **Enterprise Event Catalog** | Immutable business facts | Platform Engineering | Validated | `enterprise-event-catalog.md` |
| **Enterprise Application & API Catalog**| Application Service contracts | Platform Engineering | Validated | `enterprise-application-api-catalog.md` |
| **Enterprise Repository Catalog** | Persistence layer definitions | Platform Engineering | Concept | NOT VERIFIED |
| **Enterprise Request Flow Catalog** | End-to-end request tracing | Platform Engineering | Concept | NOT VERIFIED |
| **Architecture Decision Records (ADR)**| Technical decision history | SentraForge Engineering | Validated | ADR-006, ADR-007, ADR-008 |
| **Repository Validation Reports** | Structural compliance evidence | SentraForge Engineering | Validated | Phase 3A/3B Reports |
| **Migration Plans** | UI to Domain Strangler paths | SentraForge Engineering | Validated | Phase 3B Sprint Plans |

## 4. Capability Navigation Map
Mapping how to investigate specific platform capabilities:

**Identity & Permission**
↓ `Capability Map` (To understand scope)
↓ `Domain Catalog` (To see ownership)
↓ `Application Catalog` (To view contracts)
↓ Security Documentation

**Trucking JobOrder**
↓ `Domain Catalog` (Business rules)
↓ `Data Catalog` (Persistence boundaries)
↓ `Repository Catalog` (Adapter mapping)
↓ `Application Catalog` (Service boundaries)
↓ `Request Flow Catalog` (Execution path)

## 5. Domain Navigation Map
**Current Domain Status:**
- **Trucking**
  - **Status:** Production Validation Pending
  - **Evidence:** Driver Aggregate, Vehicle Aggregate, JobOrder Aggregate, JobOrderService, Repository adapters implemented in `src/domains/trucking` and `src/application/trucking`.

**Future Domains (Concepts / NOT VERIFIED):**
- Warehouse
- Depot Container
- Forwarding

## 6. Architecture Reading Order
For any new engineer, architect, or AI assistant integrating with the platform:

1. **Read Constitution**: Understand the immutable principles (Business Before Tech, Evidence Before Refactoring).
2. **Understand Capabilities**: Read the *Enterprise Capability Map* to see the landscape.
3. **Understand Domains**: Read the *Enterprise Domain Catalog* to learn boundaries.
4. **Understand Data Ownership**: Read the *Enterprise Data Catalog* to see who controls what tables.
5. **Understand Events**: Read the *Enterprise Event Catalog* to comprehend business facts.
6. **Understand Repository Boundaries**: Read the *Enterprise Repository Catalog*.
7. **Understand Application Services**: Read the *Enterprise Application & API Catalog* to find your entry points.
8. **Understand Request Flow**: Read the *Enterprise Request Flow Catalog*.
9. **Read Implementation ADRs**: Review ADR-006, ADR-007, ADR-008 for tactical implementation details.

*Why this order?* It forces the reader to understand business logic and boundaries *before* looking at technical execution, aligning with the Domain-Driven Design philosophy.

## 7. Dependency Direction Map
The SentraForge platform enforces a strict unidirectional dependency graph:

`UI` 
↓ 
`API` 
↓ 
`Application Service` 
↓ 
`Domain Aggregate` 
↓ 
`Repository Interface` 
↓ 
`Infrastructure Repository` 
↓ 
`Database`

**Forbidden Dependencies:**
- UI → Database ❌ (Bypasses all business rules)
- API → Database ❌ (Bypasses Domain/Application layers)
- Domain → Supabase ❌ (Infrastructure leak into core business logic)
- Repository → Business Rules ❌ (Persistence should be dumb)
- Event → Aggregate Mutation ❌ (Events are read-only facts)

## 8. Enterprise Capability Evolution Path
`Business Capability` 
↓ 
`Validated Domain` 
↓ 
`Reusable Capability` 
↓ 
`Shared Platform` 
↓ 
`Enterprise Platform`

Capabilities are extracted into shared platforms only after objective evidence of duplication across multiple validated domains. SentraForge explicitly prohibits premature abstraction.

## 9. Current Platform Status
| Capability | Current Owner | Status | Evidence |
| :--- | :--- | :--- | :--- |
| **Identity** | Security Platform | Validated | Supabase Auth Integration |
| **Permission** | Security Platform | Validated | `PermissionEngine` implementation |
| **Trucking** | Trucking Domain | Production Validation Pending | Complete domain/application implementation |
| **Tracking** | Future Platform | Future Recommendation | Architecture Blueprint |
| **Timeline** | Future Platform | Future Recommendation | Architecture Blueprint |
| **Attachment** | Future Platform | Future Recommendation | Architecture Blueprint |
| **Notification** | Future Platform | Concept | NOT VERIFIED |
| **Workflow** | Future Platform | Concept | NOT VERIFIED |
| **AI** | Future Platform | Concept | NOT VERIFIED |

## 10. Architecture Governance References
All architectural work within the repository is governed by:
- **SentraForge Constitution** (Enterprise Philosophy)
- **ADR-006**: Result Pattern (Error handling)
- **ADR-007**: Aggregate Pattern (Domain rules)
- **ADR-008**: Repository Pattern (Persistence isolation)

Every future Domain, API, Repository, Migration, Platform, and AI-generated implementation **must** comply with these foundational rules.

## 11. AI Development Guidance
All AI coding assistants generating or modifying code in this repository MUST:
- **Read the Constitution first.**
- **Understand Capability ownership.**
- **Respect Domain boundaries** (never cross-contaminate Aggregates).
- **Never create premature abstraction.**
- **Never bypass Application Services.**
- **Never write direct database mutations from UI.**
- **Preserve backward compatibility** during Strangler Fig migrations.

## 12. Future Architecture Roadmap
The strategic evolution path based on objective triggers:

`Current: Trucking UI Migration`
↓
`Tracking Platform` (Trigger: Cross-domain telemetry needs)
↓
`Timeline Platform` (Trigger: Audit compliance requirements)
↓
`Attachment Platform (POD)` (Trigger: Standardized document storage)
↓
`Notification Platform` (Trigger: Cross-domain user alerting)
↓
`Workflow Platform` (Trigger: Second operational domain migration)

## 13. Architecture Maturity Assessment
| Area | Status | Evidence |
| :--- | :--- | :--- |
| **Architecture Governance** | Validated | Full catalog suite established |
| **Trucking Domain** | Production Validation Pending | Functionally complete codebase |
| **Warehouse** | Concept | NOT VERIFIED |
| **Forwarding** | Concept | NOT VERIFIED |
| **Future Platforms** | Future Recommendation | Blueprints drafted |

## 14. Executive Summary
The SentraForge architecture is intrinsically capability-driven. Domains own their respective business processes, while Shared Platforms emerge strictly from validated operational duplication. The **Trucking** domain currently acts as the reference implementation, proving the validity of the Application Layer and Domain models. Future expansion into Warehouse and Forwarding will follow these established patterns. There are currently no architectural blockers existing within the validated scope.

## 15. Certification Status

### Certification Status
- Enterprise Architecture Index: Validated
- Documentation Governance: Established
- Architecture Navigation: Complete
- Operational Readiness: Production Validation Pending
- Recommended Next Phase: Phase 3D – Tracking Platform
