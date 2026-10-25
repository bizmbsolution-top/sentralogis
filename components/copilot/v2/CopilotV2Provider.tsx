"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type {
  CopilotMessage,
  DetailPanelState,
  EntityReference,
  SuggestedPrompt,
} from "./types";
import { sendCopilotMessage, fetchEntityDetail } from "./copilot-api-client";
import { ConversationalSandboxEngine } from "@/lib/copilot/sandbox/sandbox-engine";
import type { ConversationalContextState } from "@/lib/copilot/sandbox/types";

interface CopilotV2ContextType {
  messages: CopilotMessage[];
  isProcessing: boolean;
  detailPanel: DetailPanelState;
  activeEntityRefs: EntityReference[];
  isMobileDetailOpen: boolean;
  isMobileContextOpen: boolean;
  sendMessage: (text: string) => void;
  clearConversation: () => void;
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

export function CopilotV2Provider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<CopilotMessage[]>([WELCOME_MESSAGE]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailPanel, setDetailPanel] = useState<DetailPanelState>({ type: "empty" });
  const [activeEntityRefs, setActiveEntityRefs] = useState<EntityReference[]>([]);
  const [isMobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [isMobileContextOpen, setMobileContextOpen] = useState(false);
  const timerRefs = useRef<NodeJS.Timeout[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const entityAbortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string>(`conv-${Date.now()}`);
  const conversationStateRef = useRef<ConversationalContextState>({
    conversationHistory: [],
  });

  useEffect(() => {
    if (IS_PRODUCTION) {
      setActiveEntityRefs([]);
      setMessages([WELCOME_MESSAGE]);
      setDetailPanel({ type: "empty" });
    }
  }, []);

  const clearTimers = useCallback(() => {
    timerRefs.current.forEach((t) => clearTimeout(t));
    timerRefs.current = [];
  }, []);

  const clearConversation = useCallback(() => {
    clearTimers();
    abortControllerRef.current?.abort();
    entityAbortRef.current?.abort();
    conversationIdRef.current = `conv-${Date.now()}`;
    conversationStateRef.current = { conversationHistory: [] };
    setActiveEntityRefs([]);
    setDetailPanel({ type: "empty" });
    setMessages([WELCOME_MESSAGE]);
    setIsProcessing(false);
  }, [clearTimers]);

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

  const sendMessage = useCallback(async (text: string) => {
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
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

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
      const collectedRefs: EntityReference[] = [];
      for (const msg of finalMessages) {
        if (msg.entityRefs && msg.entityRefs.length > 0) {
          for (const r of msg.entityRefs) {
            if (!collectedRefs.some((existing) => existing.type === r.type && existing.id === r.id)) {
              collectedRefs.push(r);
            }
          }
        }
      }
      if (collectedRefs.length > 0) {
        setActiveEntityRefs(collectedRefs);
      }
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
  }, []);

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
        sendMessage,
        clearConversation,
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
