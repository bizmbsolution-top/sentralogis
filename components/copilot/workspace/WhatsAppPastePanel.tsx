'use client';

import React, { useState } from 'react';
import { MessageSquare, RefreshCw, ChevronDown, ChevronUp, CheckCircle, Search } from 'lucide-react';

export interface ExtractedMessage {
  sender: string;
  content: string;
  isOperational: boolean;
  intent?: string;
}

export interface WhatsAppPastePanelProps {
  onExtract: (rawText: string) => void;
  extractedMessages?: ExtractedMessage[];
  isProcessing?: boolean;
}

export default function WhatsAppPastePanel({ 
  onExtract, 
  extractedMessages = [], 
  isProcessing = false 
}: WhatsAppPastePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [rawText, setRawText] = useState('');

  const handleExtract = () => {
    if (rawText.trim()) {
      onExtract(rawText);
    }
  };

  const operationalCount = extractedMessages.filter(m => m.isOperational).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-900">WhatsApp Data Extraction</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Paste Conversation</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="[10:30 AM] Driver: Sudah sampai pabrik pak..."
              className="w-full min-h-[100px] p-3 text-sm border-2 border-emerald-100 focus:border-emerald-500 focus:ring-0 rounded-xl resize-y bg-emerald-50/30 placeholder:text-slate-400"
              rows={4}
            />
            <div className="flex justify-end">
              <button
                onClick={handleExtract}
                disabled={isProcessing || !rawText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analyze Conversation
                  </>
                )}
              </button>
            </div>
          </div>

          {extractedMessages.length > 0 && (
            <div className="flex flex-col gap-3 mt-2 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800">Extracted Insights</h4>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
                  {operationalCount} operational from {extractedMessages.length} total
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {extractedMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border text-sm flex flex-col gap-1 ${
                      msg.isOperational 
                        ? 'bg-white border-slate-200 border-l-4 border-l-emerald-500 shadow-sm' 
                        : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{msg.sender}</span>
                      {msg.isOperational && msg.intent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded uppercase tracking-wide">
                          {msg.intent}
                        </span>
                      )}
                    </div>
                    <p className={`text-slate-700 ${!msg.isOperational && 'line-through text-slate-400'}`}>
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
