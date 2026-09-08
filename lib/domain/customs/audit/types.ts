/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: Customs Audit Trail & Decision Log Types
 * File: lib/domain/customs/audit/types.ts
 */

export type CustomsAuditEventType =
  | 'DECLARATION_CREATED'
  | 'DECLARATION_UPDATED'
  | 'ITEM_IMPORTED'
  | 'ITEM_CREATED'
  | 'ITEM_UPDATED'
  | 'ITEM_DELETED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_UPDATED'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_DELETED'
  | 'VALIDATION_STARTED'
  | 'VALIDATION_COMPLETED'
  | 'EXCEPTION_CREATED'
  | 'EXCEPTION_ACKNOWLEDGED'
  | 'EXCEPTION_RESOLVED'
  | 'EXCEPTION_REOPENED'
  | 'EXCEPTION_WAIVED'
  | 'VALUATION_REVIEWED'
  | 'VALUATION_ADJUSTED'
  | 'VALUATION_ACCEPTED'
  | 'VALUATION_REJECTED'
  | 'LARTAS_REVIEWED'
  | 'LARTAS_CONFIRMED'
  | 'LARTAS_REJECTED'
  | 'LARTAS_SOURCE_REQUIRED'
  | 'CEISA_PREPARATION_STARTED'
  | 'CEISA_VALIDATION_COMPLETED'
  | 'CEISA_PREPARATION_CREATED'
  | 'CEISA_PREPARATION_LOCKED'
  | 'DECISION_CREATED'
  | 'DECISION_APPROVED'
  | 'DECISION_REJECTED'
  | 'DECISION_ESCALATED'
  | 'SUBMISSION_READY'
  | 'SUBMISSION_BLOCKED';

export type CustomsAuditEventCategory =
  | 'DECLARATION'
  | 'ITEM'
  | 'DOCUMENT'
  | 'VALIDATION'
  | 'EXCEPTION'
  | 'VALUATION'
  | 'LARTAS'
  | 'CEISA'
  | 'DECISION'
  | 'SYSTEM';

export type CustomsActorType = 'USER' | 'SYSTEM' | 'SERVICE' | 'AUTOMATION';

export interface CustomsActor {
  id?: string | null;
  name: string;
  role: string;
  type: CustomsActorType;
}

export type CustomsStructuredDiff = Record<string, { before: any; after: any }>;

export interface CustomsAuditEvent {
  id: string;
  tenant_id: string;
  declaration_id: string;
  sequence_no: number;
  event_type: CustomsAuditEventType;
  event_category: CustomsAuditEventCategory;
  actor_type: CustomsActorType;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_role?: string | null;
  summary: string;
  diff?: CustomsStructuredDiff | null;
  entity_type?: string | null;
  entity_id?: string | null;
  evidence_references?: Record<string, any>[] | null;
  regulatory_basis?: {
    rule_code?: string;
    rule_version?: string;
    source_reference?: string;
    source_title?: string;
    source_status?: 'VERIFIED' | 'SOURCE_REQUIRED';
    effective_date?: string;
  } | null;
  event_hash: string;
  previous_event_hash?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export type CustomsDecisionType =
  | 'LARTAS_REQUIREMENT'
  | 'VALUATION_REVIEW'
  | 'EXCEPTION_WAIVER'
  | 'CLASSIFICATION_OVERRIDE'
  | 'SUBMISSION_AUTHORIZATION';

export type CustomsDecisionOutcome =
  | 'APPROVED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WAIVED'
  | 'ESCALATED'
  | 'PERMIT_REQUIRED'
  | 'PERMIT_ATTACHED';

export interface CustomsDecision {
  id: string;
  tenant_id: string;
  declaration_id: string;
  decision_number: string;
  decision_type: CustomsDecisionType;
  outcome: CustomsDecisionOutcome;
  actor_id?: string | null;
  actor_name: string;
  actor_role: string;
  reason: string;
  justification?: string | null;
  evidence?: Record<string, any> | null;
  regulatory_source?: {
    rule_code?: string;
    source_title?: string;
    source_reference?: string;
    effective_date?: string;
  } | null;
  related_item_id?: string | null;
  related_exception_id?: string | null;
  related_document_id?: string | null;
  related_prep_id?: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'MANUAL';
  status: 'ACTIVE' | 'SUPERSEDED' | 'REVOKED';
  created_at: string;
  updated_at: string;
}

export interface AuditIntegrityReport {
  status: 'VALID' | 'BROKEN';
  checkedEventsCount: number;
  genesisHash: string;
  latestHash: string;
  brokenSequenceNo?: number;
  details: string;
  checkedAt: string;
}

export interface DeclarationJourneyMilestone {
  stageId: string;
  title: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'ATTENTION_REQUIRED' | 'PENDING';
  completedAt?: string | null;
  summary: string;
  actorLabel?: string | null;
}

export interface AuditTimelineFilter {
  category?: CustomsAuditEventCategory;
  eventType?: CustomsAuditEventType;
  actorType?: CustomsActorType;
  actorQuery?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}
