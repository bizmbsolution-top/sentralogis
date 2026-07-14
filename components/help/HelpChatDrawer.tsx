"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Send, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useChat } from "@/lib/contexts/ChatContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { findBestTopic, findTopTopics } from "@/lib/help/faqResponder";

interface HelpChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpChatDrawer({ open, onClose }: HelpChatDrawerProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { activeChannel, messages, sendMessage, loadingMessages } = useChat();
  const { profile } = useAuth();
  const currentUserId = profile?.id;
  const [ephemeralBotMessages, setEphemeralBotMessages] = useState<
    { id: string; message: string; created_at: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const persistBotReply = async (replyMessage: string) => {
    if (!activeChannel) return;
    try {
      await fetch("/api/help/persist-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: activeChannel.id,
          message: replyMessage,
        }),
      });
    } catch (e) {
      console.debug("[HelpChatDrawer] persist-bot failed", e);
    }
  };

  const handleBotResponse = async (text: string) => {
    const matched = findBestTopic(text);
    if (matched) {
      const botMessage = matched.answer;
      setEphemeralBotMessages((s) => [
        ...s,
        {
          id: `bot-${Date.now()}`,
          message: botMessage,
          created_at: new Date().toISOString(),
        },
      ]);
      await persistBotReply(botMessage);
      return;
    }

    try {
      const response = await fetch("/api/help/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, channelId: activeChannel?.id }),
      });
      const data = await response.json();
      if (data.answer) {
        const botMessage = data.answer;
        setEphemeralBotMessages((s) => [
          ...s,
          {
            id: `bot-${Date.now()}`,
            message: botMessage,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.debug("[HelpChatDrawer] rag call failed", e);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isSending || !activeChannel) return;
    setIsSending(true);
    try {
      await sendMessage(text);
      await handleBotResponse(text);
      setMessage("");
    } catch (error) {
      console.error("[HelpChatDrawer] Failed to send chat message", error);
      toast.error("Gagal mengirim pesan. Coba lagi.");
    } finally {
      setIsSending(false);
    }
  };

  // Auto-scroll when messages or ephemeral bot messages update
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages.length, ephemeralBotMessages.length]);

  // Update suggestions while typing
  useEffect(() => {
    if (!message.trim()) {
      setSuggestions([]);
      return;
    }
    const tops = findTopTopics(message, 4);
    setSuggestions(tops);
  }, [message]);

  return (
    <div
      className={`fixed inset-0 z-[1200] transition-all ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 transition-transform transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-700">
              <Bot size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Robot Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 h-full flex flex-col">
          <div className="flex-1 overflow-y-auto pb-4 space-y-4">
            {loadingMessages && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
              </div>
            )}

            {!loadingMessages && messages.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Chat AI siap membantu. Ketik pertanyaan Anda dan tekan Enter.
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.sender_id === currentUserId;
              const bubbleClass = isUser
                ? "self-end bg-slate-900 text-white rounded-[2rem] rounded-br-[0.75rem]"
                : "self-start bg-slate-100 text-slate-900 rounded-[2rem] rounded-bl-[0.75rem]";

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] p-4 ${bubbleClass} shadow-sm`}>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-2">
                      {isUser ? "Anda" : "Robot"}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-6">
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })}
            {ephemeralBotMessages.map((b) => (
              <div key={b.id} className={`flex justify-start`}>
                <div
                  className={`max-w-[85%] p-4 self-start bg-slate-100 text-slate-900 rounded-[2rem] rounded-bl-[0.75rem] shadow-sm`}
                >
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500 mb-2">
                    Robot
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-6">
                    {b.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          <div className="mt-4">
            <div className="relative">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={async (event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    await handleSend(message);
                  }
                }}
                rows={4}
                placeholder="Tulis pertanyaan Anda di sini..."
                className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 pr-16 text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
              <button
                type="button"
                disabled={!message.trim() || isSending || !activeChannel}
                onClick={async () => {
                  await handleSend(message);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
            <div className="mt-2 text-right text-xs text-slate-500">
              Tekan Enter untuk mengirim, Shift+Enter untuk baris baru.
            </div>

            {/* Suggestions based on input */}
            {suggestions.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="text-sm text-slate-600">
                  Saran topik terkait
                </div>
                <div className="flex gap-3 flex-wrap">
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-w-[48%]"
                    >
                      <div className="font-semibold text-sm text-slate-900">
                        {s.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {s.description}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!activeChannel) return;
                            setEphemeralBotMessages((prev) => [
                              ...prev,
                              {
                                id: `bot-${Date.now()}`,
                                message: s.answer,
                                created_at: new Date().toISOString(),
                              },
                            ]);
                            try {
                              await fetch("/api/help/persist-bot", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  channelId: activeChannel.id,
                                  message: s.answer,
                                }),
                              });
                            } catch (e) {
                              console.debug(
                                "[HelpChatDrawer] persist-bot failed",
                                e,
                              );
                            }
                          }}
                          className="text-xs px-2 py-1 rounded-full bg-slate-900 text-white"
                        >
                          Tambah ke chat
                        </button>
                        <a
                          href={`#help-topic-${s.id}`}
                          className="text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-700"
                        >
                          Lihat
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
