"use client";

import React, { useState } from "react";
import {
  Bot,
  MessageSquarePlus,
  MessageSquare,
  Clock,
  RefreshCw,
  Pencil,
  Check,
  X,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useCopilotV2 } from "./CopilotV2Provider";
import type { EntityReference, RecentConversationItem } from "./types";

const IS_PRODUCTION = typeof process !== "undefined" && process.env.NODE_ENV === "production";

function formatRelativeTime(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}j lalu`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}h lalu`;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function ContextPanel() {
  const {
    selectEntity,
    activeEntityRefs,
    conversationId,
    recentConversations,
    isLoadingRecents,
    isLoadingMessages,
    recentsError,
    startNewChat,
    selectConversation,
    refreshRecents,
    renameConversation,
    deleteConversation,
    closeMobileContext,
  } = useCopilotV2();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const items = IS_PRODUCTION
    ? Array.isArray(activeEntityRefs)
      ? activeEntityRefs
      : []
    : Array.isArray(activeEntityRefs)
      ? activeEntityRefs
      : [];

  const handleStartNewChat = () => {
    startNewChat();
    closeMobileContext();
  };

  const handleSelectConversation = async (id: string) => {
    await selectConversation(id);
    closeMobileContext();
  };

  const handleBeginRename = (e: React.MouseEvent, item: RecentConversationItem) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditingTitle(item.title || "");
  };

  const handleSaveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      await renameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingTitle("");
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteConversation(id);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* New Chat Button */}
      <div className="p-3 border-b border-slate-100 shrink-0">
        <button
          type="button"
          onClick={handleStartNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          aria-label="New Chat"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Scrollable Recents + Active Context */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4" aria-label="Active context">
        {/* Recents Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Recents
            </span>
            <button
              type="button"
              onClick={() => void refreshRecents()}
              disabled={isLoadingRecents}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Segarkan Recents"
              aria-label="Refresh recent conversations"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingRecents ? "animate-spin" : ""}`} />
            </button>
          </div>

          {recentsError ? (
            <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{recentsError}</span>
              </div>
              <button
                type="button"
                onClick={() => void refreshRecents()}
                className="text-[10px] font-semibold text-amber-700 underline hover:text-amber-900"
              >
                Coba Lagi
              </button>
            </div>
          ) : null}

          {isLoadingRecents && recentConversations.length === 0 ? (
            <div className="px-2 py-3 text-[11px] text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Memuat histori percakapan...</span>
            </div>
          ) : recentConversations.length === 0 ? (
            <div className="px-2 py-3 text-[11px] text-slate-400">
              Belum ada percakapan tersimpan. Mulai chat untuk menyimpan histori otomatis.
            </div>
          ) : (
            <div className="space-y-1">
              {recentConversations.map((conv) => {
                const isActive = conv.id === conversationId;
                const isEditing = editingId === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      if (!isEditing && !isLoadingMessages) {
                        void handleSelectConversation(conv.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !isEditing) {
                        e.preventDefault();
                        void handleSelectConversation(conv.id);
                      }
                    }}
                    className={`group w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-blue-50/90 border border-blue-200 text-blue-900"
                        : "hover:bg-slate-50 border border-transparent text-slate-700"
                    }`}
                  >
                    <MessageSquare
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        isActive ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full text-xs px-1.5 py-0.5 rounded border border-blue-300 bg-white text-slate-800 outline-none"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={(e) => void handleSaveRename(e, conv.id)}
                            className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            aria-label="Simpan judul"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"
                            aria-label="Batal ubah judul"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs truncate flex-1 ${
                                isActive ? "font-semibold text-blue-900" : "font-medium text-slate-700"
                              }`}
                            >
                              {conv.title || "Percakapan Baru"}
                            </span>
                            {isActive ? (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 shrink-0">
                                Aktif
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="w-2.5 h-2.5" />
                              {formatRelativeTime(conv.lastActivityAt)}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => handleBeginRename(e, conv)}
                                className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                                title="Ubah judul"
                                aria-label="Rename conversation"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => void handleDeleteConversation(e, conv.id)}
                                className="p-0.5 text-slate-400 hover:text-red-600 rounded"
                                title="Arsipkan percakapan"
                                aria-label="Delete conversation"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Context Section */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Active Context
          </div>
          {items.length === 0 ? (
            <div className="text-[10px] text-slate-400 px-1 py-2">No active context</div>
          ) : (
            items.map((entity: EntityReference) => (
              <button
                key={entity.id}
                onClick={() =>
                  selectEntity({
                    type: entity.type as EntityReference["type"],
                    id: entity.id,
                    label: entity.label,
                    status: entity.status,
                  })
                }
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="text-xs text-slate-700 truncate flex-1">{entity.label}</span>
                {entity.status ? (
                  <span className="text-[9px] text-slate-400 shrink-0">{entity.status}</span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3 shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <Bot className="w-3 h-3" />
          <span>Powered by Sentralogis Intelligence</span>
        </div>
      </div>
    </div>
  );
}
