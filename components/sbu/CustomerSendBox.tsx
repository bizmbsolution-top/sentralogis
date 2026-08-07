'use client';

import { useState, type ReactNode } from 'react';
import { X, Send, Hash, Building2, MapPin, Truck, User, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { buildCustomerTrackingDetailMessage, buildCustomerTrackingMessage, buildWaLink } from '@/lib/domain/phone';

interface CustomerSendJob {
  id: string;
  jo_number: string;
  tracking_token?: string;
  driver_link_token?: string;
  status?: string;
  plate_number?: string;
  driver_name?: string;
  origin?: string;
  destination?: string;
}

interface CustomerSendBoxProps {
  open: boolean;
  onClose: () => void;
  woNumber: string;
  customerName: string;
  customerId?: string;
  items: CustomerSendJob[];
  origin?: string;
  destination?: string;
}

export default function CustomerSendBox({
  open,
  onClose,
  woNumber,
  customerName,
  customerId,
  items,
  origin,
  destination,
}: CustomerSendBoxProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!open) return null;

  const activeJobs = (items || []).filter(
    (j) => j.status === 'assigned' || j.status === 'in_progress' || j.status === 'accepted'
  );

  const allJobs = activeJobs.length > 0 ? activeJobs : items || [];

  const buildLink = (job: CustomerSendJob) => {
    const token = job.tracking_token || job.driver_link_token || job.id;
    return `${window.location.origin}/track/${token}`;
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return { text: '-', color: 'bg-slate-100 text-slate-500' };
    const map: Record<string, { text: string; color: string }> = {
      assigned: { text: 'ASSIGNED', color: 'bg-blue-100 text-blue-700' },
      accepted: { text: 'MENUNGGU', color: 'bg-amber-100 text-amber-700' },
      in_progress: { text: 'DI JALAN', color: 'bg-emerald-100 text-emerald-700' },
      completed: { text: 'SELESAI', color: 'bg-slate-100 text-slate-500' },
    };
    return map[status] || { text: status.toUpperCase(), color: 'bg-slate-100 text-slate-500' };
  };

  const handleCopyLink = (job: CustomerSendJob) => {
    const link = buildLink(job);
    navigator.clipboard.writeText(link);
    setCopiedId(job.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendAll = () => {
    if (allJobs.length === 0) return;

    if (allJobs.length === 1) {
      const job = allJobs[0];
      const link = buildLink(job);
      const msg = buildCustomerTrackingMessage({
        customerName,
        woNumber,
        joNumber: job.jo_number,
        link,
      });
      window.open(buildWaLink('', msg), '_blank');
      return;
    }

    const jobsForMsg = allJobs.map((j) => ({
      joNumber: j.jo_number,
      plateNumber: j.plate_number || '-',
      driverName: j.driver_name || '-',
      status: getStatusBadge(j.status).text,
      link: buildLink(j),
    }));
    const msg = buildCustomerTrackingDetailMessage({
      customerName,
      woNumber,
      jobs: jobsForMsg,
    });
    window.open(buildWaLink('', msg), '_blank');
  };

  const handleSendSingle = (job: CustomerSendJob) => {
    const link = buildLink(job);
    const msg = buildCustomerTrackingMessage({
      customerName,
      woNumber,
      joNumber: job.jo_number,
      link,
    });
    window.open(buildWaLink('', msg), '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border-none overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <ExternalLink size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Share Tracking ke Customer</h3>
              <p className="text-xs text-slate-400">Kirim link pelacakan via WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField icon={<Hash size={12} />} label="WO" value={woNumber} />
            <ReadOnlyField icon={<Building2 size={12} />} label="Customer" value={customerName} />
            <ReadOnlyField icon={<Truck size={12} />} label="Total Unit" value={`${allJobs.length} unit`} />
            <ReadOnlyField
              icon={<MapPin size={12} />}
              label="Route"
              value={origin && destination ? `${origin} → ${destination}` : '-'}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Job Orders ({allJobs.length})
            </label>
            {allJobs.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <p className="text-xs">Belum ada JO yang bisa di-share</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allJobs.map((job) => {
                  const badge = getStatusBadge(job.status);
                  return (
                    <div
                      key={job.id}
                      className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900">{job.jo_number}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badge.color}`}>
                            {badge.text}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Truck size={11} /> {job.plate_number || '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={11} /> {job.driver_name || '-'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopyLink(job)}
                          className="h-8 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md flex items-center gap-1 text-[10px] font-bold text-slate-600 transition-colors"
                          title="Copy link tracking"
                        >
                          {copiedId === job.id ? (
                            <><CheckCircle2 size={12} className="text-emerald-500" /> Copied</>
                          ) : (
                            <><Copy size={12} /> Copy</>
                          )}
                        </button>
                        <button
                          onClick={() => handleSendSingle(job)}
                          className="h-8 px-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-1 text-[10px] font-bold text-indigo-600 transition-colors"
                          title="Kirim via WhatsApp"
                        >
                          <Send size={12} /> WA
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold"
          >
            Batal
          </button>
          <button
            onClick={handleSendAll}
            disabled={allJobs.length === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-2"
          >
            <Send size={14} /> Share Semua via WhatsApp
          </button>
        </div>
      </Card>
    </div>
  );
}

function ReadOnlyField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-[11px] font-black text-slate-900 uppercase truncate">{value}</p>
    </div>
  );
}
