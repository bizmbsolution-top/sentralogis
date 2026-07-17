"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, Send, X, Sparkles, ArrowRight, BookOpen, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { useChat } from "@/lib/contexts/ChatContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { findBestTopic } from "@/lib/help/faqResponder";
import { getTopicsByRole, helpTopics, HelpTopic } from "@/lib/help/helpData";
import { useRouter } from "next/navigation";

interface HelpChatDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpChatDrawer({ open, onClose }: HelpChatDrawerProps) {
  const [message, setMessage] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { activeChannel, messages, sendMessage, loadingMessages } = useChat();
  const { profile } = useAuth();
  const router = useRouter();
  const currentUserId = profile?.id;
  const [ephemeralBotMessages, setEphemeralBotMessages] = useState<
    { id: string; message: string; created_at: string; href?: string; hrefLabel?: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const rawRole = profile?.role || "USER";
  const roleUpper = rawRole.toUpperCase();

  // Determine Role Display Name & Badge Icon
  let roleDisplayName = "Staff Operasional";
  let roleBadgeText = "👤 User";
  if (roleUpper.includes("CS") || roleUpper.includes("HQ") || roleUpper === "CUSTOMER_SERVICE") {
    roleDisplayName = "Customer Service (HQ)";
    roleBadgeText = "🎧 CS HQ";
  } else if (roleUpper.includes("ADMIN") || roleUpper.includes("OWNER") || roleUpper.includes("SUPERADMIN")) {
    roleDisplayName = "Tenant Administrator";
    roleBadgeText = "🏢 Tenant Admin";
  } else if (roleUpper.includes("TRUCKING") || roleUpper.includes("DISPATCH") || (roleUpper.includes("OPS") && !roleUpper.includes("WAREHOUSE"))) {
    roleDisplayName = "SBU Trucking Dispatcher";
    roleBadgeText = "🚚 Trucking Ops";
  } else if (roleUpper.includes("WAREHOUSE") || roleUpper.includes("GUDANG") || roleUpper.includes("WMS")) {
    roleDisplayName = "SBU Warehouse Operator";
    roleBadgeText = "📦 Warehouse Ops";
  } else if (roleUpper.includes("DRIVER") || roleUpper.includes("SUPIR")) {
    roleDisplayName = "Driver Lapangan";
    roleBadgeText = "👨‍✈️ Driver";
  } else if (roleUpper.includes("FINANCE") || roleUpper.includes("ACCOUNTING") || roleUpper.includes("INVOICE")) {
    roleDisplayName = "SBU Finance & Billing";
    roleBadgeText = "💰 Finance";
  }

  // Get filtered topics tailored specifically for the detected role
  const roleTopics: HelpTopic[] = getTopicsByRole(rawRole);

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
    // Pass user's role to prioritize role-specific topics
    const matched = findBestTopic(text, rawRole);
    if (matched) {
      const botMessage = matched.answer;
      setEphemeralBotMessages((s) => [
        ...s,
        {
          id: `bot-${Date.now()}`,
          message: botMessage,
          created_at: new Date().toISOString(),
          href: matched.href,
          hrefLabel: matched.hrefLabel,
        },
      ]);
      await persistBotReply(botMessage);
      return;
    }

    try {
      const response = await fetch("/api/help/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, channelId: activeChannel?.id, role: rawRole }),
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
      setEphemeralBotMessages((s) => [
        ...s,
        {
          id: `bot-${Date.now()}`,
          message: `Maaf, saya belum menemukan jawaban pasti untuk topik tersebut. Silakan pilih panduan dari menu Dropdown Tutorial Khusus [${roleDisplayName}] di bawah atau coba kata kunci lain.`,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isSending) return;
    const qText = text.trim();
    setMessage("");
    setIsSending(true);

    try {
      if (activeChannel) {
        await sendMessage(qText);
      } else {
        setEphemeralBotMessages((s) => [
          ...s,
          {
            id: `user-${Date.now()}`,
            message: qText,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      await handleBotResponse(qText);
    } catch (error) {
      console.error("[HelpChatDrawer] Failed to send chat message", error);
      toast.error("Gagal mengirim pesan. Coba lagi.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle dropdown selection
  const handleDropdownSelect = async (topicId: string) => {
    setSelectedTopicId(topicId);
    if (!topicId) return;

    const chosen = roleTopics.find((t) => t.id === topicId) || helpTopics.find((t) => t.id === topicId);
    if (!chosen) return;

    setEphemeralBotMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        message: `💡 Tanya Tutorial: ${chosen.title}`,
        created_at: new Date().toISOString(),
      },
      {
        id: `bot-${Date.now() + 1}`,
        message: chosen.answer,
        created_at: new Date().toISOString(),
        href: chosen.href,
        hrefLabel: chosen.hrefLabel,
      },
    ]);

    // Reset dropdown selector after triggering
    setTimeout(() => setSelectedTopicId(""), 300);

    if (activeChannel) {
      try {
        await fetch("/api/help/persist-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: activeChannel.id,
            message: chosen.answer,
          }),
        });
      } catch (e) {
        console.debug("[HelpChatDrawer] persist-bot failed", e);
      }
    }
  };

  // Auto-scroll when messages update
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length, ephemeralBotMessages.length, open]);

  if (!open) return null;

  const userName = profile?.full_name || profile?.email?.split("@")[0] || "Administrator";

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 md:p-6 pointer-events-auto animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Floating Robot Chat Box Modal */}
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[86vh] animate-scale-up">
        
        {/* Header with Glowing Animated Robot, Role Detection & Greeting */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white relative overflow-hidden shrink-0">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
          <div className="absolute left-1/3 -bottom-8 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                <Bot size={28} className="animate-pulse" />
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-slate-900 text-[8px] font-black text-white">
                  ✓
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                    <ShieldCheck size={11} className="text-blue-300" /> {roleBadgeText}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight mt-1.5">
                  Hello, {userName}! 👋
                </h2>
                <p className="text-xs font-medium text-slate-300 mt-1">
                  Tutorial khusus peran <strong className="text-white underline decoration-blue-400">{roleDisplayName}</strong> siap membantu.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all shrink-0"
              title="Tutup Robot Chat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50 min-h-[220px]">
          {loadingMessages && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Welcome Message Bubble */}
          {messages.length === 0 && ephemeralBotMessages.length === 0 && !loadingMessages && (
            <div className="flex justify-start">
              <div className="max-w-[88%] p-4 bg-white text-slate-800 rounded-3xl rounded-tl-sm shadow-sm border border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                    <Bot size={14} /> Robot AI ({roleBadgeText})
                  </span>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Sistem Aktif
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 font-medium pt-1">
                  Halo <strong>{userName}</strong>! Sistem mendeteksi Anda masuk sebagai <strong>{roleDisplayName}</strong>. Anda bisa langsung memilih topik tutorial pada <strong>Dropdown Selector</strong> di bawah, atau ketik pertanyaan apa pun di kolom chat!
                </p>
              </div>
            </div>
          )}

          {/* Persisted Messages */}
          {messages.map((msg) => {
            const isUser = msg.sender_id === currentUserId;
            const bubbleClass = isUser
              ? "self-end bg-blue-600 text-white rounded-[1.75rem] rounded-tr-sm shadow-md shadow-blue-500/10"
              : "self-start bg-white text-slate-800 rounded-[1.75rem] rounded-tl-sm shadow-sm border border-slate-100";

            return (
              <div
                key={msg.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] p-4 ${bubbleClass}`}>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isUser ? "text-blue-100" : "text-blue-600"}`}>
                    {isUser ? "Anda" : `Robot (${roleBadgeText})`}
                  </div>
                  <div className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed font-medium">
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Ephemeral (Local) Messages & Answers */}
          {ephemeralBotMessages.map((b) => {
            const isUser = b.id.startsWith("user-");
            const bubbleClass = isUser
              ? "self-end bg-blue-600 text-white rounded-[1.75rem] rounded-tr-sm shadow-md shadow-blue-500/10"
              : "self-start bg-white text-slate-800 rounded-[1.75rem] rounded-tl-sm shadow-sm border border-slate-100";

            return (
              <div key={b.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] p-4 ${bubbleClass} space-y-3`}>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${isUser ? "text-blue-100" : "text-blue-600"}`}>
                    {isUser ? "Anda" : `Robot AI (${roleBadgeText})`}
                  </div>
                  <div className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed font-medium">
                    {b.message}
                  </div>

                  {/* Take Me There Button if href exists */}
                  {!isUser && b.href && (
                    <div className="pt-2 border-t border-slate-100/80 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          router.push(b.href!);
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        <span>🚀 {b.hrefLabel || "Bawa Saya ke Sana"}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Dropdown Selector Tutorial Khusus Role */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-100 shrink-0 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-blue-600">
              <BookOpen size={14} /> Pilih Tutorial Khusus [{roleDisplayName}]:
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
              {roleTopics.length} Topik
            </span>
          </div>
          <div className="relative">
            <select
              value={selectedTopicId}
              onChange={(e) => handleDropdownSelect(e.target.value)}
              className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 pr-8 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all cursor-pointer shadow-inner truncate"
            >
              <option value="">-- 💡 Pilih topik tutorial yang ingin Anda pelajari --</option>
              {roleTopics.map((topic) => (
                <option key={topic.id} value={topic.id} className="py-1">
                  📘 {topic.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Input Field Container */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  await handleSend(message);
                }
              }}
              placeholder={`Ketik pertanyaan Anda di sini, ${userName}...`}
              className="w-full h-13 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-14 text-sm text-slate-900 placeholder:text-slate-400 font-medium outline-none transition-all focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 shadow-inner"
              autoFocus
            />
            <button
              type="button"
              disabled={!message.trim() || isSending}
              onClick={async () => {
                await handleSend(message);
              }}
              className="absolute right-2 h-10 w-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all"
              title="Kirim Pertanyaan"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-medium text-slate-400">
            <span>Tekan <strong className="text-slate-600 font-bold">Enter</strong> untuk bertukar pesan dengan AI</span>
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <CheckCircle2 size={11} /> Role AI Ready
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
