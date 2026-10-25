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
import type { ConversationalContextState } from "@/lib/copilot/sandbox/types";

const ACTIVE_CONV_STORAGE_KEY = "sentralogis_copilot_active_conv_id";
const NEW_CHAT_MODE_STORAGE_KEY = "sentralogis_copilot_new_chat_mode";

export interface CopilotV2ContextType {
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
  const [messages, setMessages] = useState<CopilotMessage[]>([WELCOME_MESSAGE]);
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
  const didInitRef = useRef(false);
  const conversationStateRef = useRef<ConversationalContextState>({
    conversationHistory: [],
  });

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach((t) => clearTimeout(t));
    timerRefs.current = [];
  }, []);

  const refreshRecents = useCallback(async (opts?: { silent?: boolean }): Promise<RecentConversationItem[]> => {
    if (!opts?.silent) {
      setIsLoadingRecents(true);
      setRecentsError(null);
    }
    try {
      const result = await fetchRecentConversations({ limit: 30 });
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
          sessionStorage.setItem(ACTIVE_CONV_STORAGE_KEY, targetId);
          sessionStorage.removeItem(NEW_CHAT_MODE_STORAGE_KEY);
        } catch {
          // ignore storage quota errors
        }
      }

      const loadedMessages =
        result.messages && result.messages.length > 0 ? result.messages : [WELCOME_MESSAGE];
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

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    let cancelled = false;
    (async () => {
      const list = await refreshRecents({ silent: false });
      if (cancelled) return;

      let savedConvId: string | null = null;
      let isNewChatMode = false;
      if (typeof window !== "undefined") {
        try {
          savedConvId = sessionStorage.getItem(ACTIVE_CONV_STORAGE_KEY);
          isNewChatMode = sessionStorage.getItem(NEW_CHAT_MODE_STORAGE_KEY) === "1";
        } catch {
          // ignore
        }
      }

      if (isNewChatMode) return;

      const candidateId =
        savedConvId && list.some((c) => c.id === savedConvId)
          ? savedConvId
          : list.length > 0
            ? list[0].id
            : null;

      if (candidateId) {
        await selectConversation(candidateId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshRecents, selectConversation]);

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
    setMessages([WELCOME_MESSAGE]);
    setIsProcessing(false);
    setIsLoadingMessages(false);
    setRecentsError(null);

    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(ACTIVE_CONV_STORAGE_KEY);
        sessionStorage.setItem(NEW_CHAT_MODE_STORAGE_KEY, "1");
      } catch {
        // ignore
      }
    }
  }, [clearTimers]);

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
          orderFlowState: orderFlowStateRef.current,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (transportResult.conversationId) {
          conversationIdRef.current = transportResult.conversationId;
          setConversationId(transportResult.conversationId);
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(ACTIVE_CONV_STORAGE_KEY, transportResult.conversationId);
              sessionStorage.removeItem(NEW_CHAT_MODE_STORAGE_KEY);
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
