/**
 * Sentralogis Copilot — Conversational Sandbox Types
 * lib/copilot/sandbox/types.ts
 *
 * Evaluation model and state types for the safe human-in-the-loop
 * Copilot testing sandbox.
 *
 * Invariant: Evaluation state is purely in-memory/session based.
 * Zero database persistence, zero Supabase tables.
 */

import type {
  CopilotMessage,
  EntityType,
  EntityReference,
  ProposalBlock,
  UnderstandingBlock,
  ResultBlock,
} from '@/components/copilot/v2/types';

// ============================================================================
// DATA BOUNDARY & LABELS
// ============================================================================

export type DataSourceLabel = 'SIMULATED' | 'LIVE_READ' | 'PROPOSED' | 'NOT_EXECUTED';

// ============================================================================
// EVALUATION DIMENSIONS (A–J)
// ============================================================================

export type EvaluationDimension =
  | 'INTENT_UNDERSTANDING'
  | 'ENTITY_EXTRACTION'
  | 'CONTEXT_RETENTION'
  | 'CLARIFICATION_QUALITY'
  | 'RESPONSE_CORRECTNESS'
  | 'HALLUCINATION_CONTROL'
  | 'AUTHORIZATION_AWARENESS'
  | 'BUSINESS_LANGUAGE'
  | 'PROPOSED_ACTION_QUALITY'
  | 'HUMAN_CORRECTION';

export const EVALUATION_DIMENSION_LABELS: Record<EvaluationDimension, { code: string; label: string; description: string }> = {
  INTENT_UNDERSTANDING: {
    code: 'A',
    label: 'Intent Understanding',
    description: 'Did Copilot correctly identify what the user wanted?',
  },
  ENTITY_EXTRACTION: {
    code: 'B',
    label: 'Entity Extraction',
    description: 'Customer, SO, WO, JO, Shipment, Driver accurately identified.',
  },
  CONTEXT_RETENTION: {
    code: 'C',
    label: 'Context Retention',
    description: 'Carried forward entities and state from earlier in the conversation.',
  },
  CLARIFICATION_QUALITY: {
    code: 'D',
    label: 'Clarification Quality',
    description: 'Asked focused questions instead of hallucinating or guessing.',
  },
  RESPONSE_CORRECTNESS: {
    code: 'E',
    label: 'Response Correctness',
    description: 'Response is completely consistent with available simulated domain data.',
  },
  HALLUCINATION_CONTROL: {
    code: 'F',
    label: 'Hallucination Control',
    description: 'Avoided inventing fake records, IDs, statuses, or driver names.',
  },
  AUTHORIZATION_AWARENESS: {
    code: 'G',
    label: 'Authorization Awareness',
    description: 'Strictly distinguishes READ / PROPOSE / EXECUTE boundaries.',
  },
  BUSINESS_LANGUAGE: {
    code: 'H',
    label: 'Business Language',
    description: 'Understands natural Indonesian logistics phrasing (belum jalan, supir, muat, dll).',
  },
  PROPOSED_ACTION_QUALITY: {
    code: 'I',
    label: 'Proposed Action Quality',
    description: 'Formulates clear, specific proposals without implying execution.',
  },
  HUMAN_CORRECTION: {
    code: 'J',
    label: 'Human Correction',
    description: 'Accepts user correction gracefully and updates context seamlessly.',
  },
};

// ============================================================================
// HUMAN EVALUATION RATINGS
// ============================================================================

export type HumanEvaluationRating = 'ACCEPT' | 'CORRECT' | 'INCORRECT' | 'NEEDS_CLARIFICATION';

export interface ResponseEvaluation {
  messageId: string;
  rating: HumanEvaluationRating;
  dimensions: Partial<Record<EvaluationDimension, boolean>>;
  correctionNote?: string;
  evaluatedAt: Date;
}

// ============================================================================
// CONVERSATIONAL CONTEXT STATE
// ============================================================================

export interface ConversationalContextState {
  activeCustomerId?: string;
  activeCustomerName?: string;
  activeSalesOrderId?: string;
  activeWorkOrderId?: string;
  activeJobOrderId?: string;
  activeShipmentId?: string;
  activeDriverId?: string;
  activeDriverName?: string;
  lastSelectedOrders?: string[];
  lastIntent?: string;
  lastTopic?: string;
  lastProposal?: ProposalBlock;
  pendingClarification?: boolean;
  clarificationSubject?: string;
  clarificationCandidates?: Array<{
    id: string;
    entityId?: string;
    type: string;
    entityType?: string;
    label?: string;
    customer?: string;
  }>;
  conversationHistory: { role: 'user' | 'assistant'; text: string }[];
  queryContext?: ConversationalQueryContext;
}

// ============================================================================
// CONVERSATIONAL QUERY CONTEXT CONTRACT (§5)
// ============================================================================

export type QueryDomain = 'TRUCKING' | 'FORWARDING' | 'COMMERCIAL' | 'FINANCE' | 'GENERAL';

export type QueryObjectType =
  | 'JOB_ORDER'
  | 'SALES_ORDER'
  | 'WORK_ORDER'
  | 'SHIPMENT'
  | 'INVOICE'
  | 'DRIVER'
  | 'TRANSPORT_MODE'
  | 'UNKNOWN';

export type QueryOperation =
  | 'FIND'
  | 'COUNT'
  | 'STATUS_CHECK'
  | 'REPLACE_DRIVER'
  | 'GENERAL_INQUIRY'
  | 'NON_OPERATIONAL';

export type QueryPeriod = 'THIS_WEEK' | 'LAST_WEEK' | 'TODAY' | 'CUSTOM';

export type QuerySpecificity =
  | 'SUFFICIENTLY_SPECIFIC'
  | 'TOO_BROAD'
  | 'AMBIGUOUS'
  | 'UNRESOLVED';

export type QueryResolutionState =
  | 'DIRECT_ANSWER'
  | 'CLARIFICATION_REQUIRED'
  | 'BROAD_SUMMARY'
  | 'NOT_FOUND'
  | 'UNKNOWN_OPERATIONAL'
  | 'UNAVAILABLE'
  | 'CONVERSATIONAL_NON_OPERATIONAL'
  | 'PROPOSAL';

export interface ConversationalQueryContext {
  domain?: QueryDomain;
  objectType?: QueryObjectType;
  requestedOperation?: QueryOperation;
  customer?: string;
  customerId?: string;
  destination?: string;
  origin?: string;
  period?: QueryPeriod;
  status?: string;
  driver?: string;
  driverId?: string;
  vehicle?: string;
  shipmentNumber?: string;
  salesOrderNumber?: string;
  jobOrderNumber?: string;
  otherResolvedEntities?: Record<string, string>;
  activeFilters: Record<string, string>;
  previousResultSet?: string[];
  unresolvedAmbiguity?: boolean;
  lastClarificationQuestion?: string;
  conversationTurn: number;
  specificity?: QuerySpecificity;
}

// ============================================================================
// SANDBOX AUTHORITATIVE SCENARIOS
// ============================================================================

export interface AuthoritativeScenario {
  id: string;
  scenarioNumber: string;
  title: string;
  userPrompt: string;
  expectedBehavior: string;
  description: string;
}

// ============================================================================
// SEMANTIC UNDERSTANDING & CONTEXT RESOLUTION CONTRACT (§4)
// ============================================================================

export type AmbiguityState = 'NONE' | 'LOW' | 'MATERIAL';
export type ClarificationRequirement = 'NOT_REQUIRED' | 'REQUIRED';
export type EntityResolutionState = 'RESOLVED' | 'AMBIGUOUS' | 'UNKNOWN';

export interface SemanticUnderstanding {
  intent: string;
  object: string;
  entity: string;
  condition: string;
  action: string;
  context: string;
  ambiguity: AmbiguityState;
  clarification: ClarificationRequirement;
  confidenceBasis?: string;
  entityResolution?: EntityResolutionState;
}

// ============================================================================
// EXTENDED SANDBOX MESSAGE
// ============================================================================

export interface SandboxMessage extends CopilotMessage {
  dataSource: DataSourceLabel;
  isExecuted: false; // Invariant: ALWAYS false
  evaluation?: ResponseEvaluation;
  clarificationNeeded?: boolean;
  semanticUnderstanding?: SemanticUnderstanding;
}

