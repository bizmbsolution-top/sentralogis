'use client';

/**
 * Sentralogis Copilot — Conversational Sandbox & Human Evaluation Loop
 * app/copilot-sandbox/page.tsx
 *
 * Dedicated safe conversational testing surface for Human Architect.
 *
 * Invariants:
 * - READ / SIMULATE / PROPOSE ONLY.
 * - Zero database mutations, zero Supabase queries.
 * - In-memory evaluation state only.
 * - Clearly badges SIMULATED, PROPOSED, and NOT EXECUTED states.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldAlert,
  Building2,
  Truck,
  FileText,
  User,
  PanelLeft,
  PanelRight,
  Menu,
  X,
  ChevronRight,
  MessageSquare,
  Award,
  Sliders,
} from 'lucide-react';
import {
  AUTHORITATIVE_SCENARIOS,
  ConversationalSandboxEngine,
} from '@/lib/copilot/sandbox/sandbox-engine';
import {
  EVALUATION_DIMENSION_LABELS,
  type EvaluationDimension,
  type HumanEvaluationRating,
  type ResponseEvaluation,
  type ConversationalContextState,
  type SandboxMessage,
  type AuthoritativeScenario,
} from '@/lib/copilot/sandbox/types';
import {
  SIMULATED_CUSTOMERS,
  SIMULATED_SALES_ORDERS,
  SIMULATED_JOB_ORDERS,
  SIMULATED_SHIPMENTS,
  SIMULATED_DRIVERS,
} from '@/lib/copilot/sandbox/deterministic-fixtures';

const INITIAL_CONTEXT_STATE: ConversationalContextState = {
  conversationHistory: [],
};

const WELCOME_SANDBOX_MESSAGE: SandboxMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  type: 'text',
  dataSource: 'SIMULATED',
  isExecuted: false,
  content: `Selamat pagi. Saya adalah **Sentralogis Copilot** yang berjalan di dalam **Safe Conversational Sandbox**.

Sandbox ini beroperasi dalam mode **READ / SIMULATE / PROPOSE ONLY** tanpa koneksi ke database produksi dan tanpa kemampuan mutasi langsung (\`EXECUTE: OFF\`).

Bapak/Ibu dapat mengetik pertanyaan operasional dalam bahasa Indonesia logistik, mencoba skenario multi-turn, atau memilih salah satu dari 8 skenario awal di panel sebelah kiri.`,
  timestamp: new Date(),
};

export default function CopilotSandboxPage() {
  const [messages, setMessages] = useState<SandboxMessage[]>([WELCOME_SANDBOX_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [contextState, setContextState] = useState<ConversationalContextState>(INITIAL_CONTEXT_STATE);
  const [evaluations, setEvaluations] = useState<Record<string, ResponseEvaluation>>({});
  const [selectedMessageForEval, setSelectedMessageForEval] = useState<string | null>(null);

  // Responsive UI state
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'scenarios' | 'eval'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgSeqRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    msgSeqRef.current += 1;
    const userMessage: SandboxMessage = {
      id: `usr-${msgSeqRef.current}`,
      role: 'user',
      type: 'text',
      dataSource: 'SIMULATED',
      isExecuted: false,
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // Process through deterministic sandbox engine
    setTimeout(() => {
      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        text,
        contextState
      );
      setMessages((prev) => [...prev, ...responseMessages]);
      setContextState(updatedState);

      // Select latest assistant message for evaluation convenience
      const lastAssistant = responseMessages.filter((m) => m.role === 'assistant').pop();
      if (lastAssistant) {
        setSelectedMessageForEval(lastAssistant.id);
      }
    }, 250);
  };

  // Reset conversation
  const handleReset = () => {
    setMessages([WELCOME_SANDBOX_MESSAGE]);
    setContextState(INITIAL_CONTEXT_STATE);
    setSelectedMessageForEval(null);
  };

  // Run a preset scenario
  const handleRunScenario = (sc: AuthoritativeScenario) => {
    handleSendMessage(sc.userPrompt);
    setActiveMobileTab('chat');
  };

  // Record an evaluation
  const handleRateMessage = (
    messageId: string,
    rating: HumanEvaluationRating,
    note?: string,
    dimensionUpdates?: Partial<Record<EvaluationDimension, boolean>>
  ) => {
    setEvaluations((prev) => {
      const existing = prev[messageId] || {
        messageId,
        rating,
        dimensions: {
          INTENT_UNDERSTANDING: true,
          ENTITY_EXTRACTION: true,
          BUSINESS_LANGUAGE: true,
        },
        correctionNote: '',
        evaluatedAt: new Date(),
      };

      return {
        ...prev,
        [messageId]: {
          ...existing,
          rating,
          correctionNote: note !== undefined ? note : existing.correctionNote,
          dimensions: dimensionUpdates ? { ...existing.dimensions, ...dimensionUpdates } : existing.dimensions,
          evaluatedAt: new Date(),
        },
      };
    });
  };

  // Evaluation statistics
  const evalCount = Object.keys(evaluations).length;
  const acceptCount = Object.values(evaluations).filter((e) => e.rating === 'ACCEPT').length;
  const correctCount = Object.values(evaluations).filter((e) => e.rating === 'CORRECT').length;
  const incorrectCount = Object.values(evaluations).filter((e) => e.rating === 'INCORRECT').length;
  const needsClarificationCount = Object.values(evaluations).filter((e) => e.rating === 'NEEDS_CLARIFICATION').length;

  const currentEval = selectedMessageForEval ? evaluations[selectedMessageForEval] : null;

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800">
      {/* ─── Top Header ─── */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            title="Toggle Left Panel"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Sentralogis Copilot</span>
                <span className="text-[10px] font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                  SANDBOX EVALUATOR
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Multi-Turn Evaluation Loop • Execute: OFF • Database Mutation: OFF
              </p>
            </div>
          </div>
        </div>

        {/* Status badges & Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SIMULATED MODE ONLY
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            EXECUTE: OFF
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Sesi</span>
          </button>
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            title="Toggle Right Panel"
          >
            <PanelRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ─── Mobile Tab Navigation (Small screens) ─── */}
      <div className="lg:hidden flex border-b border-slate-200 bg-white text-xs font-medium shrink-0">
        <button
          onClick={() => setActiveMobileTab('scenarios')}
          className={`flex-1 py-2.5 text-center border-b-2 ${
            activeMobileTab === 'scenarios' ? 'border-indigo-600 text-indigo-700 font-bold' : 'border-transparent text-slate-600'
          }`}
        >
          Skenario & Konteks
        </button>
        <button
          onClick={() => setActiveMobileTab('chat')}
          className={`flex-1 py-2.5 text-center border-b-2 ${
            activeMobileTab === 'chat' ? 'border-indigo-600 text-indigo-700 font-bold' : 'border-transparent text-slate-600'
          }`}
        >
          Percakapan ({messages.length})
        </button>
        <button
          onClick={() => setActiveMobileTab('eval')}
          className={`flex-1 py-2.5 text-center border-b-2 ${
            activeMobileTab === 'eval' ? 'border-indigo-600 text-indigo-700 font-bold' : 'border-transparent text-slate-600'
          }`}
        >
          Evaluasi ({evalCount})
        </button>
      </div>

      {/* ─── 3-Column Cockpit Workspace ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─── LEFT COLUMN: Scenarios & Active Context ─── */}
        <aside
          className={`${
            showLeftPanel ? 'w-80 xl:w-96' : 'hidden'
          } ${
            activeMobileTab === 'scenarios' ? 'flex w-full' : 'hidden lg:flex'
          } bg-white border-r border-slate-200 flex-col overflow-y-auto shrink-0 transition-all`}
        >
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Skenario Otoritatif (01 - 08)
            </h2>
            <p className="text-xs text-slate-500">
              Klik salah satu skenario untuk memicu pengujian multi-turn:
            </p>
          </div>

          <div className="p-3 space-y-2 flex-1">
            {AUTHORITATIVE_SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleRunScenario(sc)}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    Skenario {sc.scenarioNumber}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-900">
                  {sc.title}
                </div>
                <div className="text-[11px] text-slate-500 italic mt-0.5 font-mono line-clamp-1">
                  "{sc.userPrompt}"
                </div>
              </button>
            ))}
          </div>

          {/* Active Context Memory Inspector */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/70">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              Memori Konteks Aktif
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-800">
                  {contextState.activeCustomerName || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Sales Order:</span>
                <span className="font-mono font-semibold text-blue-700">
                  {contextState.activeSalesOrderId || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Job Order:</span>
                <span className="font-mono font-semibold text-amber-700">
                  {contextState.activeJobOrderId || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Shipment:</span>
                <span className="font-mono font-semibold text-indigo-700">
                  {contextState.activeShipmentId || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Supir / Driver:</span>
                <span className="font-semibold text-slate-800">
                  {contextState.activeDriverName || '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ─── CENTER COLUMN: Conversation Thread ─── */}
        <main
          className={`${
            activeMobileTab === 'chat' ? 'flex flex-1' : 'hidden lg:flex lg:flex-1'
          } flex-col bg-slate-50 overflow-hidden relative`}
        >
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              const evalForMsg = evaluations[m.id];
              const isSelectedForEval = selectedMessageForEval === m.id;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-3xl mx-auto w-full`}
                >
                  {/* Sender & timestamp header */}
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {isUser ? 'Human Evaluator' : 'Sentralogis Copilot'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!isUser && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200">
                        {m.dataSource}
                      </span>
                    )}
                  </div>

                  {/* Message Bubble Container */}
                  <div
                    className={`rounded-2xl p-4 shadow-sm text-sm ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none w-full space-y-3'
                    }`}
                  >
                    {/* Message content */}
                    {m.content && (
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {m.content}
                      </div>
                    )}

                    {/* Understanding Block */}
                    {m.understanding && (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Interpretasi Intent & Entitas:
                        </div>
                        {m.understanding.customer && (
                          <div className="text-slate-600">
                            <span className="font-semibold text-slate-700">Customer:</span> {m.understanding.customer}
                          </div>
                        )}
                        {m.understanding.object && (
                          <div className="text-slate-600">
                            <span className="font-semibold text-slate-700">Objek:</span> {m.understanding.object}
                          </div>
                        )}
                        {m.understanding.condition && (
                          <div className="text-slate-600">
                            <span className="font-semibold text-slate-700">Kondisi:</span> {m.understanding.condition}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Proposal Block */}
                    {m.proposal && (
                      <div className="p-4 rounded-xl bg-amber-50/70 border-2 border-amber-300 text-xs space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                            {m.proposal.title}
                          </span>
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-700 border border-rose-300">
                            NOT EXECUTED
                          </span>
                        </div>
                        <p className="text-amber-800">{m.proposal.description}</p>
                        <div className="space-y-1 bg-white p-2.5 rounded-lg border border-amber-200">
                          {m.proposal.changes.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600 font-medium">{c.field}:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="line-through text-slate-400">{c.from}</span>
                                <span>→</span>
                                <span className="font-bold text-emerald-700">{c.to}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[11px] text-amber-700 italic">
                          Alasan: {m.proposal.reason}
                        </div>
                      </div>
                    )}

                    {/* Entity References Badges */}
                    {m.entityRefs && m.entityRefs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.entityRefs.map((ref) => (
                          <span
                            key={ref.id}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            <FileText className="w-3 h-3 text-slate-400" />
                            {ref.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inline Evaluation Action Row for Assistant Messages */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mt-1.5 px-1">
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-xs">
                        <button
                          onClick={() => handleRateMessage(m.id, 'ACCEPT')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                            evalForMsg?.rating === 'ACCEPT'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                          title="Tandai respons sebagai ACCEPT"
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => handleRateMessage(m.id, 'CORRECT')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                            evalForMsg?.rating === 'CORRECT'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                          title="Tandai respons sebagai CORRECT"
                        >
                          Correct
                        </button>
                        <button
                          onClick={() => handleRateMessage(m.id, 'INCORRECT')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                            evalForMsg?.rating === 'INCORRECT'
                              ? 'bg-rose-600 text-white'
                              : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                          title="Tandai respons sebagai INCORRECT"
                        >
                          ✕ Incorrect
                        </button>
                        <button
                          onClick={() => handleRateMessage(m.id, 'NEEDS_CLARIFICATION')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                            evalForMsg?.rating === 'NEEDS_CLARIFICATION'
                              ? 'bg-amber-500 text-white'
                              : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                          title="Tandai respons sebagai NEEDS CLARIFICATION"
                        >
                          ? Clarify
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedMessageForEval(m.id);
                          setShowRightPanel(true);
                          setActiveMobileTab('eval');
                        }}
                        className={`text-[11px] px-2 py-1 rounded-md border font-medium transition-colors ${
                          isSelectedForEval
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'border-transparent text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {evalForMsg ? 'Edit Evaluasi' : '+ Evaluasi Rinci'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* ─── Input Bar ─── */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="max-w-3xl mx-auto flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik instruksi operasional dalam bahasa Indonesia..."
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all bg-slate-50 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-sm flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Kirim</span>
              </button>
            </form>
          </div>
        </main>

        {/* ─── RIGHT COLUMN: Entity Details & Evaluation Scorecard ─── */}
        <aside
          className={`${
            showRightPanel ? 'w-80 xl:w-96' : 'hidden'
          } ${
            activeMobileTab === 'eval' ? 'flex w-full' : 'hidden lg:flex'
          } bg-white border-l border-slate-200 flex-col overflow-y-auto shrink-0 transition-all`}
        >
          {/* Scorecard Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                Scorecard Evaluasi Manusia
              </h2>
              <p className="text-[11px] text-slate-500">In-Memory Session Only</p>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-slate-900">{evalCount}</span>
              <span className="text-[11px] text-slate-400 block">Dievaluasi</span>
            </div>
          </div>

          {/* Evaluation Stats Tally */}
          <div className="grid grid-cols-4 gap-1 p-3 border-b border-slate-200 text-center text-xs">
            <div className="p-2 rounded bg-emerald-50 text-emerald-800">
              <div className="font-bold text-sm">{acceptCount}</div>
              <div className="text-[10px] text-emerald-600">Accept</div>
            </div>
            <div className="p-2 rounded bg-blue-50 text-blue-800">
              <div className="font-bold text-sm">{correctCount}</div>
              <div className="text-[10px] text-blue-600">Correct</div>
            </div>
            <div className="p-2 rounded bg-rose-50 text-rose-800">
              <div className="font-bold text-sm">{incorrectCount}</div>
              <div className="text-[10px] text-rose-600">Incorrect</div>
            </div>
            <div className="p-2 rounded bg-amber-50 text-amber-800">
              <div className="font-bold text-sm">{needsClarificationCount}</div>
              <div className="text-[10px] text-amber-600">Clarify</div>
            </div>
          </div>

          {/* Active Message Detailed Evaluation Form */}
          {selectedMessageForEval ? (
            <div className="p-4 space-y-4 flex-1">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Pesan Respons:
                </span>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {selectedMessageForEval}
                </span>
              </div>

              {/* Rating Radio Buttons */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tingkat Penerimaan:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['ACCEPT', 'CORRECT', 'INCORRECT', 'NEEDS_CLARIFICATION'] as HumanEvaluationRating[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRateMessage(selectedMessageForEval, r)}
                      className={`p-2 rounded-lg border text-xs font-semibold text-left transition-all ${
                        currentEval?.rating === r
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {r === 'ACCEPT' && '✓ Accept'}
                      {r === 'CORRECT' && '• Correct'}
                      {r === 'INCORRECT' && '✕ Incorrect'}
                      {r === 'NEEDS_CLARIFICATION' && '? Clarify'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimensions Checklist (A–J) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Dimensi Evaluasi (A – J):
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {(Object.keys(EVALUATION_DIMENSION_LABELS) as EvaluationDimension[]).map((dimKey) => {
                    const dim = EVALUATION_DIMENSION_LABELS[dimKey];
                    const isChecked = currentEval?.dimensions?.[dimKey] ?? true;

                    return (
                      <label
                        key={dimKey}
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            handleRateMessage(
                              selectedMessageForEval,
                              currentEval?.rating || 'ACCEPT',
                              currentEval?.correctionNote,
                              { [dimKey]: e.target.checked }
                            );
                          }}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">
                            [{dim.code}] {dim.label}
                          </div>
                          <div className="text-[10px] text-slate-500">{dim.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Human Correction Note */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Catatan Koreksi Manusia (Feedback):
                </label>
                <textarea
                  rows={3}
                  value={currentEval?.correctionNote || ''}
                  onChange={(e) =>
                    handleRateMessage(
                      selectedMessageForEval,
                      currentEval?.rating || 'ACCEPT',
                      e.target.value
                    )
                  }
                  placeholder="Tuliskan catatan evaluasi, ketidaksesuaian entitas, atau perbaikan respons..."
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs my-auto">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Pilih salah satu respons Copilot untuk meninjau atau menambahkan evaluasi rinci.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
