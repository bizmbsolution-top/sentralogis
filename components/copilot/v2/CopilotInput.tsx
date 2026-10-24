'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Send, Mic, Paperclip, MapPin } from 'lucide-react';
import { useCopilotV2 } from './CopilotV2Provider';
import { CopilotLocationPicker } from '@/components/copilot/workspace/CopilotLocationPicker';

export function CopilotInput() {
  const { sendMessage, isProcessing } = useCopilotV2();
  const [text, setText] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
  }, []);

  const handleSubmit = useCallback(() => {
    if (!text.trim() || isProcessing) return;
    sendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isProcessing, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      {showLocationPicker && (
        <div className="max-w-3xl mx-auto mb-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CopilotLocationPicker
            onSelectLocation={(loc, field) => {
              setShowLocationPicker(false);
              const fieldLabel = field === 'origin' ? 'Asal' : 'Tujuan';
              sendMessage(`${fieldLabel}: ${loc.name}`);
            }}
          />
        </div>
      )}
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        {/* Location Picker Trigger */}
        <button
          type="button"
          onClick={() => setShowLocationPicker((p) => !p)}
          className={`shrink-0 p-2 rounded-lg transition-colors ${
            showLocationPicker ? 'text-blue-600 bg-blue-50 ring-1 ring-blue-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
          title="Pilih Lokasi Google Maps / Master Data"
          aria-label="Pilih Lokasi"
        >
          <MapPin className="w-5 h-5 text-blue-600" />
        </button>

        {/* Paperclip — affordance only */}
        <button
          type="button"
          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          disabled
          title="Attachments are not available in this prototype"
          aria-label="Attach file — not available in prototype"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Input */}
        <div className="flex-1 flex items-end rounded-xl border border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot..."
            disabled={isProcessing}
            rows={1}
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none resize-none min-h-[40px] max-h-[150px] disabled:opacity-50"
            aria-label="Message input"
          />
        </div>

        {/* Mic — affordance only */}
        <button
          type="button"
          className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
          disabled
          title="Voice input is not available in this prototype"
          aria-label="Voice input — not available in prototype"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Send */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isProcessing}
          className="shrink-0 p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
