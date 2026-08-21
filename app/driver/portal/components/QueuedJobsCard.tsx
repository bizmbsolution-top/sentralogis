"use client";

import React from "react";
import { Package, ChevronRight, CheckCircle2, MapPin } from "lucide-react";
import { JobOrderData } from "./types";

interface QueuedJobsCardProps {
  queuedJobs: JobOrderData[];
  isDark: boolean;
  onSelectJob: (job: JobOrderData) => void;
  onAcceptQueue?: (job: JobOrderData) => void;
}

export const QueuedJobsCard: React.FC<QueuedJobsCardProps> = ({
  queuedJobs,
  isDark,
  onSelectJob,
  onAcceptQueue,
}) => {
  if (!queuedJobs || queuedJobs.length === 0) return null;

  return (
    <div
      className={`rounded-3xl p-5 shadow-xl border ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/20">
        <div>
          <h3 className="text-base font-black uppercase tracking-wider">
            Antrean Tugas Berikutnya
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">
            Siap jalan otomatis setelah tugas aktif selesai
          </p>
        </div>
        <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full text-xs font-black">
          {queuedJobs.length} Antrean
        </span>
      </div>

      <div className="space-y-3">
        {queuedJobs.map((jo) => {
          const isAcceptedInQueue = jo.driver_response === "accepted";
          const stops = jo.job_routes || jo.wo_items?.item_data?.stops || [];
          const originStop = stops[0]?.location_name || "Lokasi Muat";
          const destStop = stops[stops.length - 1]?.location_name || "Lokasi Bongkar";
          const shipperName =
            jo.wo_items?.item_data?.shipper_name ||
            jo.customer_name ||
            jo.tenant_name ||
            "SENTRALOGIS";

          return (
            <div
              key={jo.id}
              className={`rounded-2xl p-4 border transition-all shadow-sm ${
                isDark
                  ? "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                  : "bg-slate-50 border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div
                onClick={() => onSelectJob(jo)}
                className="cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-500">
                        {jo.jo_number}
                      </span>
                      {jo.tenant_name && (
                        <span className="text-[9px] bg-slate-500/10 text-slate-400 font-bold px-1.5 py-0.5 rounded">
                          🏢 {jo.tenant_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black uppercase mt-1 leading-tight">
                      {shipperName}
                    </p>
                  </div>

                  <span
                    className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                      isAcceptedInQueue
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {isAcceptedInQueue ? "✓ SIAP ANTREAN" : "PENDING"}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2 py-1.5">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{originStop}</span>
                  <span>→</span>
                  <span className="truncate">{destStop}</span>
                </div>
              </div>

              {/* Action row */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/10 flex justify-end gap-2">
                {!isAcceptedInQueue && onAcceptQueue && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptQueue(jo);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 size={12} /> Terima Antrean
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectJob(jo)}
                  className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                >
                  Detail <ChevronRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
