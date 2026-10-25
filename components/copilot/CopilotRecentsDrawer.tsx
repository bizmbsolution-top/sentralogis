'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  X,
  MessageSquarePlus,
  MessageSquare,
  Clock,
  RefreshCw,
  ArrowUpRight,
  AlertCircle,
  Send,
} from 'lucide-react';
import { useOptionalCopilotV2 } from './v2/CopilotV2Provider';

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j lalu`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}h lalu`;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export default function CopilotRecentsDrawer() {
  const copilot = useOptionalCopilotV2();
  const router = useRouter();
  const pathname = usePathname();
  const [quickPrompt, setQuickPrompt] = useState('');

  if (!copilot || !copilot.isRecentsOpen) {
    return null;
  }

  const {
    conversationId,
    conversationTitle,
    recentConversations,
    messages,
    isProcessing,
    isLoadingRecents,
    isLoadingMessages,
    recentsError,
    startNewChat,
    selectConversation,
    refreshRecents,
    sendMessage,
    closeRecents,
  } = copilot;

  const isOnCopilotPage = pathname?.startsWith('/copilot');

  const handleOpenInCopilot = () => {
    closeRecents();
    if (!isOnCopilotPage) {
      router.push('/copilot/v2');
    }
  };

  const handleNewChat = () => {
    startNewChat();
    if (!isOnCopilotPage) {
      closeRecents();
      router.push('/copilot/v2');
    } else {
      closeRecents();
    }
  };

  const handleSelectRecent = async (id: string) => {
    await selectConversation(id);
  };

  const handleQuickSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim() || isProcessing) return;
    sendMessage(quickPrompt.trim());
    setQuickPrompt('');
  };

  const visibleMessages = messages.slice(-6);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-[80] transition-opacity"
        onClick={closeRecents}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[90] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Copilot Recents & Active Conversation"
      >
        {/* Header */}
        <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                Copilot Recents
              </h2>
              <p className="text-[10px] text-slate-400 truncate">
                Histori percakapan lintas workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleNewChat}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
              aria-label="Start new Copilot chat"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
            <button
              type="button"
              onClick={closeRecents}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              aria-label="Close Copilot Recents"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Conversation Continuity Card */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Percakapan Aktif
              </span>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {conversationTitle || 'Percakapan Baru'}
              </div>
            </div>
            {!isOnCopilotPage && (
              <button
                type="button"
                onClick={handleOpenInCopilot}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
              >
                <span>Buka Copilot</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Recent turns in active conversation */}
          <div className="max-h-44 overflow-y-auto rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2.5 space-y-2">
            {isLoadingMessages ? (
              <div className="text-xs text-slate-400 flex items-center gap-2 py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Memuat pesan percakapan...</span>
              </div>
            ) : (
              visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={`text-xs rounded-md px-2.5 py-1.5 ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white ml-6'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 mr-4'
                  }`}
                >
                  <div className="line-clamp-3 whitespace-pre-wrap">
                    {m.content ||
                      m.proposal?.description ||
                      m.proposal?.title ||
                      m.results?.summary ||
                      'Respons Copilot'}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick message bar so user can continue chatting from any workspace */}
          <form onSubmit={handleQuickSend} className="flex items-center gap-1.5">
            <input
              type="text"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="Lanjutkan instruksi di percakapan ini..."
              disabled={isProcessing}
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!quickPrompt.trim() || isProcessing}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors"
              aria-label="Kirim pesan ke Copilot"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Recents List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Daftar Recents ({recentConversations.length})
            </span>
            <button
              type="button"
              onClick={() => void refreshRecents()}
              disabled={isLoadingRecents}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              aria-label="Refresh Recents"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecents ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {recentsError ? (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{recentsError}</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshRecents()}
                className="text-xs font-semibold underline shrink-0 ml-2"
              >
                Coba Lagi
              </button>
            </div>
          ) : null}

          {isLoadingRecents && recentConversations.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span>Memuat histori percakapan...</span>
            </div>
          ) : recentConversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Belum ada percakapan tersimpan.
            </div>
          ) : (
            <div className="space-y-1.5">
              {recentConversations.map((conv) => {
                const isActive = conv.id === conversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => void handleSelectRecent(conv.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void handleSelectRecent(conv.id);
                      }
                    }}
                    className={`w-full flex items-start justify-between gap-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200/70 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <MessageSquare
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isActive ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs truncate ${
                              isActive
                                ? 'font-bold text-blue-900 dark:text-blue-200'
                                : 'font-medium text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {conv.title || 'Percakapan Baru'}
                          </span>
                          {isActive ? (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">
                              Aktif
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(conv.lastActivityAt)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSelectRecent(conv.id).then(() => {
                          handleOpenInCopilot();
                        });
                      }}
                      className="text-[11px] font-medium text-blue-600 hover:underline shrink-0"
                    >
                      Buka
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
