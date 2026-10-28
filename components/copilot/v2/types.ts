// Message types
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'understanding' | 'result' | 'proposal' | 'confirmation' | 'error' | 'loading';

export interface CopilotMessage {
  id: string;
  role: MessageRole;
  type: MessageType;
  content?: string;
  timestamp: Date;
  understanding?: UnderstandingBlock;
  results?: ResultBlock;
  proposal?: ProposalBlock;
  entityRefs?: EntityReference[];
  dataSource?: 'SIMULATED' | 'LIVE_READ' | 'PROPOSED' | 'NOT_EXECUTED';
  isExecuted?: boolean;
}

// Understanding block - shows how Copilot parsed the user's intent
export interface UnderstandingBlock {
  customer?: string;
  object?: string;
  condition?: string;
  period?: string;
  filters?: Record<string, string>;
}

// Result block
export interface ResultBlock {
  type: 'shipments' | 'orders' | 'customers' | 'jobs' | 'exceptions' | 'timeline' | 'generic';
  count: number;
  summary: string;
  items?: ResultItem[];
}

export interface ResultItem {
  id: string;
  label: string;
  status: string;
  statusColor: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  meta?: Record<string, string>;
}

// Proposal block
export interface ProposalBlock {
  id: string;
  title: string;
  description: string;
  intent: string;
  entityId: string;
  entityType: string;
  changes: ProposalChange[];
  reason?: string;
  executionAvailable: false; // ALWAYS false in prototype
  target?: string;
  action?: string;
  proposal?: boolean;
  isExecuted?: boolean;
  draftPayload?: any;
  requiresApproval?: boolean;
}

export interface ProposalChange {
  field: string;
  from: string;
  to: string;
}

// Entity references for contextual links
export type EntityType = 'customer' | 'sales-order' | 'work-order' | 'work-order-item' | 'fulfillment' | 'shipment' | 'job-order' | 'service-request' | 'exception' | 'document' | 'timeline-event' | 'invoice';

export interface EntityReference {
  type: EntityType;
  id: string;
  label: string;
  status?: string;
  statusColor?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

// Detail panel types
export interface DetailPanelState {
  type: EntityType | 'empty';
  entity?: EntityDetail;
}

export interface EntityDetail {
  type: EntityType;
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  statusColor: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  fields: DetailField[];
  timeline?: TimelineEvent[];
  evidence?: EvidenceItem[];
  navigationRoute?: string;
}

export interface DetailField {
  label: string;
  value: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description?: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

export interface EvidenceItem {
  id: string;
  type: 'event' | 'document' | 'photo';
  title: string;
  description?: string;
  date: string;
}

// Suggested prompt
export interface SuggestedPrompt {
  label: string;
  icon?: string;
  query: string;
}

// Conversation
export interface Conversation {
  id: string;
  messages: CopilotMessage[];
  createdAt: Date;
}

export interface RecentConversationItem {
  id: string;
  scope?: 'cs' | 'sbu' | 'general';
  title: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  contextSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}
