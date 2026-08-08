'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LayoutDashboard, Inbox, MessageSquare, Image as ImageLucide, PanelRightOpen, PanelRightClose, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Inbox
import OperationalInbox from '@/components/copilot/inbox/OperationalInbox';
import type { InboxItem } from '@/components/copilot/inbox/OperationalInboxCard';

// Workspace panels
import JobDetailPanel from '@/components/copilot/workspace/JobDetailPanel';
import type { JobDetail } from '@/components/copilot/workspace/JobDetailPanel';
import TimelinePanel from '@/components/copilot/workspace/TimelinePanel';
import type { TimelineMilestone } from '@/components/copilot/workspace/TimelinePanel';
import AISuggestionPanel from '@/components/copilot/workspace/AISuggestionPanel';
import type { AISuggestion } from '@/components/copilot/workspace/AISuggestionPanel';
import WhatsAppPastePanel from '@/components/copilot/workspace/WhatsAppPastePanel';
import ImageDropZone from '@/components/copilot/workspace/ImageDropZone';
import type { ImageUpload } from '@/components/copilot/workspace/ImageDropZone';
import SituationCard from '@/components/copilot/workspace/SituationCard';
import type { SituationData } from '@/components/copilot/workspace/SituationCard';
import OperationalInsightCard from '@/components/copilot/workspace/OperationalInsightCard';
import type { InsightData } from '@/components/copilot/workspace/OperationalInsightCard';
import WhyNotCard from '@/components/copilot/workspace/WhyNotCard';
import type { AlternativeAction } from '@/components/copilot/workspace/WhyNotCard';
import SentraBotAvatar from '@/components/copilot/workspace/SentraBotAvatar';

// Conversation
import ConversationBubble from '@/components/copilot/ConversationBubble';
import SentraBotSpeechBubble from '@/components/copilot/sentrabot/SentraBotSpeechBubble';
import SentraBotThinking from '@/components/copilot/sentrabot/SentraBotThinking';
import ActionProposalCard from '@/components/copilot/ActionProposalCard';
import ExplainabilityPanel from '@/components/copilot/ExplainabilityPanel';
import GuardrailPanel from '@/components/copilot/GuardrailPanel';
import ExecutionResultCard from '@/components/copilot/ExecutionResultCard';
import TimelineCard from '@/components/copilot/TimelineCard';
import CopilotInput from '@/components/copilot/CopilotInput';

// Context
import { useCopilotContext } from '@/src/app/(dashboard)/copilot/components/CopilotContextProvider';
import { useSentraBot } from '@/src/platforms/experience/sentrabot/SentraBotContext';

// ─── Message Type ────────────────────────────────────────────────
export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  type?: 'text' | 'action_proposal' | 'execution_result' | 'timeline';
  proposal?: any;
  result?: any;
  timeline?: any;
};

interface ActiveJobWorkspaceProps {
  onSend: (text: string, uploads?: any[]) => void;
  isProcessing: boolean;
  messages: Message[];
  onConfirmAction: (msgId: string, proposal: any) => void;
}

// ─── Standard Timeline Milestones ────────────────────────────────
const STANDARD_MILESTONES: TimelineMilestone[] = [
  { key: 'job_created',        label: 'Job Created',         status: 'PENDING' },
  { key: 'driver_assigned',    label: 'Driver Assigned',     status: 'PENDING' },
  { key: 'depart_origin',      label: 'Depart Origin',       status: 'PENDING' },
  { key: 'arrive_pickup',      label: 'Arrive Pickup',       status: 'PENDING' },
  { key: 'loading',            label: 'Loading',             status: 'PENDING' },
  { key: 'depart_pickup',      label: 'Depart Pickup',       status: 'PENDING' },
  { key: 'arrive_destination', label: 'Arrive Destination',  status: 'PENDING' },
  { key: 'unloading',          label: 'Unloading',           status: 'PENDING' },
  { key: 'completed',          label: 'Completed',           status: 'PENDING' },
  { key: 'pod_uploaded',       label: 'POD Uploaded',        status: 'PENDING' },
];

function buildMilestones(activeIndex: number): TimelineMilestone[] {
  return STANDARD_MILESTONES.map((m, i) => {
    if (i < activeIndex) {
      return {
        ...m,
        status: 'DONE' as const,
        timestamp: `0${7 + i}:${(i * 12) % 60 < 10 ? '0' : ''}${(i * 12) % 60}`,
        actor: i % 2 === 0 ? 'System' : (i % 3 === 0 ? 'AI Copilot' : 'Driver Budi'),
        source: i % 2 === 0 ? 'System' as const : (i % 3 === 0 ? 'AI' as const : 'Driver' as const),
      };
    } else if (i === activeIndex) {
      return {
        ...m,
        status: 'ACTIVE' as const,
        timestamp: `${7 + i}:${(i * 12) % 60 < 10 ? '0' : ''}${(i * 12) % 60}`,
        actor: 'Driver Budi',
        source: 'Driver' as const,
      };
    }
    return m;
  });
}

function buildJobDetail(item: InboxItem): JobDetail {
  return {
    id: item.jobOrderId || item.id,
    jobOrderNumber: item.jobOrderId || `JO-${item.id.replace('INB-', '24')}`,
    status: item.category === 'delayed' ? 'DELAYED' : item.category === 'driver_sos' ? 'SOS' : 'IN TRANSIT',
    customerName: item.subtitle.split(' → ')[0] || item.subtitle.split(' - ')[0] || 'Customer',
    origin: 'Jakarta Warehouse A',
    destination: item.subtitle.split(' → ')[1] || 'Surabaya DC',
    sbu: 'Trucking',
    createdAt: new Date().toISOString(),
    driver: {
      id: 'DRV-101',
      name: item.metadata?.driver || 'Budi Santoso',
      phone: '+62812-3456-7890',
      status: item.category === 'driver_sos' ? 'SOS' as const : 'ACTIVE' as const,
      lastGpsTime: '2 min ago',
      vehiclePlate: 'B 1234 CD',
    },
    vehicle: {
      id: 'VEH-201',
      plateNumber: 'B 1234 CD',
      fleetType: 'Tronton 6x2',
      gpsSource: 'EasyGo' as const,
      engineStatus: 'ON' as const,
      lastSpeed: 65,
    },
    customer: {
      id: 'CUST-301',
      name: item.subtitle.split(' → ')[0] || item.subtitle.split(' - ')[0] || 'PT Berkah Abadi',
      address: 'Jl. Raya Industri No. 45, Cikarang',
      contactPerson: 'Pak Hendra',
      phone: '+62811-2222-3333',
    },
  };
}

function buildSuggestions(item: InboxItem): AISuggestion[] {
  const base: AISuggestion[] = [];

  if (item.category === 'delayed') {
    base.push({
      id: 'sug-1',
      recommendedAction: 'Notify customer of delay',
      reason: `Job ${item.title.split(' ')[0]} is delayed. Customer SLA may be breached.`,
      risk: 'MEDIUM',
      confidence: 87,
      affectedRecords: [item.jobOrderId || item.id],
      requiredPermission: 'trucking.job-order',
      estimatedImpact: 'Customer satisfaction preserved. Auto-generates delay notification.',
    });
  }

  if (item.category === 'driver_sos') {
    base.push({
      id: 'sug-2',
      recommendedAction: 'Dispatch emergency support',
      reason: 'Driver triggered SOS alert. Possible accident or breakdown.',
      risk: 'CRITICAL',
      confidence: 95,
      affectedRecords: [item.jobOrderId || item.id, 'DRV-101'],
      requiredPermission: 'trucking.job-order',
      estimatedImpact: 'Driver safety ensured. Backup driver auto-suggested.',
    });
  }

  if (item.category === 'waiting_pod') {
    base.push({
      id: 'sug-3',
      recommendedAction: 'Send POD reminder to driver',
      reason: 'Job completed but POD not yet uploaded. Grace period expiring.',
      risk: 'LOW',
      confidence: 92,
      affectedRecords: [item.jobOrderId || item.id],
      requiredPermission: 'trucking.job-order',
      estimatedImpact: 'POD compliance rate improvement.',
    });
  }

  if (item.category === 'waiting_driver') {
    base.push({
      id: 'sug-4',
      recommendedAction: 'Auto-assign nearest available driver',
      reason: 'Job waiting for driver assignment. 3 drivers available within 5km.',
      risk: 'LOW',
      confidence: 84,
      affectedRecords: [item.jobOrderId || item.id, 'DRV-102', 'DRV-103', 'DRV-104'],
      requiredPermission: 'trucking.job-order',
      estimatedImpact: 'Reduces assignment delay by ~45 minutes.',
    });
  }

  if (item.category === 'ai_suggestion') {
    base.push({
      id: 'sug-5',
      recommendedAction: item.title,
      reason: item.subtitle,
      risk: 'MEDIUM',
      confidence: parseInt(item.metadata?.confidence || '85'),
      affectedRecords: [item.jobOrderId || item.id],
      requiredPermission: 'trucking.job-order',
      estimatedImpact: 'Optimizes operational efficiency.',
    });
  }

  if (base.length === 0) {
    base.push({
      id: 'sug-gen',
      recommendedAction: 'Review and update job status',
      reason: 'This item requires dispatcher attention.',
      risk: 'LOW',
      confidence: 78,
      affectedRecords: [item.jobOrderId || item.id],
      requiredPermission: 'trucking.job-order',
      estimatedImpact: 'Keeps operational data current.',
    });
  }

  return base;
}

function buildSituationData(item: InboxItem): SituationData {
  const isDelayed = item.category === 'delayed';
  const isSOS = item.category === 'driver_sos';
  
  return {
    situation: item.title,
    phase: isDelayed ? 'In Transit' : isSOS ? 'Emergency' : 'Operations',
    delayDuration: isDelayed ? item.metadata?.eta_delay || '2 hours' : undefined,
    eta: isDelayed ? '20:00 (Revised)' : '18:30 (On Time)',
    gpsStatus: isSOS ? 'Stale' : 'Live',
    gpsTime: 'Just now',
    aiConfidence: isSOS ? 95 : 88,
    operationalRisk: isSOS ? 'Critical' : isDelayed ? 'Medium' : 'Low'
  };
}

function buildInsightData(item: InboxItem): InsightData {
  return {
    detectedSituation: `Detected anomaly related to ${item.category.replace('_', ' ')}.`,
    operationalReason: item.subtitle || 'Anomaly triggered by business logic rule.',
    businessImpact: item.category === 'delayed' ? 'SLA breach risk.' : 'Operational efficiency impact.',
    recommendedStrategy: item.category === 'driver_sos' ? 'Immediate escalation required.' : 'Execute AI Suggestion.'
  };
}

function buildAlternativeActions(item: InboxItem): AlternativeAction[] {
  return [
    { action: 'Cancel Job Order', reason: 'High cost of cancellation. Assets already deployed.' },
    { action: 'Reassign Vendor', reason: 'SLA violation likely. Current vendor can still recover.' }
  ];
}

// ─── Component ───────────────────────────────────────────────────
export default function ActiveJobWorkspace({
  onSend,
  isProcessing,
  messages,
  onConfirmAction,
}: ActiveJobWorkspaceProps) {
  const { focusJob, clearFocus } = useCopilotContext();
  const bot = useSentraBot();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedJob, setSelectedJob] = useState<JobDetail | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'chat' | 'whatsapp' | 'images'>('chat');
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [situation, setSituation] = useState<SituationData | null>(null);
  const [insight, setInsight] = useState<InsightData | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeAction[]>([]);
  const [imageUploads, setImageUploads] = useState<ImageUpload[]>([]);

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSelectItem = useCallback((item: InboxItem) => {
    const job = buildJobDetail(item);
    const activeStep = item.category === 'waiting_pod' ? 8 : item.category === 'delayed' ? 5 : 4;

    setSelectedJob(job);
    setSelectedItemId(item.id);
    setMilestones(buildMilestones(activeStep));
    setSuggestions(buildSuggestions(item));
    setSituation(buildSituationData(item));
    setInsight(buildInsightData(item));
    setAlternatives(buildAlternativeActions(item));
    focusJob(job.id, job.driver?.id, job.vehicle?.id, job.customer?.id);
  }, [focusJob]);

  const handleUnpin = useCallback(() => {
    setSelectedJob(null);
    setSelectedItemId(undefined);
    setMilestones([]);
    setSuggestions([]);
    setSituation(null);
    setInsight(null);
    setAlternatives([]);
    clearFocus();
  }, [clearFocus]);

  const handleSuggestionExecute = useCallback((suggestion: AISuggestion) => {
    onSend(`Execute: ${suggestion.recommendedAction}`);
  }, [onSend]);

  const handleWhatsAppExtract = useCallback((rawText: string) => {
    onSend(`[WhatsApp Parse]\n${rawText}`);
  }, [onSend]);

  const handleImageUpload = useCallback((file: File) => {
    const newUpload: ImageUpload = {
      id: `img-${Date.now()}`,
      fileName: file.name,
      fileType: file.name.toLowerCase().includes('pod') ? 'POD'
        : file.name.toLowerCase().includes('container') ? 'Container'
        : file.name.toLowerCase().includes('seal') ? 'Seal'
        : file.name.toLowerCase().includes('surat') ? 'Surat Jalan'
        : 'Unknown',
      previewUrl: URL.createObjectURL(file),
      ocrStatus: 'PENDING',
    };
    setImageUploads(prev => [...prev, newUpload]);
    setTimeout(() => {
      setImageUploads(prev => prev.map(u =>
        u.id === newUpload.id ? { ...u, ocrStatus: 'PROCESSING' as const } : u
      ));
    }, 500);
    setTimeout(() => {
      setImageUploads(prev => prev.map(u =>
        u.id === newUpload.id ? {
          ...u,
          ocrStatus: 'DONE' as const,
          extractedData: { 'Document': newUpload.fileType, 'Status': 'Extracted', 'Confidence': '94%' },
        } : u
      ));
    }, 2000);
  }, []);

  const tabButtons = [
    { key: 'chat' as const, label: 'Chat', icon: MessageSquare },
    { key: 'whatsapp' as const, label: 'WhatsApp', icon: MessageSquare },
    { key: 'images' as const, label: 'Images', icon: ImageLucide },
  ];

  return (
    <div className="flex flex-1 w-full overflow-hidden">

      {/* ─── LEFT: Operational Inbox ─── */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="h-12 border-b border-slate-200 flex items-center px-4 shrink-0 bg-white">
          <Inbox className="w-4 h-4 mr-2 text-indigo-500" />
          <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-500">Operational Inbox</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <OperationalInbox onSelectItem={handleSelectItem} selectedItemId={selectedItemId} />
        </div>
      </div>

      {/* ─── CENTER: Active Workspace ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 border-b border-slate-200 flex items-center px-4 justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-xs uppercase tracking-wider text-slate-500">Active Workspace</h2>
            {selectedJob && (
              <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                {selectedJob.jobOrderNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {tabButtons.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveBottomTab(t.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  activeBottomTab === t.key
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              onClick={() => setShowRightPanel(p => !p)}
              className="p-1.5 hover:bg-slate-100 rounded-md transition-colors text-slate-500 hover:text-slate-700"
              title={showRightPanel ? 'Hide panel' : 'Show panel'}
            >
              {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {selectedJob && (
              <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-b border-slate-200 overflow-hidden"
            >
              <JobDetailPanel job={selectedJob} onUnpin={handleUnpin} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-h-0">
          {activeBottomTab === 'chat' && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
                <div className="max-w-3xl mx-auto space-y-1">
                  {messages.map(msg => (
                    <React.Fragment key={msg.id}>
                      {msg.role === 'user' && (
                        <ConversationBubble role={msg.role}>{msg.content}</ConversationBubble>
                      )}
                      {msg.role === 'assistant' && (
                        <>
                          {msg.type === 'text' && (
                            <SentraBotSpeechBubble>{msg.content}</SentraBotSpeechBubble>
                          )}
                          {msg.type === 'timeline' && msg.timeline && (
                            <SentraBotSpeechBubble>
                              <p className="mb-2 text-sm">{msg.content}</p>
                              <TimelineCard events={msg.timeline} />
                            </SentraBotSpeechBubble>
                          )}
                          {msg.type === 'action_proposal' && msg.proposal && (
                            <SentraBotSpeechBubble>
                              <p className="mb-2 text-sm text-slate-600">I prepared the following execution plan:</p>
                              <ActionProposalCard
                                intent={msg.proposal.intent}
                                entities={msg.proposal.entities}
                                riskLevel={msg.proposal.riskLevel}
                                confidence={msg.proposal.confidence}
                                requiredPermission={msg.proposal.requiredPermission}
                                onConfirm={() => onConfirmAction(msg.id, msg.proposal)}
                                onEdit={() => console.log('Edit')}
                                onCancel={() => bot.dispatch({ type: 'UserIdle', timestamp: Date.now() })}
                              />
                              {msg.proposal.warnings && <GuardrailPanel warnings={msg.proposal.warnings} />}
                              {msg.proposal.explainability && (
                                <ExplainabilityPanel
                                  whyProposed={msg.proposal.explainability.whyProposed}
                                  resolvedEntities={msg.proposal.explainability.resolvedEntities}
                                  validationsSucceeded={msg.proposal.explainability.validationsSucceeded}
                                  whyConfirmationRequired={msg.proposal.explainability.whyConfirmationRequired}
                                />
                              )}
                            </SentraBotSpeechBubble>
                          )}
                          {msg.type === 'execution_result' && msg.result && (
                            <SentraBotSpeechBubble>
                              <ExecutionResultCard
                                status={msg.result.status}
                                message={msg.result.message}
                                durationMs={msg.result.durationMs}
                                timelineUpdates={msg.result.timelineUpdates}
                              />
                            </SentraBotSpeechBubble>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                  {isProcessing && <SentraBotThinking />}
                </div>
              </div>
              <div className="shrink-0 bg-white border-t border-slate-200">
                <CopilotInput onSend={onSend} isProcessing={isProcessing} />
              </div>
            </>
          )}

          {activeBottomTab === 'whatsapp' && (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="max-w-3xl mx-auto">
                <WhatsAppPastePanel
                  onExtract={handleWhatsAppExtract}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
          )}

          {activeBottomTab === 'images' && (
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div className="max-w-3xl mx-auto">
                <ImageDropZone
                  onUpload={handleImageUpload}
                  uploads={imageUploads}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Operational Intelligence ─── */}
      <AnimatePresence>
        {showRightPanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 w-[340px] border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden"
          >
            <div className="h-12 border-b border-slate-200 flex items-center px-4 shrink-0 bg-white justify-between">
              <div className="flex items-center gap-2">
                <SentraBotAvatar state={isProcessing ? 'thinking' : 'idle'} size="sm" />
                <h2 className="font-semibold text-[11px] uppercase tracking-wider text-slate-500">Operational Intelligence</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {selectedJob ? (
                <>
                  {situation && <SituationCard data={situation} />}
                  <TimelinePanel milestones={milestones} jobId={selectedJob.jobOrderNumber} />
                  {insight && <OperationalInsightCard data={insight} />}
                  <AISuggestionPanel suggestions={suggestions} onExecute={handleSuggestionExecute} />
                  {alternatives && <WhyNotCard alternatives={alternatives} />}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-60 text-center px-4">
                  <SentraBotAvatar state="idle" size="lg" />
                  <p className="text-sm text-slate-700 font-medium mt-4">Operational Intelligence</p>
                  <p className="text-xs text-slate-400 mt-1">Select an active job to view real-time situation analysis and AI recommendations.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
