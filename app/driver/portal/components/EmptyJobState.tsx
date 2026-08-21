"use client";

import React from "react";
import { Package, CheckCircle2 } from "lucide-react";

interface EmptyJobStateProps {
  isDark: boolean;
}

export const EmptyJobState: React.FC<EmptyJobStateProps> = ({ isDark }) => {
  return (
    <div
      className={`rounded-3xl p-8 text-center border shadow-xl ${
        isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner ${
          isDark ? "bg-slate-950 border border-slate-800" : "bg-slate-50 border border-slate-100"
        }`}
      >
        <Package size={36} className="text-slate-400" />
      </div>

      <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">
        Belum Ada Tugas
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1.5 leading-relaxed">
        Saat ini belum ada Job Order yang ditugaskan kepada Anda. Menunggu penugasan baru dari kantor.
      </p>

      <div className="inline-flex items-center gap-2 mt-5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-black uppercase tracking-wider">
        <CheckCircle2 size={14} /> Perangkat siap menerima tugas
      </div>
    </div>
  );
};
