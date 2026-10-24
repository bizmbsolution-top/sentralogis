'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot, User, ArrowRight, AlertCircle, ShieldAlert, Sparkles,
  Eye, Ship, Users as UsersIcon, ShoppingCart, FileText, AlertTriangle, Truck, Package,
  MapPin,
} from 'lucide-react';
import { useCopilotV2 } from './CopilotV2Provider';
import { ThinkingIndicator } from './ThinkingIndicator';
import type { CopilotMessage, EntityReference, ResultItem, ProposalChange } from './types';
import { CopilotLocationPicker } from '@/components/copilot/workspace/CopilotLocationPicker';

// ---------------------------------------------------------------------------
// Status color mapping
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  gray: 'bg-slate-100 text-slate-600 border-slate-200',
};

function StatusBadge({ status, color }: { status: string; color: string }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[color] || STATUS_COLORS.gray}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Entity reference chip
// ---------------------------------------------------------------------------

function EntityRefChip({ entity }: { entity: EntityReference }) {
  const { selectEntity } = useCopilotV2();
  return (
    <button
      onClick={() => selectEntity(entity)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"
      aria-label={`View ${entity.label}`}
    >
      <span>{entity.label}</span>
      {entity.status && (
        <>
          <span className="text-slate-400" aria-hidden="true"> • </span>
          <StatusBadge status={`Status: ${entity.status}`} color={entity.statusColor || 'gray'} />
        </>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sub-renderers
// ---------------------------------------------------------------------------

function UnderstandingCard({ message }: { message: CopilotMessage }) {
  const u = message.understanding;
  if (!u) return null;
  const entries = Object.entries(u).filter(([k, v]) => v && k !== 'filters');

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
        <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Understanding
      </div>
      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {entries.map(([key, value]) => (
            <div key={key}>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{key}</div>
              <div className="text-sm font-medium text-slate-800">{String(value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ message }: { message: CopilotMessage }) {
  const { selectEntity } = useCopilotV2();
  const r = message.results;
  if (!r) return null;

  return (
    <div className="mt-2">
      <p className="text-sm text-slate-600 mb-2">{r.summary}</p>
      {r.items && r.items.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {r.items.map((item: ResultItem) => (
            <button
              key={item.id}
              onClick={() =>
                selectEntity({
                  type: r.type === 'exceptions' ? 'exception' : 'shipment',
                  id: item.id,
                  label: item.label,
                  status: item.status,
                  statusColor: item.statusColor,
                })
              }
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-left group"
              aria-label={`View ${item.label}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{item.label}</div>
                {item.meta && (
                  <div className="flex gap-3 mt-0.5">
                    {Object.entries(item.meta).map(([k, v]) => (
                      <span key={k} className="text-[10px] text-slate-400">
                        {k}: <span className="text-slate-600">{v}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="ml-3 shrink-0 flex items-center gap-2">
                <StatusBadge status={item.status} color={item.statusColor} />
                <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400 mt-2">{r.count} total result{r.count !== 1 ? 's' : ''}</p>
    </div>
  );
}

function ProposalCard({ message }: { message: CopilotMessage }) {
  const router = useRouter();
  const { selectEntity } = useCopilotV2();
  const p = message.proposal;
  if (!p) return null;

  const handleOpenOfficialForm = () => {
    if (p.draftPayload && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('sentralogis_copilot_so_draft', JSON.stringify(p.draftPayload));
      } catch (e) {
        console.error('Failed to store copilot draft in sessionStorage:', e);
      }
    }
    const customerId = p.draftPayload?.customerId || '';
    const customerName = p.draftPayload?.customerName || '';
    const customerCode = p.draftPayload?.customerCode || '';
    const draftId = p.draftPayload?.draftId || p.entityId || '';
    const revenue = p.draftPayload?.estimatedRevenue ? String(p.draftPayload.estimatedRevenue) : '';
    const url = `/commercial/sales-orders/create?fromCopilot=1${customerId ? `&customerId=${encodeURIComponent(customerId)}` : ''}${customerName ? `&customer=${encodeURIComponent(customerName)}` : ''}${customerCode ? `&customerCode=${encodeURIComponent(customerCode)}` : ''}${draftId ? `&draftId=${encodeURIComponent(draftId)}` : ''}${revenue ? `&revenue=${encodeURIComponent(revenue)}` : ''}`;
    router.push(url);
  };

  return (
    <div className="mt-2 border-l-4 border-blue-500 rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-blue-50/50 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" /> PROPOSED ACTION
        </div>
        <div className="text-sm font-semibold text-slate-800 mt-1">{p.title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{p.description}</div>
      </div>

      {/* Entity */}
      <div className="px-4 py-2 border-b border-slate-100">
        <button
          onClick={handleOpenOfficialForm}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          {p.entityId}
        </button>
      </div>

      {/* Changes */}
      <div className="px-4 py-3 space-y-2">
        {p.changes.map((c: ProposalChange, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <span className="text-xs text-slate-400 w-28 shrink-0 pt-0.5">{c.field}</span>
            <span className="text-xs line-through text-red-400">{c.from}</span>
            <ArrowRight className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
            <span className="text-xs font-medium text-emerald-600">{c.to}</span>
          </div>
        ))}
      </div>

      {/* Reason */}
      {p.reason && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Reason</div>
          <div className="text-xs text-slate-600">{p.reason}</div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenOfficialForm}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
          >
            Buka Form Resmi
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Draft Siap Ditinjau</span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-amber-50/60 border-t border-amber-100">
        <p className="text-[11px] text-amber-800 font-medium">
          Draft order telah disiapkan. Silakan ketik <strong>&quot;Simpan&quot;</strong> di chat jika Anda memiliki wewenang komersial, atau buka form resmi di atas untuk review dan konfirmasi.
        </p>
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: CopilotMessage }) {
  return (
    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <span className="text-sm font-medium text-red-700">Something interrupted this request.</span>
      </div>
      {message.content && <p className="text-xs text-red-600 mb-3">{message.content}</p>}
      <p className="text-xs text-red-500">Copilot execution is not available in this environment.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main MessageBubble
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: CopilotMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { sendMessage } = useCopilotV2();
  const isUser = message.role === 'user';
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Loading → ThinkingIndicator
  if (message.type === 'loading') {
    return <ThinkingIndicator stage={1} />;
  }

  return (
    <div
      className={`flex gap-3 py-3 animate-fadeIn ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ animationDuration: '0.3s' }}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
          isUser
            ? 'bg-slate-200 text-slate-600'
            : 'bg-blue-100 text-blue-600'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        {!isUser && message.dataSource && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {message.dataSource === 'SIMULATED' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                SIMULATED DATA
              </span>
            )}
            {message.dataSource === 'PROPOSED' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                PROPOSAL ONLY
              </span>
            )}
            {message.dataSource === 'NOT_EXECUTED' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                NOT EXECUTED
              </span>
            )}
            {message.dataSource === 'LIVE_READ' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                LIVE READ
              </span>
            )}
          </div>
        )}

        {/* Text */}
        {message.type === 'text' && message.content && (
          <div
            className={`inline-block text-sm leading-relaxed ${
              isUser
                ? 'bg-blue-50 text-slate-800 rounded-2xl rounded-tr-sm px-4 py-2.5'
                : 'text-slate-700'
            }`}
          >
            {message.content.split('\n').map((line, i) => {
              const renderInline = (str: string) => {
                const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
                const parts = str.split(tokenRegex);
                return parts.map((part, idx) => {
                  const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                  if (linkMatch) {
                    const href = linkMatch[2];
                    if (href.startsWith('/')) {
                      return (
                        <Link
                          key={idx}
                          href={href}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                        >
                          {linkMatch[1]}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      );
                    }
                    return (
                      <a
                        key={idx}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {linkMatch[1]}
                      </a>
                    );
                  }
                  const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
                  if (boldMatch) {
                    return (
                      <strong key={idx} className="font-semibold text-slate-900">
                        {boldMatch[1]}
                      </strong>
                    );
                  }
                  const italicMatch = part.match(/^\*([^*]+)\*$/);
                  if (italicMatch) {
                    return (
                      <em key={idx} className="italic text-slate-600">
                        {italicMatch[1]}
                      </em>
                    );
                  }
                  return <React.Fragment key={idx}>{part}</React.Fragment>;
                });
              };
              return (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>
                  {renderInline(line)}
                </p>
              );
            })}
          </div>
        )}

        {/* Interactive Location Picker for guided order flow */}
        {!isUser && message.content && (message.content.includes('Lokasi Asal') || message.content.includes('Lokasi Tujuan') || message.content.includes('Peta/Google Maps') || message.content.includes('Rincian Order')) && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setShowLocationPicker((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition-colors shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>{showLocationPicker ? 'Tutup Pencarian Lokasi' : 'Pilih Lokasi via Google Maps / Master Data'}</span>
            </button>

            {showLocationPicker && (
              <div className="mt-2.5 max-w-md animate-in fade-in slide-in-from-top-1 duration-150">
                <CopilotLocationPicker
                  onSelectLocation={(loc, field) => {
                    setShowLocationPicker(false);
                    const fieldLabel = field === 'origin' ? 'Asal' : 'Tujuan';
                    sendMessage(`${fieldLabel}: ${loc.name}`);
                  }}
                  activeField={message.content?.includes('Lokasi Asal (Origin)') ? 'origin' : 'destination'}
                />
              </div>
            )}
          </div>
        )}

        {/* Understanding */}
        {message.type === 'understanding' && <UnderstandingCard message={message} />}

        {/* Result */}
        {message.type === 'result' && <ResultCard message={message} />}

        {/* Proposal */}
        {message.type === 'proposal' && <ProposalCard message={message} />}

        {/* Error */}
        {message.type === 'error' && <ErrorCard message={message} />}

        {/* Entity refs */}
        {message.entityRefs && message.entityRefs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.entityRefs.map((ref) => (
              <EntityRefChip key={ref.id} entity={ref} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
