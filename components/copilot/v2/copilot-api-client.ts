/**
 * Sentralogis Copilot V2 — Canonical Backend Client Transport
 * components/copilot/v2/copilot-api-client.ts
 *
 * Dedicated transport boundary for Copilot V2 frontend connecting to
 * canonical POST /api/copilot backend route.
 *
 * GOVERNANCE INVARIANTS:
 * 1. Strictly targets POST /api/copilot only.
 * 2. NEVER calls, references, or enables execution endpoints.
 * 3. Never sends client-supplied identity (tenantId, userId, role, permissions).
 * 4. All proposals deserialized with executionAvailable: false.
 * 5. Handles network, validation (400), authentication (401), permission (403),
 *    and internal server errors (500) fail-closed.
 */

import type {
  CopilotMessage,
  ProposalBlock,
  ProposalChange,
  EntityReference,
  ResultItem,
  EntityDetail,
} from './types';

export interface CopilotApiClientOptions {
  endpoint?: string;
  conversationId?: string;
  workspace?: Record<string, any>;
  image?: {
    filename: string;
    mimeType: string;
    data: string;
  } | null;
  signal?: AbortSignal;
}

export interface CopilotTransportResult {
  messages: CopilotMessage[];
  operationalSummary?: {
    totalActiveJobs?: number;
    delayedJobs?: number;
    criticalJobs?: number;
    missingPod?: number;
    jobsAwaitingAttention?: number;
  } | null;
}

function makeMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Send user message to canonical POST /api/copilot and normalize response into CopilotMessage[].
 */
export async function sendCopilotMessage(
  text: string,
  options: CopilotApiClientOptions = {}
): Promise<CopilotTransportResult> {
  const endpoint = options.endpoint || '/api/copilot';

  // Defensive guard against non-canonical routes
  if (endpoint !== '/api/copilot') {
    throw new Error('Copilot V2 transport prohibited from calling non-canonical endpoint.');
  }

  const payload = {
    message: text,
    activeContext: {
      conversationId: options.conversationId || 'default-session',
      workspace: options.workspace || {},
    },
    image: options.image || null,
  };

  const httpMethod = 'POST';
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: httpMethod,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: options.signal,
      credentials: 'same-origin',
    });
  } catch (fetchErr: any) {
    if (fetchErr.name === 'AbortError') {
      throw fetchErr;
    }
    return {
      messages: [
        {
          id: makeMessageId(),
          role: 'assistant',
          type: 'error',
          content: 'Unable to connect to Copilot backend service. Please check your connection.',
          timestamp: new Date(),
        },
      ],
    };
  }

  // Handle HTTP status errors fail-closed
  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || errJson.message || '';
    } catch {
      // response body was not JSON
    }

    if (response.status === 401) {
      return {
        messages: [
          {
            id: makeMessageId(),
            role: 'assistant',
            type: 'error',
            content: errorDetail || 'Authentication required: session is invalid or expired. Please sign in.',
            timestamp: new Date(),
          },
        ],
      };
    }

    if (response.status === 403) {
      return {
        messages: [
          {
            id: makeMessageId(),
            role: 'assistant',
            type: 'error',
            content: errorDetail || 'Access denied: insufficient permission to access Copilot.',
            timestamp: new Date(),
          },
        ],
      };
    }

    if (response.status === 400) {
      return {
        messages: [
          {
            id: makeMessageId(),
            role: 'assistant',
            type: 'error',
            content: errorDetail || 'Invalid request provided to Copilot backend.',
            timestamp: new Date(),
          },
        ],
      };
    }

    return {
      messages: [
        {
          id: makeMessageId(),
          role: 'assistant',
          type: 'error',
          content: errorDetail || `Copilot backend error (${response.status} ${response.statusText}).`,
          timestamp: new Date(),
        },
      ],
    };
  }

  // Parse HTTP 200 payload
  let data: any;
  try {
    data = await response.json();
  } catch {
    return {
      messages: [
        {
          id: makeMessageId(),
          role: 'assistant',
          type: 'error',
          content: 'Received an invalid response format from the Copilot backend.',
          timestamp: new Date(),
        },
      ],
    };
  }

  if (!data || !data.success) {
    return {
      messages: [
        {
          id: makeMessageId(),
          role: 'assistant',
          type: 'error',
          content: data?.error || 'Copilot failed to process the command.',
          timestamp: new Date(),
        },
      ],
    };
  }

  const backendResponse = data.response;
  const operationalSummary = data.read?.operationalSummary || null;
  const messages: CopilotMessage[] = [];

  if (!backendResponse) {
    messages.push({
      id: makeMessageId(),
      role: 'assistant',
      type: 'text',
      content: 'Received empty response from Copilot.',
      timestamp: new Date(),
    });
    return { messages, operationalSummary };
  }

  // Response Type: Action Proposal
  if (backendResponse.type === 'action_proposal' && backendResponse.proposal) {
    const rawProp = backendResponse.proposal;
    const resolvedIntent = rawProp.intent || rawProp.action || 'CREATE_SALES_ORDER';
    const resolvedTitle = rawProp.description || rawProp.title || `Action: ${resolvedIntent.replace(/_/g, ' ')}`;

    const entityLabel = rawProp.customerName || rawProp.entityName || rawProp.customerId || rawProp.entityId || 'Draft Order';
    const primaryEntity = rawProp.entities?.[0] || {
      entityType: rawProp.entityType || (resolvedIntent.includes('ORDER') ? 'SalesOrder' : 'JobOrder'),
      entityId: rawProp.entityId || rawProp.customerId || entityLabel,
      displayName: entityLabel,
    };

    let changes: ProposalChange[] = [];
    if (resolvedIntent.includes('ORDER') || rawProp.customerName || rawProp.customerId) {
      const customerDisplay = rawProp.customerDisplay || (rawProp.customerCode ? `${rawProp.customerCode} — ${rawProp.customerName}` : rawProp.customerName) || rawProp.customerId || '-';
      const sbuDisplay = rawProp.sbuDisplay || (rawProp.sbuType === 'TRUCKING' ? 'Trucking' : rawProp.sbuType) || 'Trucking';
      const revDisplay = rawProp.revenue > 0 ? `IDR ${Number(rawProp.revenue).toLocaleString('id-ID')}` : 'belum diisi jika belum tersedia';

      changes = [
        { field: 'Customer', from: 'Belum dipilih', to: customerDisplay },
        { field: 'Layanan', from: 'Belum dipilih', to: sbuDisplay },
        { field: 'Lokasi Asal', from: 'Belum dipilih', to: rawProp.origin || '-' },
        { field: 'Lokasi Tujuan', from: 'Belum dipilih', to: rawProp.destination || '-' },
        { field: 'Muatan', from: 'Belum dipilih', to: rawProp.cargoDescription || '-' },
        { field: 'Jumlah', from: 'Belum dipilih', to: String(rawProp.quantity || '-') },
        { field: 'Estimasi Nilai', from: 'Belum diisi', to: revDisplay },
        { field: 'Status', from: 'Belum dibuat', to: 'Draft / Siap Ditinjau' },
      ];
    } else if (Array.isArray(rawProp.entities) && rawProp.entities.length > 0) {
      changes = rawProp.entities.map((e: any) => ({
        field: e.entityType || 'Assignment',
        from: e.from || 'Current State',
        to: e.displayName || e.entityId || 'Updated',
      }));
    } else {
      changes = [{ field: 'Action', from: 'Draf', to: resolvedIntent.replace(/_/g, ' ') }];
    }

    const proposalBlock: ProposalBlock = {
      id: rawProp.proposalId || makeMessageId(),
      title: resolvedTitle,
      description: rawProp.explainability?.summary || rawProp.description || backendResponse.content || '',
      intent: resolvedIntent,
      entityId: primaryEntity.entityId,
      entityType: primaryEntity.entityType,
      changes: changes,
      reason: rawProp.policyCheck?.reason || rawProp.explainability?.summary || 'Tinjau rincian draft sebelum menyimpan',
      executionAvailable: false, // Strict governance invariant: ALWAYS false in V2 UI
      draftPayload: rawProp,
    };

    const entityRefs: EntityReference[] = (rawProp.entities || []).map((e: any) => ({
      type: (e.entityType ? e.entityType.toLowerCase() : 'job-order') as any,
      id: e.entityId,
      label: e.displayName || e.entityId,
      status: e.status || undefined,
    }));

    messages.push({
      id: makeMessageId(),
      role: 'assistant',
      type: 'proposal',
      timestamp: new Date(),
      proposal: proposalBlock,
      entityRefs: entityRefs.length > 0 ? entityRefs : undefined,
    });
  } else if (backendResponse.type === 'timeline' && backendResponse.timeline) {
    // Response Type: Timeline
    const rawTimeline = Array.isArray(backendResponse.timeline)
      ? backendResponse.timeline
      : [backendResponse.timeline];

    const resultItems: ResultItem[] = rawTimeline.map((item: any, idx: number) => ({
      id: item.id || `TL-${idx + 1}`,
      label: item.title || item.label || 'Timeline update',
      status: item.type || 'info',
      statusColor: item.type === 'error' ? 'red' : item.type === 'warning' ? 'yellow' : 'blue',
      meta: item.date ? { date: item.date } : undefined,
    }));

    messages.push({
      id: makeMessageId(),
      role: 'assistant',
      type: 'result',
      timestamp: new Date(),
      results: {
        type: 'timeline',
        count: resultItems.length,
        summary: backendResponse.content || 'Operational timeline records retrieved.',
        items: resultItems,
      },
    });
  } else {
    // Response Type: Text / Clarification / Fallback / Live Read Summary
    const rawResults = Array.isArray((backendResponse as any).results)
      ? (backendResponse as any).results
      : [];
    const resolveRefStatusColor = (s?: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' => {
      const upper = (s || '').trim().toUpperCase();
      if (['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'VERIFIED', 'DELIVERED', 'INVOICED', 'PAID', 'CONFIRMED', 'FULFILLED', 'CLOSED'].includes(upper)) {
        return 'green';
      }
      if (upper.includes('REJECT') || upper.includes('DITOLAK') || upper.includes('CANCEL') || upper.includes('BATAL')) {
        return 'red';
      }
      if (['AWAITING_AUDIT', 'PENDING', 'WAITING_ARMADA', 'DRAFT'].includes(upper)) {
        return 'yellow';
      }
      if (['ASSIGNED', 'IN_PROGRESS', 'DELIVERING', 'PICKING_UP', 'ACCEPTED', 'TIBA DI LOKASI BONGKAR', 'DALAM PERJALANAN', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED'].includes(upper)) {
        return 'blue';
      }
      return 'gray';
    };

    const entityRefs: EntityReference[] = rawResults.slice(0, 10).map((r: any) => ({
      type: (r.entityType === 'WORK_ORDER'
        ? 'work-order'
        : r.entityType === 'SALES_ORDER'
          ? 'sales-order'
          : r.entityType === 'CUSTOMER'
            ? 'customer'
            : r.entityType === 'SHIPMENT'
              ? 'shipment'
              : 'job-order') as any,
      id: r.entityId,
      label: r.displayIdentifier || r.entityId,
      status: r.status || undefined,
      statusColor: r.status ? resolveRefStatusColor(r.status) : undefined,
    }));

    messages.push({
      id: makeMessageId(),
      role: 'assistant',
      type: 'text',
      content: backendResponse.content || 'I processed your operational inquiry.',
      timestamp: new Date(),
      dataSource: rawResults.length > 0 ? 'LIVE_READ' : undefined,
      entityRefs: entityRefs.length > 0 ? entityRefs : undefined,
    });
  }

  return { messages, operationalSummary };
}

export interface EntityDetailResult {
  success: boolean;
  data?: EntityDetail;
  error?: string;
  statusCode?: number;
}

/**
 * Fetch canonical entity detail from Unified Copilot Read Gateway:
 * GET /api/copilot/entity/[type]/[id]
 */
export async function fetchEntityDetail(
  type: string,
  id: string,
  options?: { signal?: AbortSignal },
): Promise<EntityDetailResult> {
  const endpoint = `/api/copilot/entity/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: options?.signal,
      credentials: 'same-origin',
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: body?.message || body?.error || `Failed to fetch entity details (${response.status})`,
        statusCode: response.status,
      };
    }

    if (!body || !body.success || !body.data) {
      return {
        success: false,
        error: body?.error || 'Invalid entity payload returned by Copilot gateway.',
        statusCode: response.status,
      };
    }

    return {
      success: true,
      data: body.data as EntityDetail,
      statusCode: 200,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw err;
    }
    return {
      success: false,
      error: err.message || 'Network error fetching entity details.',
      statusCode: 0,
    };
  }
}

