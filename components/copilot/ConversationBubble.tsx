import React from 'react';

interface ConversationBubbleProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
}

export default function ConversationBubble({ role, children }: ConversationBubbleProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm font-bold shadow-sm border ${isUser ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-900 text-white border-black'}`}>
          {isUser ? 'U' : '🤖'}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="text-xs text-slate-400 mb-1 font-medium px-1">
            {isUser ? 'You' : 'Sentralogis Copilot'}
          </div>
          
          <div className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
            ${isUser 
              ? 'bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tr-sm' 
              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
            }
          `}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
