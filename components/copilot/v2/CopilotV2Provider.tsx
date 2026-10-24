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
    setMessages([WELCOME_MESSAGE]);
  }, []);

  const selectEntity = useCallback(() => {}, []);
  const closeDetail = useCallback(() => setDetailPanel({ type: "empty" }), []);
  const selectSuggestedPrompt = useCallback(() => {}, []);
  const useSuggestedPrompt = useCallback(() => {}, []);
  const openMobileDetail = useCallback(() => setMobileDetailOpen(true), []);
  const closeMobileDetail = useCallback(() => setMobileDetailOpen(false), []);
  const openMobileContext = useCallback(() => setMobileContextOpen(true), []);
  const closeMobileContext = useCallback(() => setMobileContextOpen(false), []);
  const sendMessage = useCallback(async () => {}, []);

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
