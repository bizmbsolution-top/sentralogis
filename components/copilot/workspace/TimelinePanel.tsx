'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, User, Bot, Server } from 'lucide-react';

export interface TimelineMilestone {
  key: string;
  label: string;
  status: 'DONE' | 'ACTIVE' | 'PENDING';
  timestamp?: string;
  actor?: string;
  source?: 'User' | 'Driver' | 'AI' | 'System';
}

export interface TimelinePanelProps {
  milestones: TimelineMilestone[];
  jobId?: string;
}

export default function TimelinePanel({ milestones, jobId }: TimelinePanelProps) {
  const getSourceIcon = (source?: string) => {
    switch (source) {
      case 'User': return <User className="w-3 h-3" />;
      case 'Driver': return <User className="w-3 h-3" />;
      case 'AI': return <Bot className="w-3 h-3" />;
      case 'System': return <Server className="w-3 h-3" />;
      default: return null;
    }
  };

  const getSourceColor = (source?: string) => {
    switch (source) {
      case 'User': return 'bg-slate-700 text-slate-300 border-slate-600';
      case 'Driver': return 'bg-blue-900/50 text-blue-300 border-blue-500/30';
      case 'AI': return 'bg-violet-900/50 text-violet-300 border-violet-500/30';
      case 'System': return 'bg-amber-900/50 text-amber-300 border-amber-500/30';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Operational Timeline
        </h3>
        {jobId && <span className="text-[10px] uppercase font-mono text-slate-500 tracking-wider bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700/50">{jobId}</span>}
      </div>

      <div className="relative pl-2.5">
        {/* Continuous vertical line */}
        <div className="absolute left-[13px] top-2 bottom-2 w-px bg-slate-700/50"></div>

        <div className="flex flex-col gap-4">
          {milestones.map((milestone, index) => {
            const isDone = milestone.status === 'DONE';
            const isActive = milestone.status === 'ACTIVE';

            return (
              <div key={milestone.key} className="relative flex items-start gap-3 z-10 group">
                {/* Node icon/dot */}
                <div className="relative mt-1 flex-shrink-0 flex items-center justify-center">
                  <div className={`w-2 h-2 rounded-full z-10 transition-colors ${
                    isDone ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 
                    isActive ? 'bg-blue-400 ring-4 ring-blue-400/20' : 'bg-slate-600'
                  }`} />
                  
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-blue-400 z-0"
                      animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  
                  {/* Colored line segment overlay for DONE state connecting to previous */}
                  {isDone && index < milestones.length - 1 && milestones[index + 1].status !== 'PENDING' && (
                    <div className="absolute top-2 w-px h-6 bg-emerald-500/50 -z-10 left-[3.5px]" />
                  )}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${milestone.status === 'PENDING' ? 'opacity-50 grayscale transition-all group-hover:opacity-80 group-hover:grayscale-0' : ''}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm font-medium ${isActive ? 'text-blue-300' : 'text-slate-300'}`}>
                      {milestone.label}
                    </h4>
                    {milestone.timestamp && (
                      <span className="text-[10px] text-slate-500 tabular-nums font-medium">
                        {milestone.timestamp}
                      </span>
                    )}
                  </div>
                  
                  {(milestone.actor || milestone.source) && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {milestone.source && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[9px] font-semibold tracking-wider uppercase border ${getSourceColor(milestone.source)}`}>
                          {getSourceIcon(milestone.source)}
                          {milestone.source}
                        </span>
                      )}
                      {milestone.actor && (
                        <span className="text-[10px] text-slate-400 truncate font-medium">{milestone.actor}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
