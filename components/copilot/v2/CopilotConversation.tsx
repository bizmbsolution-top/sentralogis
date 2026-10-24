'use client';

import React, { useRef, useEffect } from 'react';
import { useCopilotV2 } from './CopilotV2Provider';
import { MessageBubble } from './MessageBubble';
import { WelcomeState } from './WelcomeState';
import { CopilotInput } from './CopilotInput';

export function CopilotConversation() {
  const { messages } = useCopilotV2();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Only the initial welcome message → show WelcomeState
  const hasConversation = messages.length > 1 || (messages.length === 1 && messages[0].role === 'user');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto">
        {!hasConversation ? (
          <WelcomeState />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <CopilotInput />
    </div>
  );
}
