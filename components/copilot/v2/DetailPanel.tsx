'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X, Ship, Users, ShoppingCart, FileText, AlertTriangle, Truck,
  Package, Clock, Camera, Activity, Eye, ChevronLeft, ArrowRight,
} from 'lucide-react';
import { useCopilotV2 } from './CopilotV2Provider';
import type { EntityDetail, TimelineEvent, EvidenceItem } from './types';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  shipment: <Ship className="w-3.5 h-3.5" />,
  customer: <Users className="w-3.5 h-3.5" />,
  'sales-order': <ShoppingCart className="w-3.5 h-3.5" />,
  'work-order': <FileText className="w-3.5 h-3.5" />,
  'job-order': <Truck className="w-3.5 h-3.5" />,
  fulfillment: <Package className="w-3.5 h-3.5" />,
  exception: <AlertTriangle className="w-3.5 h-3.5" />,
  document: <FileText className="w-3.5 h-3.5" />,
  invoice: <FileText className="w-3.5 h-3.5" />,
};

const TIMELINE_DOT_COLORS: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  error: 'bg-red-500',
};

const EVIDENCE_ICONS: Record<string, React.ReactNode> = {
  event: <Activity className="w-3.5 h-3.5" />,
  document: <FileText className="w-3.5 h-3.5" />,
  photo: <Camera className="w-3.5 h-3.5" />,
};

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------

export function DetailPanel() {
  const { detailPanel, closeDetail } = useCopilotV2();
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'evidence'>('details');

  if (detailPanel.type === 'empty' || !detailPanel.entity) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <Eye className="w-8 h-8 text-slate-200 mb-3" />
        <p className="text-sm text-slate-400">
          Select an entity from the conversation to see details here.
        </p>
      </div>
    );
  }

  const entity = detailPanel.entity;
  const hasTimeline = entity.timeline && entity.timeline.length > 0;
  const hasEvidence = entity.evidence && entity.evidence.length > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">
              {ENTITY_ICONS[entity.type] || <FileText className="w-3 h-3" />}
              {entity.type.replace('-', ' ')}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[entity.statusColor] || STATUS_COLORS.gray}`}>
              {entity.status}
            </span>
          </div>
          <button
            onClick={closeDetail}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close detail panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{entity.title}</h3>
        {entity.subtitle && <p className="text-xs text-slate-500 mt-0.5">{entity.subtitle}</p>}
        {entity.type === 'job-order' && (
          <div className="mt-2.5">
            <Link
              href={`/job-orders/${encodeURIComponent(entity.id)}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <span>Buka Halaman Detail JO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
        {entity.type === 'sales-order' && (
          <div className="mt-2.5">
            <Link
              href={`/commercial/sales-orders/${encodeURIComponent(entity.id)}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <span>Buka Detail Sales Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
        {entity.type === 'work-order' && (
          <div className="mt-2.5">
            <Link
              href={`/hq/work-orders?q=${encodeURIComponent(entity.title || entity.id)}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <span>Buka di HQ Work Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-4 shrink-0">
        {['details', ...(hasTimeline ? ['timeline'] : []), ...(hasEvidence ? ['evidence'] : [])].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Details tab */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {entity.fields.map((f) => (
              <div key={f.label}>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{f.label}</div>
                <div className="text-sm text-slate-800 mt-0.5">{f.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Timeline tab */}
        {activeTab === 'timeline' && entity.timeline && (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-4">
              {entity.timeline.map((event: TimelineEvent) => (
                <div key={event.id} className="relative">
                  <div className={`absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full ${TIMELINE_DOT_COLORS[event.type] || 'bg-slate-400'} ring-2 ring-white`} />
                  <div className="text-[10px] text-slate-400 font-mono">{event.date}</div>
                  <div className="text-sm font-medium text-slate-800">{event.title}</div>
                  {event.description && <div className="text-xs text-slate-500 mt-0.5">{event.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence tab */}
        {activeTab === 'evidence' && entity.evidence && (
          <div className="space-y-2">
            {entity.evidence.map((ev: EvidenceItem) => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  {EVIDENCE_ICONS[ev.type] || <FileText className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700">{ev.title}</div>
                  {ev.description && <div className="text-xs text-slate-500">{ev.description}</div>}
                  <div className="text-[10px] text-slate-400 mt-0.5">{ev.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
