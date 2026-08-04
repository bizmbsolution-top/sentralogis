# POD Platform Architecture Blueprint

## 1. Problem Statement
Proof of Delivery (POD) is a critical operational artifact across almost all logistics operations. Currently, the Trucking JobOrder implementation handles POD completion as a simple boolean-like state transition (`submitPOD()`). It does not track, validate, or encapsulate any details about the POD document itself, nor does it define metadata about the delivery execution (e.g., receiver name, timestamp, signature, or geo-coordinates). To scale to an Enterprise Logistics Platform, POD must be treated as a distinct, rich domain entity rather than just a state transition on a Job Order.

## 2. Current Implementation and Limitations
**Current Code:**
```typescript
public submitPOD(): Result<void> {
  if (this.props.status !== JobOrderStatus.DELIVERED) {
    return Result.fail<void>('JobOrder must be DELIVERED to submit POD.');
  }
  
  this.props.status = JobOrderStatus.POD_SUBMITTED;
  return Result.ok<void>();
}
```

**Identified Limitations:**
- **No Evidence Traceability:** The Aggregate transitions state without receiving or validating any proof that a delivery actually occurred.
- **Missing Metadata:** No encapsulation of critical delivery data: Who received it? When? Where (GPS)? Was there damage?
- **Platform Coupling Risk:** If we were to naively add a `pod_photo_url` to `submitPOD()`, we would couple the core Domain Aggregate directly to a specific cloud storage bucket URL or infrastructure implementation.

## 3. Proposed Architecture
We propose introducing a standalone **Attachment Platform** and a specific **POD Entity** within the Domain.

### Architecture Topology
`[JobOrder Aggregate]` references `[POD Entity ID]`
`[POD Entity]` contains `[Delivery Metadata]` + references `[Attachment Platform ID]`
`[Attachment Platform]` manages `[Storage Locations]`, `[MIME Types]`, `[File Lifecycles]`

### Target Metadata Model
```typescript
interface PODMetadata {
  receiverName: string;
  receivedAt: Date;
  gpsCoordinates: { latitude: number; longitude: number };
  condition: 'GOOD' | 'DAMAGED' | 'SHORTAGE';
  notes?: string;
}

interface PODEntity {
  id: string; // Unique POD ID
  jobOrderId: string; // The parent job
  metadata: PODMetadata;
  attachmentId: string; // Reference to the Attachment Platform
  signatureAttachmentId?: string; // Optional digital signature
}
```

### Future Aggregate Interface
The `JobOrder` Aggregate's method will evolve to require a valid POD identity or entity to satisfy the transition, rather than receiving file URLs or blobs.

```typescript
// Proposed Interface
public submitPOD(podId: string): Result<void> {
  if (this.props.status !== JobOrderStatus.DELIVERED) {
    return Result.fail<void>('JobOrder must be DELIVERED to submit POD.');
  }
  if (!podId || podId.trim() === '') {
    return Result.fail<void>('A valid POD identity must be provided.');
  }
  
  this.props.podId = podId;
  this.props.status = JobOrderStatus.POD_SUBMITTED;
  return Result.ok<void>();
}
```

## 4. Migration Strategy
1. **Develop Attachment Platform:** Build an infrastructure-agnostic service that handles file uploads (S3, Supabase Storage, etc.) and returns abstract `attachmentId`s.
2. **Introduce POD Entity:** Create the `PODEntity` in the Domain model and the corresponding persistence schema (`pod_records` table).
3. **Refactor Aggregate:** Update `JobOrder.submitPOD()` to accept the `podId`.
4. **Update Application Services:** Refactor `JobOrderService.submitPOD` to orchestrate the creation of the `PODEntity` first (via a factory/repository), and then pass its ID into the `JobOrder` aggregate.

## 5. Backward Compatibility & Risks
- **Backward Compatibility:** The UI can remain completely backward compatible. The driver app still uploads an image; the API route handles sending that image to the Attachment Platform, creates the POD Entity, and invokes the Service. The client does not need to know about the abstraction layer.
- **Risks:** Developing a full Attachment Platform is a significant infrastructural effort. It should not be blocked on the immediate Trucking UI migration, but rather scheduled as a foundational epic (likely Phase 4).
