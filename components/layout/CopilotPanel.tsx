'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, Loader2 } from 'lucide-react';

interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function CopilotPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Sentralogis Copilot. How can I help you today?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: CopilotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();

      const assistantMessage: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response?.content || data.response || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors z-50"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Sentralogis Copilot</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-slate-100">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Sentralogis..."
            className="flex-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
