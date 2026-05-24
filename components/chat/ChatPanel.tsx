"use client";

import { useEffect, useState, useRef } from 'react';
import { useChat, Channel } from '@/lib/contexts/ChatContext';
import ChatContextHeader from './ChatContextHeader';
import { MessageSquare, Send, Loader2, User, Pin, Users } from 'lucide-react';

interface ChatPanelProps {
  channelType: 'job_order' | 'work_order' | 'direct' | 'group';
  entityId: string;
  userId: string;
  tenantId?: string;
  channel?: Channel | null;
  onChannelReady?: (channel: Channel) => void;
}

export default function ChatPanel({ entityId, channelType, channel: initialChannel, onChannelReady }: ChatPanelProps) {
  const {
    activeChannel,
    messages,
    loadingMessages,
    sendingMessage,
    sendMessage,
    getOrCreateChannel,
    selectChannel,
    pinnedMessages,
    typingUsers,
    startTyping,
    stopTyping,
  } = useChat();

  const [input, setInput] = useState('');
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      if (initialChannel) {
        selectChannel(initialChannel);
        onChannelReady?.(initialChannel);
      } else {
        getOrCreateChannel(channelType as any, entityId).then((ch) => {
          if (ch) {
            selectChannel(ch);
            onChannelReady?.(ch);
          }
        });
      }
    }
  }, [initialized, channelType, entityId, initialChannel, getOrCreateChannel, selectChannel, onChannelReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
    stopTyping();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value) startTyping();
    else stopTyping();
  };

  const currentChannel = activeChannel || initialChannel;
  const isGroup = currentChannel?.channel_type === 'group';
  const isDirect = currentChannel?.channel_type === 'direct';

  return (
    <div className="flex flex-col h-full bg-[#0a0e27] rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isGroup ? 'bg-purple-500/20' : isDirect ? 'bg-green-500/20' : 'bg-blue-500/20'
        }`}>
          {isGroup ? <Users size={16} className="text-purple-400" /> :
           isDirect ? <User size={16} className="text-green-400" /> :
           <MessageSquare size={16} className="text-blue-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white text-sm font-semibold truncate block">
            {currentChannel?.title || currentChannel?.group_name || 'Discussion'}
          </span>
          {isGroup && currentChannel?.participants && (
            <span className="text-white/40 text-xs">{currentChannel.participants.length} members</span>
          )}
        </div>
        {loadingMessages && <Loader2 size={14} className="text-white/40 animate-spin" />}
      </div>

      {/* Context Header */}
      {currentChannel && (
        <ChatContextHeader
          contextType={currentChannel.channel_type}
          contextId={currentChannel.channel_id}
          title={currentChannel.title}
        />
      )}

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="px-4 py-2 border-b border-white/10 bg-yellow-500/5 space-y-1">
          {pinnedMessages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2 text-xs">
              <Pin size={10} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-yellow-400/80 font-medium">{msg.sender?.full_name}:</span>
                <span className="text-white/60 ml-1">{msg.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!currentChannel && !loadingMessages && (
          <p className="text-white/30 text-xs text-center mt-8">Opening chat...</p>
        )}
        {loadingMessages && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="text-white/40 animate-spin" />
          </div>
        )}
        {messages.length === 0 && !loadingMessages && currentChannel && (
          <p className="text-white/30 text-xs text-center mt-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="group">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-[10px] font-semibold">{msg.sender?.full_name?.charAt(0) || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-xs font-semibold truncate">
                    {msg.sender?.full_name || 'Unknown'}
                  </span>
                  {msg.sender?.role && (
                    <span className="text-white/20 text-[9px] px-1.5 py-0.5 rounded bg-white/5">{msg.sender.role}</span>
                  )}
                  <span className="text-white/20 text-[10px]">
                    {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{msg.message}</p>
              </div>
            </div>
            {/* Replies */}
            {msg.replies && msg.replies.length > 0 && (
              <div className="ml-10 mt-2 space-y-2 border-l-2 border-white/10 pl-3">
                {msg.replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-[8px] font-semibold">{reply.sender?.full_name?.charAt(0) || 'U'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-[11px] font-semibold">{reply.sender?.full_name || 'Unknown'}</span>
                        <span className="text-white/20 text-[10px]">{new Date(reply.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-white/70 text-sm">{reply.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 border-t border-white/5 bg-white/5">
          <p className="text-white/30 text-xs italic">
            {typingUsers.length === 1 ? 'Someone' : `${typingUsers.length} people`} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </p>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 p-3 bg-white/5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            disabled={!currentChannel || sendingMessage}
            className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/25 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendingMessage || !currentChannel}
            className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 flex items-center justify-center transition-colors"
          >
            {sendingMessage ? <Loader2 size={14} className="text-white animate-spin" /> : <Send size={14} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
