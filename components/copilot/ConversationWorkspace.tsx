import React, { useRef, useEffect } from 'react';
import CopilotHeader from './CopilotHeader';
import CopilotInput from './CopilotInput';
import QuickCommandPanel from './QuickCommandPanel';

interface ConversationWorkspaceProps {
  children: React.ReactNode;
  onSend: (text: string, uploads?: any[]) => void;
  isProcessing: boolean;
}

export default function ConversationWorkspace({ children, onSend, isProcessing }: ConversationWorkspaceProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [children]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      <CopilotHeader />
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto pb-4">
          {children}
          <div ref={bottomRef} />
        </div>
      </div>
      
      <div className="px-4 pb-2 bg-white shrink-0">
        <div className="max-w-4xl mx-auto">
          <QuickCommandPanel onSelect={onSend} />
        </div>
      </div>
      
      <CopilotInput onSend={onSend} isProcessing={isProcessing} />
    </div>
  );
}
