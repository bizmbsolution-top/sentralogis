'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Search, ChevronLeft, Send, User } from 'lucide-react';
import { format } from 'date-fns';

export default function MobileChat() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Active Chat State
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) fetchChannels();
  }, [user]);

  useEffect(() => {
    if (activeChannel) {
      fetchMessages(activeChannel.id);
      
      const channelSub = supabase.channel(`public:chat_messages:channel_id=eq.${activeChannel.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${activeChannel.id}` }, (payload) => {
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        })
        .subscribe();
        
      return () => { supabase.removeChannel(channelSub); };
    }
  }, [activeChannel]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  async function fetchChannels() {
    setLoading(true);
    try {
      // Fetch leads assigned to user
      const { data: leads } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('sales_rep_id', user?.id);

      if (!leads || leads.length === 0) {
        setChannels([]);
        return;
      }

      const leadIds = leads.map(l => l.id);

      // Fetch channels for these leads
      const { data: chs } = await supabase
        .from('chat_channels')
        .select('id, channel_id')
        .eq('channel_type', 'lead')
        .in('channel_id', leadIds);

      if (chs) {
        const enriched = chs.map(c => {
          const lead = leads.find(l => l.id === c.channel_id);
          return { ...c, lead_name: lead?.name || 'Unknown' };
        });
        setChannels(enriched);
      }
    } catch (err: any) {
      console.warn("Fetch channels err:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(channelId: string) {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select(`id, sender_id, message, created_at, guest_sender_name, profiles(full_name)`)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });
        
      setMessages(data || []);
      scrollToBottom();
    } catch (err) {
      console.warn(err);
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    try {
      await supabase.from('chat_messages').insert([{
        channel_id: activeChannel.id,
        sender_id: user?.id,
        message: newMessage.trim()
      }]);
      setNewMessage('');
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  if (activeChannel) {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-50 fixed inset-0 z-[1000]">
        {/* Chat Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button onClick={() => setActiveChannel(null)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 text-sm truncate">{activeChannel.lead_name}</h2>
            <p className="text-[10px] text-emerald-500 font-medium">Guest Chat Portal</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'}`}>
                  {msg.message}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">
                  {format(new Date(msg.created_at), 'HH:mm')}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 p-3 pb-8">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..." 
              className="flex-1 bg-slate-100 border-transparent rounded-full px-5 py-3 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <button type="submit" disabled={!newMessage.trim()} className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 shrink-0 active:scale-95 transition-transform">
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative">
      <div className="bg-white px-6 pt-10 pb-4 border-b border-slate-100 sticky top-0 z-20">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Messages</h1>
      </div>

      <div className="flex-1 p-2">
        {loading ? (
          <div className="text-center py-10 text-sm text-slate-400">Loading chats...</div>
        ) : channels.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-600">No active chats.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {channels.map(ch => (
              <button 
                key={ch.id} 
                onClick={() => setActiveChannel(ch)}
                className="w-full bg-white p-4 flex items-center gap-4 active:bg-slate-50 transition-colors rounded-xl"
              >
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex-1 text-left min-w-0 border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{ch.lead_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tap to view conversation</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
