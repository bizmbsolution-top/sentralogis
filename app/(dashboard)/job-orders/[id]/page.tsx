'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Truck,
  User,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { fetchEntityDetail } from '@/components/copilot/v2/copilot-api-client';
import type {
  EntityDetail,
  DetailField,
  TimelineEvent,
} from '@/components/copilot/v2/types';

function getStatusBadgeClasses(color: EntityDetail['statusColor']): string {
  switch (color) {
    case 'green':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'yellow':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'red':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'blue':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function TimelineIcon({ type }: { type?: TimelineEvent['type'] }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-600 shrink-0" />;
    default:
      return <Info className="w-4 h-4 text-blue-600 shrink-0" />;
  }
}

export default function JobOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const joId = rawId ? decodeURIComponent(rawId) : '';

  const [detail, setDetail] = useState<EntityDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!joId) {
      setLoading(false);
      setErrorMessage('Identifier Job Order tidak valid.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    fetchEntityDetail('job-order', joId)
      .then((res) => {
        if (!active) return;
        if (!res.success || !res.data) {
          setErrorMessage(
            res.error ||
              'Job Order tidak ditemukan atau Anda tidak memiliki akses ke tenant data ini.'
          );
          setDetail(null);
        } else {
          setDetail(res.data);
        }
      })
      .catch(() => {
        if (!active) return;
        setErrorMessage('Gagal memuat detail Job Order dari server.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [joId]);

  const getFieldValue = (label: string): string => {
    if (!detail) return '—';
    const found = detail.fields.find(
      (f) => f.label.toLowerCase() === label.toLowerCase()
    );
    return found?.value || '—';
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali
            </button>
            <Link
              href="/copilot"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Ke Copilot
            </Link>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Canonical Operational Read • Job Order
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center gap-3 shadow-xs">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">
              Memuat detail Job Order <span className="font-mono">{joId}</span>...
            </p>
          </div>
        )}

        {/* Error / Not Found / Forbidden State */}
        {!loading && errorMessage && (
          <div
            data-testid="job-order-error-state"
            className="bg-white border border-red-200 rounded-xl p-8 flex flex-col items-center text-center gap-3 shadow-xs"
          >
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-base font-semibold text-slate-900">
              Detail Job Order Tidak Dapat Ditampilkan
            </h1>
            <p className="text-xs text-slate-600 max-w-md">{errorMessage}</p>
            <p className="text-[11px] font-mono text-slate-400">
              ID / Nomor JO: {joId}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/copilot"
                className="px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Kembali ke Copilot
              </Link>
              <Link
                href="/work-orders"
                className="px-3.5 py-2 text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Daftar Work Order
              </Link>
            </div>
          </div>
        )}

        {/* Canonical Detail Content */}
        {!loading && detail && (
          <>
            {/* Header Card */}
            <div
              data-testid="job-order-detail-card"
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 rounded">
                      Job Order
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {detail.id}
                    </span>
                  </div>
                  <h1
                    data-testid="job-order-number"
                    className="text-xl md:text-2xl font-bold font-mono text-slate-900"
                  >
                    {detail.title}
                  </h1>
                  {detail.subtitle && (
                    <p className="text-xs text-slate-500">{detail.subtitle}</p>
                  )}
                </div>

                <span
                  data-testid="job-order-status"
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(
                    detail.statusColor
                  )}`}
                >
                  {detail.status}
                </span>
              </div>

              {/* Key Operational Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Customer & Work Order</span>
                  </div>
                  <div
                    data-testid="job-order-customer"
                    className="text-xs font-semibold text-slate-900"
                  >
                    {getFieldValue('Customer')}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    WO: {getFieldValue('Work Order')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Driver</span>
                  </div>
                  <div
                    data-testid="job-order-driver"
                    className="text-xs font-semibold text-slate-900"
                  >
                    {getFieldValue('Driver')}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Telp: {getFieldValue('Driver Phone')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kendaraan / Armada</span>
                  </div>
                  <div
                    data-testid="job-order-vehicle"
                    className="text-xs font-semibold font-mono text-slate-900"
                  >
                    {getFieldValue('Fleet Plate')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Transporter: {getFieldValue('Transporter')}
                  </div>
                </div>
              </div>

              {/* Route / Location Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-blue-50/40 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-medium mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Lokasi Asal (Origin)</span>
                  </div>
                  <div
                    data-testid="job-order-origin"
                    className="text-xs font-medium text-slate-900"
                  >
                    {getFieldValue('Origin')}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/40 border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Lokasi Tujuan (Destination)</span>
                  </div>
                  <div
                    data-testid="job-order-destination"
                    className="text-xs font-medium text-slate-900"
                  >
                    {getFieldValue('Destination')}
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Canonical Fields Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
                Rincian Data Kanonik Job Order
              </h2>
              <div className="divide-y divide-slate-100">
                {detail.fields.map((field: DetailField, idx: number) => (
                  <div
                    key={idx}
                    className="py-2.5 flex items-baseline justify-between gap-4"
                  >
                    <span className="text-xs text-slate-500 shrink-0">
                      {field.label}
                    </span>
                    <span className="text-xs font-medium text-slate-900 text-right break-all">
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Execution Timeline */}
            {detail.timeline && detail.timeline.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Riwayat Status & Eksekusi
                  </h2>
                </div>
                <div className="space-y-3">
                  {detail.timeline.map((ev: TimelineEvent, idx: number) => (
                    <div key={ev.id || idx} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <TimelineIcon type={ev.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-900">
                          {ev.title}
                        </div>
                        {ev.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ev.description}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {ev.date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
