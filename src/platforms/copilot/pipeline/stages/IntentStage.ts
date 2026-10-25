import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';
import { IntentResolver } from '../../resolver/IntentResolver';
import { MemoryResolver } from '../../memory/MemoryResolver';
import { ConversationalQueryResolver, type IdentityIntent } from '@/lib/copilot/sandbox/conversational-query-resolver';
import { OperationalLiveReadGateway } from '@/lib/copilot/read/operational-live-read-gateway';
import { EntitySearchProvider } from '@/lib/copilot/read/entity-provider';
import { assertPermission, assertAnyPermission } from '@/lib/application/identity/resolver';
import { createFoundationContext } from '@/lib/copilot/foundation/integration';
import { ConversationalOrderWorkspace } from '@/lib/copilot/workflow/conversational-order-workspace';
import { CustomerIntentHandler } from '@/lib/copilot/customer/customer-intent-handler';
import type { UserContext } from '@/src/platforms/copilot/context/UserContext';
import type { IdentityContext } from '@/lib/application/identity/types';

export class IntentStage implements PipelineStage {
  readonly name = 'IntentResolution';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    // 1. Resolve contextual references first
    context.userInput = MemoryResolver.resolveReferences(context.userInput, context.context);

    // 2-IDENTITY. Identity-aware conversational classification (Phase 1 remediation).
    // Evaluated BEFORE greeting/chatter detection so the identity semantic of a
    // combined input (e.g. "halo, siapa saya?") is never swallowed by the greeting
    // handler, and identity questions never fall through to default FIND →
    // OperationalLiveReadGateway. The response is derived ONLY from the
    // server-resolved IdentityContext — never hardcoded, never fabricated.
    const identityIntent = ConversationalQueryResolver.getIdentityIntent(context.userInput);
    if (identityIntent) {
      context.finalResponse = {
        type: 'text',
        content: IntentStage.buildIdentityResponse(identityIntent, context.identity, context.context?.user),
        metrics: undefined as any,
      };
      return { status: PipelineStatus.SUCCESS };
    }

    // 2A. Check for non-operational conversational chat (greetings/chatter)
    if (ConversationalQueryResolver.isNonOperational(context.userInput)) {
      context.finalResponse = {
        type: 'text',
        content: 'Halo! Saya Sentralogis Copilot. Saya siap membantu Anda memeriksa data Job Order, Work Order, Shipment, Sales Order, Customer, maupun memverifikasi rencana operasional armada. Ada data atau transaksi yang ingin Anda periksa?',
        metrics: undefined as any
      };
      return { status: PipelineStatus.SUCCESS };
    }

    // 2B. Check if input is an order initiation intent OR active guided flow continuation (Guided Flow A)
    const isOrderInitiation = ConversationalOrderWorkspace.isOrderInitiationIntent(context.userInput);
    const conversationId = context.context?.conversation?.getConversationId ? context.context.conversation.getConversationId() : undefined;
    const contextFlow = context.context?.conversation?.getMemory ? context.context.conversation.getMemory('orderFlowState') : null;
    const activeOrderFlow = contextFlow || (context.identity ? ConversationalOrderWorkspace.getSessionState(context.identity, undefined, conversationId) : null);

    // 2C. Check if input is an operational read query
    // Use normalized-for-classification text so a leading greeting does not
    // suppress operational intent detection (e.g. "halo, tampilkan semua user
    // dari semua tenant." must still route to the read path).
    const normalizedUserInput = ConversationalQueryResolver.normalizeForClassification(context.userInput);
    const parsedQuery = ConversationalQueryResolver.resolveQueryContext(normalizedUserInput);
    const isExplicitMutationVerb = /^(assign|tugaskan|ganti|replace|batalkan|cancel)\b/i.test(normalizedUserInput);
    const isFlowCancellation = /^(batal|batalkan|cancel|hentikan|selesai tanpa simpan)$/i.test(normalizedUserInput);

    // Check if input is an ambiguous or non-specific read query like "tampilkan data" or "tolong urus pengiriman"
    const hasExplicitIdentifier =
      Boolean(
        parsedQuery.context.salesOrderNumber ||
        parsedQuery.context.shipmentNumber ||
        parsedQuery.context.jobOrderNumber ||
        parsedQuery.context.activeFilters['salesOrderNumber'] ||
        parsedQuery.context.activeFilters['shipmentNumber'] ||
        parsedQuery.context.activeFilters['woNumber'] ||
        parsedQuery.context.activeFilters['joNumber']
      );

    const isAmbiguousRead =
      /^(tampilkan|lihat|cek)\s+(data|semua|transaksi)$/i.test(normalizedUserInput) ||
      (!hasExplicitIdentifier && /^(tolong\s+|mohon\s+)?(urus|proses|kerjakan|handle)\b/i.test(normalizedUserInput)) ||
      parsedQuery.context.specificity === 'AMBIGUOUS' ||
      parsedQuery.context.unresolvedAmbiguity;

    if (isAmbiguousRead && !isExplicitMutationVerb) {
      parsedQuery.context.specificity = 'AMBIGUOUS';
      parsedQuery.context.objectType = 'UNKNOWN';
    }

    const isExplicitReadQuery =
      !isExplicitMutationVerb && (
        isAmbiguousRead ||
        (parsedQuery.context.requestedOperation === 'FIND' && Boolean(parsedQuery.context.objectType && parsedQuery.context.objectType !== 'UNKNOWN')) ||
        parsedQuery.context.requestedOperation === 'COUNT' ||
        parsedQuery.context.requestedOperation === 'STATUS_CHECK' ||
        (Boolean(parsedQuery.context.objectType && parsedQuery.context.objectType !== 'UNKNOWN') && Boolean(hasExplicitIdentifier || parsedQuery.context.destination || parsedQuery.context.origin || parsedQuery.context.status)) ||
        /^(apakah ada|cari|tampilkan|ada berapa|lihat|status|cek|buka|open|detail)\b/i.test(normalizedUserInput) ||
        /\b(sales\s+order\s+draft|so\s+draft)\b/i.test(normalizedUserInput) ||
        (/\b(belum jalan|belum sebelum|belum tuntas|sedang berjalan|masih berjalan|in progress|ongoing|rejected|ditolak|cancelled|batal|completed|selesai)\b/i.test(normalizedUserInput) && !isFlowCancellation)
      );

    const isCustomerSearch = CustomerIntentHandler.isCustomerSearchIntent(context.userInput);
    const shouldRouteToOrderWorkspace =
      isOrderInitiation ||
      isFlowCancellation ||
      (Boolean(activeOrderFlow) && !isExplicitReadQuery && !isCustomerSearch);

    if (context.identity && shouldRouteToOrderWorkspace) {
      try {
        const workspaceResult = await ConversationalOrderWorkspace.handleTurn(
          context.userInput,
          context.identity,
          activeOrderFlow,
          conversationId,
        );

        if (workspaceResult.handled) {
          if (context.context?.conversation?.remember && typeof context.context.conversation.remember === 'function') {
            if (workspaceResult.state) {
              context.context = context.context.withConversation(
                context.context.conversation.remember('orderFlowState', workspaceResult.state)
              );
            } else if (context.context?.conversation?.forget && typeof context.context.conversation.forget === 'function') {
              context.context = context.context.withConversation(
                context.context.conversation.forget('orderFlowState')
              );
            }
          }
          context.finalResponse = {
            type: workspaceResult.proposal ? 'action_proposal' : 'text',
            content: workspaceResult.responseText,
            proposal: workspaceResult.proposal,
            metrics: undefined as any,
          };
          return { status: PipelineStatus.SUCCESS };
        }
      } catch (workspaceErr: any) {
        console.error('[IntentStage] ConversationalOrderWorkspace error:', workspaceErr);
      }
    }



    // 2E. Customer Creation Intent ("buat pelanggan baru", "daftarkan customer", etc.)
    if (context.identity && CustomerIntentHandler.isCustomerCreateIntent(context.userInput, context.identity, conversationId)) {
      const createRes = await CustomerIntentHandler.handleCustomerCreate(context.userInput, context.identity, conversationId);
      context.finalResponse = {
        type: createRes.type,
        content: createRes.content,
        proposal: createRes.proposal,
        results: createRes.results,
        metrics: undefined as any,
      };
      const status = createRes.status === 'BLOCKED' ? PipelineStatus.BLOCKED : PipelineStatus.SUCCESS;
      return { status };
    }

    // 2F. Customer Search Intent ("cari pelanggan PT ABC", "cek customer XYZ", "apakah ada customer ABC?", etc.)
    if (context.identity && CustomerIntentHandler.isCustomerSearchIntent(context.userInput)) {
      const searchRes = await CustomerIntentHandler.handleCustomerSearch(context.userInput, context.identity);
      context.finalResponse = {
        type: searchRes.type,
        content: searchRes.content,
        proposal: searchRes.proposal,
        results: searchRes.results,
        metrics: undefined as any,
      };
      const status = searchRes.status === 'BLOCKED' ? PipelineStatus.BLOCKED : PipelineStatus.SUCCESS;
      return { status };
    }

    // 2G. Standalone Customer Name ("PT TRADING PERDANA SUKSES", etc. without active flow)
    if (context.identity && !activeOrderFlow && CustomerIntentHandler.isStandaloneCustomerName(context.userInput)) {
      const standaloneRes = await CustomerIntentHandler.handleStandaloneCustomerName(context.userInput, context.identity);
      context.finalResponse = {
        type: standaloneRes.type,
        content: standaloneRes.content,
        proposal: standaloneRes.proposal,
        results: standaloneRes.results,
        metrics: undefined as any,
      };
      const status = standaloneRes.status === 'BLOCKED' ? PipelineStatus.BLOCKED : PipelineStatus.SUCCESS;
      return { status };
    }

    if (isExplicitReadQuery) {
      // Handle Operational Live Read via OperationalLiveReadGateway
      if (context.identity) {
        try {
          if (
            (!parsedQuery.context.objectType || parsedQuery.context.objectType === 'UNKNOWN') &&
            !isAmbiguousRead &&
            (parsedQuery.context.destination || parsedQuery.context.origin || parsedQuery.context.status)
          ) {
            parsedQuery.context.objectType = 'JOB_ORDER';
          }
          const liveReadRes = await OperationalLiveReadGateway.executeLiveRead(context.identity, parsedQuery.context);
          context.finalResponse = {
            type: 'text',
            content: liveReadRes.summaryText + (liveReadRes.clarificationQuestion ? `\n\n*${liveReadRes.clarificationQuestion}*` : ''),
            results: liveReadRes.results,
            metrics: undefined as any
          };
          return { status: PipelineStatus.SUCCESS };
        } catch (readErr: any) {
          const errText = String(readErr.message || '');
          if (
            /permission|denied|unauthorized|forbidden/i.test(errText) ||
            readErr.code === 'FORBIDDEN_PERMISSION' ||
            readErr.statusCode === 403
          ) {
            const role = context.identity?.role || 'user';
            let politeMsg = `Akses ditolak: ${errText}`;
            if (errText.includes('commercial:read') || errText.includes('sales_order:read')) {
              politeMsg = `Akses ditolak: Pembacaan data Sales Order memerlukan izin 'sales_order:read' atau 'commercial:read'. Akun Anda dengan role **${role}** tidak memiliki izin komersial tersebut. Silakan hubungi administrator jika Anda memerlukan akses data pesanan penjualan.\n\n*Catatan: Jika Anda bermaksud membuat pesanan pelanggan baru, silakan gunakan perintah "buat order baru" atau buka [Form Buat Sales Order](/commercial/sales-orders/create).*`;
            }
            context.finalResponse = {
              type: 'text',
              content: politeMsg,
              metrics: undefined as any
            };
            return { status: PipelineStatus.BLOCKED };
          }
          context.finalResponse = {
            type: 'text',
            content: `Terjadi kendala saat membaca data operasional: ${readErr.message || 'Gagal menghubungi database.'}`,
            metrics: undefined as any
          };
          return { status: PipelineStatus.TERMINATED };
        }
      }
    }

    // 2. Resolve Intent using the context-enriched string (Mutation & Fallback path)
    const resolved = await IntentResolver.resolve(context);
    
    context.resolvedIntentName = resolved.intent;
    context.resolvedIntentSuggestions = resolved.suggestions;
    context.resolvedEntities = resolved.entities;

    if (resolved.intent === 'UNKNOWN') {
      let clarificationText = "I'm sorry, I couldn't understand that command. Could you please clarify?";
      
      if (resolved.suggestions && resolved.suggestions.length > 0) {
        const cleanedSuggestions = resolved.suggestions.map((s) => s.trim());
        const firstSug = cleanedSuggestions[0];
        
        // If suggestion is already a full sentence, question, or starts with polite requests/verbs
        if (
          /^(could you|would you|can you|please|what|where|who|how|apakah|mohon|silakan|tolong|coba)\b/i.test(firstSug) ||
          firstSug.endsWith('?') ||
          firstSug.endsWith('.')
        ) {
          clarificationText = cleanedSuggestions.join(' atau ');
        } else {
          clarificationText = `Did you mean: ${cleanedSuggestions.join(' or ')}?`;
        }
      } else if (context.resolutionMetadata?.aiStatus === 'UNAVAILABLE') {
        const failureClass = context.resolutionMetadata?.failureClass;
        if (failureClass === 'CAPACITY_EXHAUSTED') {
          clarificationText = "Layanan pemrosesan AI sedang mengalami antrean tinggi. Perintah tidak dapat diproses saat ini. Silakan coba kembali nanti.";
        } else if (failureClass === 'TIMEOUT_EXCEEDED') {
          clarificationText = "Layanan pemrosesan AI membutuhkan waktu terlalu lama untuk merespons. Perintah tidak dapat diproses saat ini. Silakan coba kembali.";
        } else if (failureClass === 'QUOTA_EXHAUSTED') {
          clarificationText = "Batas permintaan pemrosesan AI telah tercapai saat ini. Silakan coba kembali sesaat lagi.";
        } else if (failureClass === 'UPSTREAM_FAILURE') {
          clarificationText = "Layanan pemrosesan AI sedang mengalami gangguan koneksi upstream sementara. Silakan coba kembali nanti.";
        } else {
          clarificationText = "Layanan pemrosesan AI sedang tidak tersedia sementara. Perintah tidak dapat diproses saat ini. Silakan coba kembali nanti.";
        }
      } else if (context.resolutionMetadata?.aiStatus === 'DEGRADED') {
        clarificationText = "Layanan pemrosesan AI sedang mengalami gangguan teknis sementara. Perintah tidak dapat diproses saat ini.";
      }

      context.finalResponse = {
        type: 'clarification',
        content: clarificationText,
        metrics: undefined as any // Populated with actual elapsed timing by CopilotPipeline orchestrator
      };
      return { status: PipelineStatus.REQUIRES_CLARIFICATION };
    }

    return { status: PipelineStatus.CONTINUE };
  }

  /**
   * Builds the identity-aware conversational response strictly from the
   * server-resolved IdentityContext (Phase 1 Identity Routing Remediation).
   * No hardcoded user/role/tenant, no external lookups, no fabrication —
   * an absent session yields an explicit session notice instead of invented data.
   */
  private static buildIdentityResponse(
    intent: IdentityIntent,
    identity: IdentityContext | null,
    user?: UserContext
  ): string {
    if (!identity) {
      return 'Sesi autentikasi tidak ditemukan. Silakan login terlebih dahulu untuk menanyakan identitas, role, tenant, atau hak akses Anda.';
    }
    const displayName = user?.getDisplayName();
    const hasOfficialName = Boolean(displayName && displayName !== identity.userId && displayName !== 'System User');

    switch (intent) {
      case 'IDENTITY':
        if (hasOfficialName) {
          return `Nama Anda pada profil resmi adalah **${displayName}** (user id **${identity.userId}**).`;
        }
        return `Nama profil resmi belum terdaftar untuk akun Anda (user id **${identity.userId}**).`;
      case 'ROLE':
        return `Role otorisasi Anda pada sesi ini adalah **${identity.role}**${
          identity.sbuScope ? ` (scope SBU: ${identity.sbuScope})` : ''
        }.`;
      case 'TENANT':
        return `Anda berada di tenant **${identity.tenantCode || identity.tenantId}** — konteks tenant diturunkan dari sesi autentikasi server.`;
      case 'PERMISSION':
        return identity.permissions.length > 0
          ? `Izin (permission) Anda saat ini: ${identity.permissions.map((p: string) => `**${p}**`).join(', ')}.`
          : 'Saat ini tidak ada izin aktif pada sesi Anda.';
    }
  }
}
