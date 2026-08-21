"use client";

import React, { useState } from "react";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  Truck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { JobOrderData } from "./types";
import { formatDateUTC } from "@/lib/utils/dateUtils";

interface HistoryTabProps {
  completedJobs: JobOrderData[];
  completedJobsMonth: number;
  totalCompletedJobsCount: number;
  isDark: boolean;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  completedJobs,
  completedJobsMonth,
  totalCompletedJobsCount,
  isDark,
}) => {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedJobId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-5">
      {/* Monthly & Career Summary Banner */}
      <div
        className={`rounded-3xl p-6 shadow-xl border relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/20 text-white"
            : "bg-gradient-to-br from-emerald-600 to-teal-700 text-white"
        }`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3.5 mb-3">
          <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center shadow-md">
            <ClipboardList size={24} className="text-emerald-300" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
              JO Selesai Bulan Ini
            </p>
            <h4 className="text-4xl font-black mt-0.5 leading-none">
              {completedJobsMonth}
            </h4>
          </div>
        </div>
        <p className="text-xs opacity-80 font-semibold border-t border-white/15 pt-3 mt-2">
          Total keseluruhan: {totalCompletedJobsCount} JO selesai sepanjang karier Anda.
        </p>
      </div>

      {/* History List */}
      <div
        className={`rounded-3xl p-5 shadow-xl border ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/20">
          <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            Daftar Tugas Selesai
          </h3>
          <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-black">
            {completedJobs.length} Total
          </span>
        </div>

        {completedJobs.length === 0 ? (
          <div className="py-12 text-center">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner ${
                isDark ? "bg-slate-950" : "bg-slate-50"
              }`}
            >
              <ClipboardList size={32} className="text-slate-400" />
            </div>
            <p className="text-base font-black">Belum Ada Riwayat Selesai</p>
            <p className="text-xs text-slate-500 mt-1">
              Setelah menyelesaikan tugas, riwayat pengiriman Anda akan tercatat di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedJobs.map((job) => {
              const isRejected =
                (job.status || "").toUpperCase() === "REJECTED" ||
                job.driver_response === "rejected";
              const stops = job.job_routes || job.wo_items?.item_data?.stops || [];
              const originStop = stops[0]?.location_name || "Lokasi Muat";
              const destStop = stops[stops.length - 1]?.location_name || "Lokasi Bongkar";
              const isExpanded = expandedJobId === job.id;
              const completedDate = job.completed_at || job.created_at;

              return (
                <div
                  key={job.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isDark
                      ? "bg-slate-950/80 border-slate-800"
                      : "bg-slate-50 border-slate-200/80"
                  }`}
                >
                  <div
                    onClick={() => toggleExpand(job.id)}
                    className="p-4 cursor-pointer hover:opacity-95 transition-opacity"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-500">
                            {job.jo_number}
                          </span>
                          {job.tenant_name && (
                            <span className="text-[9px] bg-slate-500/10 text-slate-400 font-bold px-1.5 py-0.5 rounded">
                              🏢 {job.tenant_name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black uppercase mt-1 leading-tight">
                          {job.wo_items?.item_data?.shipper_name ||
                            job.customer_name ||
                            "SENTRALOGIS"}
                        </p>
                      </div>

                      <span
                        className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                          isRejected
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {isRejected ? "✕ DIBATALKAN" : "✓ SELESAI"}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-2 py-1">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{originStop}</span>
                      <span>→</span>
                      <span className="truncate">{destStop}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/10 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {completedDate ? formatDateUTC(completedDate) : "-"}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-indigo-500">
                        {isExpanded ? "Tutup" : "Rincian"}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Stop details */}
                  {isExpanded && (
                    <div className="p-4 bg-black/10 border-t border-slate-200/10 space-y-2.5">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Rincian Titik Singgah ({stops.length} Titik)
                      </p>
                      <div className="space-y-2">
                        {stops.map((st: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 text-xs text-slate-300"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-slate-200">
                                {st.location_name}
                              </p>
                              {st.address && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {st.address}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {job.md_fleets?.plate_number && (
                        <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-200/10">
                          Armada: <span className="font-bold text-slate-300">{job.md_fleets.plate_number}</span> ({job.md_fleets.vehicle_type || "Truk"})
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
