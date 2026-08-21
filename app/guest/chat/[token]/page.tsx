'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Send, User } from 'lucide-react';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  message: string;
  guest_sender_name: string | null;
  sender_id: string | null;
  created_at: string;
}

export default function GuestChatPortal() {
  const params = useParams();
  const token = params.token as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      fetchMessages();
      
      // Setup Realtime Subscription
      const channel = supabase.channel(`guest-chat-${token}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => {
            // Because we don't have the channel_id easily without another query,
            // we will just refetch messages to ensure order and filtering via RPC
            // A more optimized way would verify channel_id, but this is simple for the POC.
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_guest_get_messages', {
        p_token: token
      });

      if (error) throw error;
      setMessages((data as any) || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Optimistic clear

    try {
      const { error } = await supabase.rpc('rpc_guest_send_message', {
        p_token: token,
        p_message: messageText
      });

      if (error) throw error;
      await fetchMessages(); // Refresh to show the message
    } catch (err: any) {
      alert("Failed to send message: " + err.message);
      setNewMessage(messageText); // Restore if failed
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500">Connecting to secure portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto shadow-2xl relative">
      {/* HEADER */}
      <div className="bg-indigo-900 text-white p-4 flex items-center gap-3 sticky top-0 z-10 shadow-md">
        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
          <Building className="w-5 h-5 text-indigo-200" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Sentralogis Hub</h1>
          <p className="text-indigo-200 text-xs">Official Corporate Support</p>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa]">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="text-slate-400 max-w-xs">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Welcome to our secure communication portal. Send a message to connect with your Account Manager.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isGuest = msg.sender_id === null;
            return (
              <div key={msg.id} className={`flex ${isGuest ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-3 ${
                  isGuest 
                    ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-200' 
                    : 'bg-white text-slate-800 rounded-bl-none shadow-sm border border-slate-100'
                }`}>
                  {!isGuest && (
                    <p className="text-[10px] font-bold text-indigo-500 mb-1">Sentralogis Rep</p>
                  )}
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                  <p className={`text-[10px] mt-1 text-right ${isGuest ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="bg-white p-3 border-t border-slate-200 sticky bottom-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Ensure icons are imported
import { Building, MessageSquare } from 'lucide-react';
