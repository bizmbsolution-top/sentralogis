"use client";

import React from "react";
import {
  Smartphone,
  MapPin,
  Wifi,
  WifiOff,
  Battery,
  Satellite,
  ChevronRight,
} from "lucide-react";
import { DeviceTelemetryState } from "./types";

interface DeviceSummaryProps {
  telemetry: DeviceTelemetryState;
  isDark: boolean;
  onOpenDetail: () => void;
}

export const DeviceSummary: React.FC<DeviceSummaryProps> = ({
  telemetry,
  isDark,
  onOpenDetail,
}) => {
  const isGpsActive = telemetry.gpsStatus === "active";
  const isGpsStandby = telemetry.gpsStatus === "inactive";
  const isGpsError = telemetry.gpsStatus === "error";

  return (
    <div
      className={`rounded-2xl p-4 border transition-all shadow-md ${
        isDark
          ? "bg-slate-900/90 border-slate-800 text-slate-100"
          : "bg-white border-slate-200 text-slate-900"
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/20">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-indigo-500" />
          <h3 className="text-xs font-black uppercase tracking-wider">
            Status Perangkat & Jaringan
          </h3>
        </div>
        <button
          type="button"
          onClick={onOpenDetail}
          className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600 active:scale-95 flex items-center gap-1 transition-all"
        >
          Lihat Detail <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3">
        {/* Device Type */}
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
            isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Smartphone size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase text-slate-400">Aplikasi</p>
            <p className="text-xs font-black truncate">
              {telemetry.isNativeApp ? "Native App" : "PWA Web"}
            </p>
          </div>
        </div>

        {/* GPS State */}
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
            isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-100"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isGpsActive
                ? "bg-emerald-500/10 text-emerald-500"
                : isGpsError
                ? "bg-red-500/10 text-red-500"
                : "bg-slate-500/10 text-slate-400"
            }`}
          >
            <MapPin size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase text-slate-400">GPS</p>
            <p
              className={`text-xs font-black truncate ${
                isGpsActive
                  ? "text-emerald-500"
                  : isGpsError
                  ? "text-red-500"
                  : "text-slate-400"
              }`}
            >
              {isGpsActive
                ? "Aktif"
                : isGpsStandby
                ? "Standby"
                : isGpsError
                ? "Error"
                : "Standby"}
            </p>
          </div>
        </div>

        {/* Internet */}
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
            isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-100"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              telemetry.isOnline
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-red-500/10 text-red-500"
            }`}
          >
            {telemetry.isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase text-slate-400">Internet</p>
            <p
              className={`text-xs font-black truncate ${
                telemetry.isOnline ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {telemetry.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Battery / Tracking */}
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
            isDark ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 border-slate-100"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            {telemetry.gpsBattery !== null ? <Battery size={16} /> : <Satellite size={16} />}
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase text-slate-400">
              {telemetry.gpsBattery !== null ? "Baterai" : "Tracking"}
            </p>
            <p className="text-xs font-black truncate">
              {telemetry.gpsBattery !== null
                ? `${Math.round(telemetry.gpsBattery)}%`
                : isGpsActive
                ? "Aktif"
                : "Standby"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
