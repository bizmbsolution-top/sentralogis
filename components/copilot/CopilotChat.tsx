import React, { useRef, useEffect } from 'react';

interface CopilotChatProps {
  children: React.ReactNode;
}

export default function CopilotChat({ children }: CopilotChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [children]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-white">
      <div className="max-w-4xl mx-auto pb-4">
        {children}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
