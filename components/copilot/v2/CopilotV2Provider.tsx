"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type {
  CopilotMessage,
  DetailPanelState,
  EntityReference,
  RecentConversationItem,
  SuggestedPrompt,
} from "./types";
import {
  sendCopilotMessage,
  fetchEntityDetail,
  fetchRecentConversations,
  fetchConversationHistory,
  renameServerConversation,
  deleteServerConversation,
} from "./copilot-api-client";
import { ConversationalSandboxEngine } from "@/lib/copilot/sandbox/sandbox-engine";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import type { ConversationalContextState } from "@/lib/copilot/sandbox/types";

export type ActiveCopilotScope = 'cs' | 'sbu' | 'general';

export function getScopeFromPathname(pathname: string | null, role: string | null | undefined): ActiveCopilotScope {
  const normRole = (role || '').toLowerCase();
  if (normRole.startsWith('sbu_') || normRole === 'driver' || normRole === 'ground_staff') {
    return 'sbu';
  }
  if (
    normRole === 'hq_cs' ||
    normRole === 'hq_director_cs' ||
    normRole === 'hq_commercial_director' ||
    normRole === 'hq_sales_manager' ||
    normRole === 'hq_sales_staff'
  ) {
    return 'cs';
  }
  if (!pathname) return 'cs';
  if (
    pathname.startsWith('/sbu') ||
    pathname.startsWith('/hq/work-orders') ||
    pathname.startsWith('/reporting/operational')
  ) {
    return 'sbu';
  }
  return 'cs';
}

export function getWelcomeMessage(scope: ActiveCopilotScope): CopilotMessage {
  if (scope === 'sbu') {
    return {
      id: "welcome-sbu",
      role: "assistant",
      type: "text",
      content: "Selamat datang di Copilot SBU Operasional. Saya siap membantu Anda memeriksa Job Order, memantau pergerakan armada, dan penugasan supir.",
      timestamp: new Date(),
    };
  }
  return {
    id: "welcome-cs",
    role: "assistant",
    type: "text",
    content: "Selamat datang di Copilot Customer Service & Commercial. Saya siap membantu Anda melayani customer, mengelola Sales Order, dan orkestrasi Work Order.",
    timestamp: new Date(),
  };
}

export interface CopilotV2ContextType {
  activeScope: ActiveCopilotScope;
  setActiveScope: (scope: ActiveCopilotScope) => void;
  messages: CopilotMessage[];
  isProcessing: boolean;
  detailPanel: DetailPanelState;
  activeEntityRefs: EntityReference[];
  isMobileDetailOpen: boolean;
  isMobileContextOpen: boolean;
  conversationId: string | null;
  conversationTitle: string | null;
  recentConversations: RecentConversationItem[];
  isLoadingRecents: boolean;
  isLoadingMessages: boolean;
  recentsError: string | null;
  isRecentsOpen: boolean;
  sendMessage: (text: string) => void;
  clearConversation: () => void;
  startNewChat: () => void;
  selectConversation: (id: string) => Promise<void>;
  refreshRecents: (opts?: { silent?: boolean }) => Promise<RecentConversationItem[]>;
  renameConversation: (id: string, title: string) => Promise<boolean>;
  deleteConversation: (id: string) => Promise<boolean>;
  openRecents: () => void;
  closeRecents: () => void;
  toggleRecents: () => void;
  selectEntity: (ref: EntityReference) => void;
  closeDetail: () => void;
  selectSuggestedPrompt: (prompt: SuggestedPrompt) => void;
  useSuggestedPrompt: (prompt: SuggestedPrompt) => void;
  openMobileDetail: () => void;
  closeMobileDetail: () => void;
  openMobileContext: () => void;
  closeMobileContext: () => void;
}

const CopilotV2Context = createContext<CopilotV2ContextType | null>(null);

export function useCopilotV2(): CopilotV2ContextType {
  const ctx = useContext(CopilotV2Context);
  if (!ctx) throw new Error("useCopilotV2 must be used within <CopilotV2Provider>");
  return ctx;
}

export function useOptionalCopilotV2(): CopilotV2ContextType | null {
  return useContext(CopilotV2Context);
}

function makeId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const WELCOME_MESSAGE: CopilotMessage = {
  id: "welcome",
  role: "assistant",
  type: "text",
  content: "Good morning. What would you like to understand or work on?",
  timestamp: new Date(),
};

const IS_PRODUCTION = typeof process !== "undefined" && process.env.NODE_ENV === "production";

function collectEntityRefsFromMessages(msgs: CopilotMessage[]): EntityReference[] {
  const collected: EntityReference[] = [];
  for (const msg of msgs) {
    if (msg.entityRefs && msg.entityRefs.length > 0) {
      for (const r of msg.entityRefs) {
        if (!collected.some((existing) => existing.type === r.type && existing.id === r.id)) {
          collected.push(r);
        }
      }
    }
  }
  return collected;
}

function CopilotV2RootProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const [activeScope, setActiveScope] = useState<ActiveCopilotScope>(() =>
    getScopeFromPathname(typeof window !== "undefined" ? window.location.pathname : null, null)
  );
  const activeScopeRef = useRef<ActiveCopilotScope>(activeScope);

  useEffect(() => {
    activeScopeRef.current = activeScope;
  }, [activeScope]);

  // Keep active scope synced with current navigation route or role
  useEffect(() => {
    const derived = getScopeFromPathname(pathname, profile?.role);
    if (derived !== activeScope) {
      setActiveScope(derived);
    }
  }, [pathname, profile?.role, activeScope]);

  const [messages, setMessages] = useState<CopilotMessage[]>([getWelcomeMessage(activeScope)]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailPanel, setDetailPanel] = useState<DetailPanelState>({ type: "empty" });
  const [activeEntityRefs, setActiveEntityRefs] = useState<EntityReference[]>([]);
  const [isMobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isMobileContextOpen, setMobileContextOpen] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [recentConversations, setRecentConversations] = useState<RecentConversationItem[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [recentsError, setRecentsError] = useState<string | null>(null);
  const [isRecentsOpen, setIsRecentsOpen] = useState(false);

  const timerRefs = useRef<NodeJS.Timeout[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const entityAbortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const orderFlowStateRef = useRef<any>(null);
  const conversationStateRef = useRef<ConversationalContextState>({
    conversationHistory: [],
  });

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach((t) => clearTimeout(t));
    timerRefs.current = [];
  }, []);

  const refreshRecents = useCallback(async (opts?: { silent?: boolean; scope?: ActiveCopilotScope }): Promise<RecentConversationItem[]> => {
    const targetScope = opts?.scope || activeScopeRef.current;
    if (!opts?.silent) {
      setIsLoadingRecents(true);
      setRecentsError(null);
    }
    try {
      const result = await fetchRecentConversations({ limit: 30, scope: targetScope });
      if (result.success) {
        const list = Array.isArray(result.data) ? result.data : [];
        setRecentConversations(list);
        if (!opts?.silent) setRecentsError(null);
        return list;
      } else {
        if (!opts?.silent) {
          setRecentsError(result.error || "Gagal memuat daftar percakapan.");
        }
        return [];
      }
    } catch {
      if (!opts?.silent) {
        setRecentsError("Gagal memuat daftar percakapan.");
      }
      return [];
    } finally {
      if (!opts?.silent) {
        setIsLoadingRecents(false);
      }
    }
  }, []);

  const selectConversation = useCallback(async (targetId: string) => {
    if (!targetId) return;
    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;

    setIsLoadingMessages(true);
    setRecentsError(null);

    try {
      const result = await fetchConversationHistory(targetId, { signal: controller.signal });
      if (controller.signal.aborted) return;

      if (!result.success) {
        setRecentsError(result.error || "Gagal membuka histori percakapan.");
        return;
      }

      conversationIdRef.current = targetId;
      setConversationId(targetId);
      setConversationTitle(result.conversation?.title || "Percakapan Copilot");
      orderFlowStateRef.current = result.orderFlowState || null;

      if (typeof window !== "undefined") {
        try {
          const currentScope = activeScopeRef.current;
          sessionStorage.setItem(`sentralogis_copilot_active_conv_id_${currentScope}`, targetId);
          sessionStorage.removeItem(`sentralogis_copilot_new_chat_mode_${currentScope}`);
        } catch {
          // ignore storage quota errors
        }
      }

      const welcome = getWelcomeMessage(activeScopeRef.current);
      const loadedMessages =
        result.messages && result.messages.length > 0 ? result.messages : [welcome];
      setMessages(loadedMessages);
      setActiveEntityRefs(collectEntityRefsFromMessages(loadedMessages));
      setDetailPanel({ type: "empty" });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setRecentsError("Gagal memuat pesan percakapan.");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMessages(false);
      }
    }
  }, []);

  const startNewChat = useCallback(() => {
    clearTimers();
    abortControllerRef.current?.abort();
    entityAbortRef.current?.abort();
    historyAbortRef.current?.abort();
    conversationIdRef.current = null;
    orderFlowStateRef.current = null;
    conversationStateRef.current = { conversationHistory: [] };
    setConversationId(null);
    setConversationTitle(null);
    setActiveEntityRefs([]);
    setDetailPanel({ type: "empty" });
    setMessages([getWelcomeMessage(activeScopeRef.current)]);
    setIsProcessing(false);
    setIsLoadingMessages(false);
    setRecentsError(null);

    if (typeof window !== "undefined") {
      try {
        const currentScope = activeScopeRef.current;
        sessionStorage.removeItem(`sentralogis_copilot_active_conv_id_${currentScope}`);
        sessionStorage.setItem(`sentralogis_copilot_new_chat_mode_${currentScope}`, "1");
      } catch {
        // ignore
      }
    }
  }, [clearTimers]);

  // Handle activeScope change and initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await refreshRecents({ silent: false, scope: activeScope });
      if (cancelled) return;

      let savedConvId: string | null = null;
      let isNewChatMode = false;
      if (typeof window !== "undefined") {
        try {
          savedConvId = sessionStorage.getItem(`sentralogis_copilot_active_conv_id_${activeScope}`);
          isNewChatMode = sessionStorage.getItem(`sentralogis_copilot_new_chat_mode_${activeScope}`) === "1";
        } catch {
          // ignore
        }
      }

      if (isNewChatMode) {
        startNewChat();
        return;
      }

      const candidateId =
        savedConvId && list.some((c) => c.id === savedConvId)
          ? savedConvId
          : list.length > 0
            ? list[0].id
            : null;

      if (candidateId) {
        await selectConversation(candidateId);
      } else {
        startNewChat();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeScope, refreshRecents, selectConversation, startNewChat]);

  const clearConversation = startNewChat;

  const renameConversation = useCallback(async (id: string, title: string): Promise<boolean> => {
    const trimmed = title.trim();
    if (!id || !trimmed) return false;
    const result = await renameServerConversation(id, trimmed);
    if (result.success) {
      const newTitle = result.data?.title || trimmed;
      setRecentConversations((prev) =>
        prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item)),
      );
      if (conversationIdRef.current === id) {
        setConversationTitle(newTitle);
      }
      return true;
    }
    return false;
  }, []);

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;
      const res = await deleteServerConversation(id);
      if (res.success) {
        setRecentConversations((prev) => prev.filter((item) => item.id !== id));
        if (conversationIdRef.current === id) {
          startNewChat();
        }
        return true;
      }
      return false;
    },
    [startNewChat],
  );

  const openRecents = useCallback(() => setIsRecentsOpen(true), []);
  const closeRecents = useCallback(() => setIsRecentsOpen(false), []);
  const toggleRecents = useCallback(() => setIsRecentsOpen((prev) => !prev), []);

  const selectEntity = useCallback(async (ref: EntityReference) => {
    entityAbortRef.current?.abort();
    const controller = new AbortController();
    entityAbortRef.current = controller;

    setMobileDetailOpen(true);
    setDetailPanel({
      type: ref.type,
      entity: {
        type: ref.type,
        id: ref.id,
        title: ref.label || ref.id,
        subtitle: "Loading details from canonical domain...",
        status: ref.status || "LOADING",
        statusColor: ref.statusColor || "gray",
        fields: [],
      },
    });

    try {
      const result = await fetchEntityDetail(ref.type, ref.id, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (result.success && result.data) {
        setDetailPanel({
          type: ref.type,
          entity: result.data,
        });
      } else {
        setDetailPanel({
          type: ref.type,
          entity: {
            type: ref.type,
            id: ref.id,
            title: ref.label || ref.id,
            subtitle: "Canonical entity detail",
            status: ref.status || "UNAVAILABLE",
            statusColor: ref.statusColor || "gray",
            fields: [
              {
                label: "Notice",
                value: result.error || "Unable to load canonical entity details.",
              },
            ],
          },
        });
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
  }, []);

  const closeDetail = useCallback(() => setDetailPanel({ type: "empty" }), []);
  const openMobileDetail = useCallback(() => setMobileDetailOpen(true), []);
  const closeMobileDetail = useCallback(() => setMobileDetailOpen(false), []);
  const openMobileContext = useCallback(() => setMobileContextOpen(true), []);
  const closeMobileContext = useCallback(() => setMobileContextOpen(false), []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: CopilotMessage = {
        id: makeId(),
        role: "user",
        type: "text",
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsProcessing(true);

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const transportResult = await sendCopilotMessage(trimmed, {
          conversationId: conversationIdRef.current,
          scope: activeScopeRef.current,
          orderFlowState: orderFlowStateRef.current,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (transportResult.conversationId) {
          conversationIdRef.current = transportResult.conversationId;
          setConversationId(transportResult.conversationId);
          if (typeof window !== "undefined") {
            try {
              const currentScope = activeScopeRef.current;
              sessionStorage.setItem(`sentralogis_copilot_active_conv_id_${currentScope}`, transportResult.conversationId);
              sessionStorage.removeItem(`sentralogis_copilot_new_chat_mode_${currentScope}`);
            } catch {
              // ignore
            }
          }
        }

        if (transportResult.conversationTitle) {
          setConversationTitle(transportResult.conversationTitle);
        }

        if (transportResult.orderFlowState !== undefined) {
          orderFlowStateRef.current = transportResult.orderFlowState;
        }

        const isNetworkFallbackEligible =
          !IS_PRODUCTION &&
          transportResult.messages.length === 1 &&
          transportResult.messages[0].type === "error" &&
          (transportResult.messages[0].content || "").includes("Unable to connect to Copilot backend");

        const finalMessages: CopilotMessage[] = isNetworkFallbackEligible
          ? (() => {
              const sandboxTurn = ConversationalSandboxEngine.processUserMessage(
                trimmed,
                conversationStateRef.current,
              );
              conversationStateRef.current = sandboxTurn.updatedState;
              return sandboxTurn.responseMessages;
            })()
          : transportResult.messages;

        setMessages((prev) => [...prev, ...finalMessages]);
        const collectedRefs = collectEntityRefsFromMessages(finalMessages);
        if (collectedRefs.length > 0) {
          setActiveEntityRefs(collectedRefs);
        }

        void refreshRecents({ silent: true });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            type: "error",
            content: "Something interrupted this request.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        if (!controller.signal.aborted) {
          setIsProcessing(false);
        }
      }
    },
    [refreshRecents],
  );

  const selectSuggestedPrompt = useCallback(
    (prompt: SuggestedPrompt) => {
      sendMessage(prompt.query);
    },
    [sendMessage],
  );

  const useSuggestedPrompt = useCallback(
    (prompt: SuggestedPrompt) => {
      sendMessage(prompt.query);
    },
    [sendMessage],
  );

  return (
    <CopilotV2Context.Provider
      value={{
        activeScope,
        setActiveScope,
        messages,
        isProcessing,
        detailPanel,
        activeEntityRefs,
        isMobileDetailOpen,
        isMobileContextOpen,
        conversationId,
        conversationTitle,
        recentConversations,
        isLoadingRecents,
        isLoadingMessages,
        recentsError,
        isRecentsOpen,
        sendMessage,
        clearConversation,
        startNewChat,
        selectConversation,
        refreshRecents,
        renameConversation,
        deleteConversation,
        openRecents,
        closeRecents,
        toggleRecents,
        selectEntity,
        closeDetail,
        selectSuggestedPrompt,
        useSuggestedPrompt,
        openMobileDetail,
        closeMobileDetail,
        openMobileContext,
        closeMobileContext,
      }}
    >
      {children}
    </CopilotV2Context.Provider>
  );
}

export function CopilotV2Provider({ children }: { children: React.ReactNode }) {
  const existing = useContext(CopilotV2Context);
  if (existing) {
    return <>{children}</>;
  }
  return <CopilotV2RootProvider>{children}</CopilotV2RootProvider>;
}
