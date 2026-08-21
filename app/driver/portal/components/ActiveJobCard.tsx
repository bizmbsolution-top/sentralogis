"use client";

import React from "react";
import { Truck, ChevronRight, MapPin, Building2, Package } from "lucide-react";
import { JobOrderData } from "./types";

interface ActiveJobCardProps {
  job: JobOrderData;
  isDark: boolean;
  onOpenExecution: (job: JobOrderData) => void;
}

export const ActiveJobCard: React.FC<ActiveJobCardProps> = ({
  job,
  isDark,
  onOpenExecution,
}) => {
  const statusDisplay = (() => {
    const s = (job.status || "").toUpperCase();
    if (s === "ACCEPTED" || s === "DITERIMA") return "ORDER DITERIMA";
    if (s === "IN_PROGRESS" || s === "DALAM PERJALANAN") return "DALAM PERJALANAN";
    if (s === "COMPLETED" || s === "PEKERJAAN SELESAI") return "PEKERJAAN SELESAI";
    return s.replace(/_/g, " ");
  })();

  const stops = job.job_routes || job.wo_items?.item_data?.stops || [];
  const originStop = stops[0]?.location_name || "Lokasi Muat";
  const destStop = stops[stops.length - 1]?.location_name || "Lokasi Bongkar";
  const shipperName =
    job.wo_items?.item_data?.shipper_name ||
    job.customer_name ||
    job.tenant_name ||
    "SENTRALOGIS";
  const plateNumber = job.md_fleets?.plate_number || "-";

  return (
    <div
      onClick={() => onOpenExecution(job)}
      className="relative rounded-3xl p-6 bg-slate-900 border-2 border-indigo-500/40 text-white shadow-2xl overflow-hidden cursor-pointer hover:border-indigo-400 active:scale-[0.99] transition-all"
    >
      <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/15 rounded-full blur-[50px] pointer-events-none" />

      <div className="relative z-10">
        {/* Badges Row */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/30">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                TUGAS AKTIF SAAT INI
              </span>
              {job.tenant_name && (
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                  🏢 {job.tenant_name}
                </span>
              )}
            </div>
            <h3 className="text-2xl font-black mt-1 leading-none tracking-tight">
              {job.jo_number}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 uppercase font-bold tracking-tight">
              Plat Truk: <span className="text-slate-200">{plateNumber}</span>
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md text-indigo-200 border border-white/15 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] italic">
            {statusDisplay}
          </div>
        </div>

        {/* Route / Shipper Box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1.5">
            Shipper / Pelanggan
          </p>
          <p className="text-base font-black uppercase italic leading-tight text-white">
            {shipperName}
          </p>

          <div className="text-xs text-slate-300 font-semibold mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            <MapPin size={14} className="text-indigo-400 shrink-0" />
            <span className="truncate">{originStop}</span>
            <span className="text-indigo-400">→</span>
            <span className="truncate">{destStop}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenExecution(job);
          }}
          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          UPDATE PERJALANAN{" "}
          <ChevronRight
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};
