'use client';

import React, { useState, useEffect } from 'react';
import { PanelLeft, PanelRight, Bot, X, MessageSquarePlus, RefreshCw } from 'lucide-react';
import { CopilotV2Provider, useCopilotV2 } from './CopilotV2Provider';
import { ContextPanel } from './ContextPanel';
import { CopilotConversation } from './CopilotConversation';
import { DetailPanel } from './DetailPanel';

// ---------------------------------------------------------------------------
// Breakpoint constants
// ---------------------------------------------------------------------------

const BP_MD = 768;   // tablet
const BP_LG = 1024;  // laptop
const BP_XL = 1280;  // desktop

// ---------------------------------------------------------------------------
// Mobile overlay
// ---------------------------------------------------------------------------

function Overlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/40 z-[60] transition-opacity"
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Inner workspace (needs provider context)
// ---------------------------------------------------------------------------

function WorkspaceInner() {
  const {
    detailPanel,
    isMobileDetailOpen,
    isMobileContextOpen,
    closeMobileDetail,
    closeMobileContext,
    openMobileContext,
    clearConversation,
    startNewChat,
    conversationTitle,
    isLoadingMessages,
    activeScope,
    setActiveScope,
  } = useCopilotV2();

  const [showContext, setShowContext] = useState(true);
  const [showDetail, setShowDetail] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Responsive detection
  useEffect(() => {
    function check() {
      const w = window.innerWidth;
      setIsMobile(w < BP_MD);
      setIsTablet(w >= BP_MD && w < BP_XL);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const hasDetail = detailPanel.type !== 'empty';

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ─── Top bar ─── */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-50">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          {isMobile ? (
            <button
              onClick={openMobileContext}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label="Open active context"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setShowContext((p) => !p)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label={showContext ? 'Hide context panel' : 'Show context panel'}
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveScope(activeScope === 'sbu' ? 'cs' : 'sbu')}
            title="Klik untuk beralih mode Copilot CS / SBU"
            className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 transition-colors ${
              activeScope === 'sbu'
                ? 'text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100'
                : 'text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100'
            }`}
          >
            {activeScope === 'sbu' ? 'SBU OPS' : 'CS COMM'}
          </button>
          <span className="text-xs font-medium text-slate-700 truncate max-w-[200px] sm:max-w-[340px]">
            {conversationTitle || 'Percakapan Baru'}
          </span>
          {isLoadingMessages ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Memuat...</span>
            </span>
          ) : null}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={startNewChat}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
            title="New Chat"
            aria-label="Start new conversation"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          {!isMobile && (
            <button
              onClick={() => setShowDetail((p) => !p)}
              className={`p-2 rounded-lg hover:bg-slate-100 transition-colors ${
                showDetail && hasDetail ? 'text-blue-600' : 'text-slate-400'
              }`}
              aria-label={showDetail ? 'Hide detail panel' : 'Show detail panel'}
            >
              <PanelRight className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={clearConversation}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            title="New conversation"
            aria-label="Reset conversation"
          >
            <Bot className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ─── Main area ─── */}
      <div className="flex flex-1 min-h-0">
        {/* Context panel — desktop */}
        {!isMobile && showContext && (
          <aside
            className="w-64 shrink-0 transition-all duration-200 ease-in-out"
            style={{ maxWidth: showContext ? 256 : 0 }}
          >
            <ContextPanel />
          </aside>
        )}

        {/* Copilot conversation */}
        <main className="flex-1 min-w-0">
          <CopilotConversation />
        </main>

        {/* Detail panel — desktop (xl+) */}
        {!isMobile && !isTablet && showDetail && hasDetail && (
          <aside className="w-80 shrink-0 border-l border-slate-200 transition-all duration-200 ease-in-out">
            <DetailPanel />
          </aside>
        )}
      </div>

      {/* ─── Mobile context sheet (left) ─── */}
      {isMobile && (
        <>
          <Overlay open={isMobileContextOpen} onClose={closeMobileContext} />
          <div
            className={`fixed inset-y-0 left-0 w-72 z-[70] bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
              isMobileContextOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Active context"
          >
            <div className="flex items-center justify-end p-2">
              <button
                onClick={closeMobileContext}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
                aria-label="Close active context"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ContextPanel />
          </div>
        </>
      )}

      {/* ─── Mobile/tablet detail sheet (right) ─── */}
      {(isMobile || isTablet) && (
        <>
          <Overlay open={isMobileDetailOpen} onClose={closeMobileDetail} />
          <div
            className={`fixed inset-y-0 right-0 z-[70] bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
              isMobile ? 'w-full' : 'w-96'
            } ${isMobileDetailOpen ? 'translate-x-0' : 'translate-x-full'}`}
            role="dialog"
            aria-modal="true"
            aria-label="Entity detail"
          >
            <DetailPanel />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function CopilotWorkspace() {
  return (
    <CopilotV2Provider>
      <WorkspaceInner />
    </CopilotV2Provider>
  );
}
