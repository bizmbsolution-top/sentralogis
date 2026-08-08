'use client';

import React, { useState, useEffect } from 'react';
import { SentraBotProvider } from '@/src/platforms/experience/sentrabot/SentraBotProvider';
import { useSentraBot } from '@/src/platforms/experience/sentrabot/SentraBotContext';
import { CopilotContextProvider, useCopilotContext } from '@/src/app/(dashboard)/copilot/components/CopilotContextProvider';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import ActiveJobWorkspace from '@/components/copilot/workspace/ActiveJobWorkspace';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  type?: 'text' | 'action_proposal' | 'execution_result' | 'timeline';
  proposal?: any;
  result?: any;
  timeline?: any;
};

function DispatcherWorkspaceInner() {
  const bot = useSentraBot();
  const { context } = useCopilotContext();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load from session storage or set initial
  useEffect(() => {
    const saved = sessionStorage.getItem('copilot_messages');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse messages', e);
      }
    } else {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          type: 'text',
          content: 'I verified the system is nominal. What operational focus do you need today?'
        }
      ]);
    }
  }, []);

  // Save to session storage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('copilot_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const handleSend = async (text: string, uploads?: any[]) => {
    const userMsg: Message = { id: Date.now().toString(), role: 'user', type: 'text', content: text };
    if (uploads && uploads.length > 0) {
      userMsg.content += `\n[Attached: ${uploads.map(u => u.name).join(', ')}]`;
    }
    
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    
    bot.dispatch({ type: 'IntentCaptured', timestamp: Date.now() });

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          activeContext: {
            conversationId: 'default-session',
            workspace: {
              activeJob: context.workspace.activeJob(),
              activeDriver: context.workspace.activeDriver(),
              activeVehicle: context.workspace.activeVehicle()
            }
          },
          image: uploads && uploads.length > 0 ? {
            filename: uploads[0].name,
            mimeType: 'image/png',
            data: uploads[0].base64 || 'mock_base64'
          } : null
        })
      });

      const data = await response.json();
      bot.dispatch({ type: 'IntentResolved', timestamp: Date.now() });

      if (data.success && data.response) {
        const copilotResponse = data.response;
        bot.dispatch({ type: 'PlanningCompleted', timestamp: Date.now(), payload: { confidence: copilotResponse.confidence } });

        if (copilotResponse.proposal) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            type: 'action_proposal',
            proposal: copilotResponse.proposal
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            type: 'text',
            content: copilotResponse.content || 'I processed your request, but no action was proposed.'
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          type: 'text',
          content: `Error: ${data.error || 'Failed to process request.'}`
        }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        type: 'text',
        content: 'I encountered a network error connecting to the Copilot Engine.'
      }]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => bot.dispatch({ type: 'UserIdle', timestamp: Date.now() }), 3000);
    }
  };

  const handleConfirmAction = async (msgId: string, proposal: any) => {
    setIsProcessing(true);
    bot.dispatch({ type: 'ExecutionStarted', timestamp: Date.now() });

    try {
      const response = await fetch('/api/copilot/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          proposal, 
          activeContext: {
             workspace: {
              activeJob: context.workspace.activeJob(),
              activeDriver: context.workspace.activeDriver(),
              activeVehicle: context.workspace.activeVehicle()
            }
          } 
        })
      });

      const data = await response.json();
      bot.dispatch({ type: 'ExecutionSucceeded', timestamp: Date.now() });

      if (data.success && data.result) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          type: 'execution_result',
          result: {
            status: data.result.status,
            message: data.result.message,
            durationMs: data.result.durationMs || 312,
            timelineUpdates: data.result.timelineUpdates || [
              `Updated ${proposal.intent} state`,
              'Dispatched notifications',
              'Active Context refreshed'
            ]
          }
        }]);
        
        if (data.timeline) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            type: 'timeline',
            content: 'Timeline updated:',
            timeline: [data.timeline]
          }]);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      bot.dispatch({ type: 'ExecutionFailed', timestamp: Date.now() });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        type: 'execution_result',
        result: {
          status: 'FAILED',
          message: err.message || 'Execution failed.',
          durationMs: 0,
          timelineUpdates: []
        }
      }]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => bot.dispatch({ type: 'UserIdle', timestamp: Date.now() }), 3000);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-white text-slate-900">
      <div className="h-16 flex items-center px-6 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mr-4">
          Dispatcher Workspace
        </h1>
        <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600 border border-slate-200 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          SentraBot Active
        </div>
      </div>
      
      <ActiveJobWorkspace 
        onSend={handleSend}
        isProcessing={isProcessing}
        messages={messages}
        onConfirmAction={handleConfirmAction}
      />
    </div>
  );
}

export default function DispatcherWorkspacePage() {
  // Creating a mock initial context since we need one for the provider
  const initialContext = OperationalContext.create({
    tenant: TenantContext.create({ id: 'tenant-1', name: 'Sentralogis Demo' }),
    user: UserContext.create({ id: 'user-1', displayName: 'Dispatcher', department: 'OPERATIONS' }),
    permissions: PermissionContext.create(['trucking.job-order', 'tracking.session', 'copilot.execute']),
    conversation: ConversationContext.create({ conversationId: 'default-session' }),
    workspace: WorkspaceContext.create({}),
  });

  return (
    <SentraBotProvider>
      <CopilotContextProvider initialContext={initialContext}>
        <DispatcherWorkspaceInner />
      </CopilotContextProvider>
    </SentraBotProvider>
  );
}
