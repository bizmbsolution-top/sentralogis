import React, { useState, useRef } from 'react';
import { Paperclip, Send, Image as ImageIcon, FileText, Mic } from 'lucide-react';
import UploadPreviewCard from './UploadPreviewCard';

interface CopilotInputProps {
  onSend: (text: string, uploads?: {name: string, type: 'IMAGE'|'PDF'|'EXCEL', base64?: string}[]) => void;
  isProcessing: boolean;
}

export default function CopilotInput({ onSend, isProcessing }: CopilotInputProps) {
  const [text, setText] = useState('');
  const [uploads, setUploads] = useState<{name: string, type: 'IMAGE'|'PDF'|'EXCEL', base64?: string}[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if ((text.trim() || uploads.length > 0) && !isProcessing) {
      onSend(text, uploads);
      setText('');
      setUploads([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="bg-white border-t border-slate-200 p-4 shrink-0">
      <div className="max-w-4xl mx-auto">
        
        {/* Mock Upload Previews */}
        {uploads.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-2">
            {uploads.map((u, i) => (
              <UploadPreviewCard 
                key={i} 
                fileName={u.name} 
                fileType={u.type} 
                onRemove={() => setUploads(uploads.filter((_, idx) => idx !== i))} 
              />
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-300 rounded-2xl p-2 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
          
          <div className="flex flex-col justify-end gap-1 pb-1">
            <button 
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors" 
              title="Attach file"
              onClick={() => setUploads([...uploads, { name: 'manifest_data.xlsx', type: 'EXCEL' }])} // Mock upload
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </div>
          
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot, upload manifest, or paste WhatsApp..."
            className="flex-1 max-h-[200px] bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-sm text-slate-800 placeholder:text-slate-400 min-h-[44px]"
            rows={1}
            disabled={isProcessing}
          />
          
          <div className="flex items-center gap-1 pb-1">
            <button 
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors" 
              title="Voice Input (Coming Soon)"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSend}
              disabled={(!text.trim() && uploads.length === 0) || isProcessing}
              className={`p-2 rounded-xl transition-all ${((text.trim() || uploads.length > 0) && !isProcessing) ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3"/> Ctrl+V to paste image</span>
          <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> Drag & drop documents</span>
        </div>
      </div>
    </div>
  );
}
