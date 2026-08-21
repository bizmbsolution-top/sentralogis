"use client";

import React from "react";
import { Smartphone, Sun, Moon, LogOut, ShieldCheck, Truck } from "lucide-react";
import { DriverProfileData, TenantInfoData } from "./types";

interface DriverHeaderProps {
  driver: DriverProfileData | null;
  tenantInfo: TenantInfoData | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenInfoPerangkat: () => void;
  onLogout: () => void;
}

export const DriverHeader: React.FC<DriverHeaderProps> = ({
  driver,
  tenantInfo,
  isDark,
  onToggleTheme,
  onOpenInfoPerangkat,
  onLogout,
}) => {
  const isVendor = !!driver?.entity_id;
  const driverDisplayName = driver?.name || "Nama Driver";

  return (
    <header
      className={`relative p-5 pb-8 rounded-b-[2rem] shadow-xl overflow-hidden transition-all duration-300 ${
        isDark
          ? "bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border-b border-indigo-900/30"
          : "bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 text-white"
      }`}
    >
      <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-[70px] pointer-events-none" />

      {/* Top Bar: Brand, Actions */}
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <img
            src="/logo2sentralogis.png"
            alt="SentraLogis"
            className="w-10 h-10 rounded-xl object-contain bg-white/20 backdrop-blur-md p-1 border border-white/20 shadow-sm"
          />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/90">
              {tenantInfo?.name || "SENTRALOGIS"} — PORTAL DRIVER
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  isVendor
                    ? "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                    : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
                }`}
              >
                {isVendor ? (
                  <>
                    <Truck size={10} /> VENDOR DRIVER
                  </>
                ) : (
                  <>
                    <ShieldCheck size={10} /> INTERNAL DRIVER
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Info Perangkat Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenInfoPerangkat();
            }}
            className="w-9 h-9 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm text-white"
            title="Info Perangkat & GPS"
          >
            <Smartphone size={16} />
          </button>

          {/* Dark/Light Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-9 h-9 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/20 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm text-white"
            title="Ubah Mode Tampilan"
          >
            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="w-9 h-9 bg-red-500/90 hover:bg-red-600 active:scale-95 border border-red-400/50 text-white rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-sm shadow-red-500/30"
            title="Keluar / Logout"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Driver Greeting Card */}
      <div className="mt-5 relative z-10">
        <p className="text-xs font-semibold text-indigo-200">Selamat datang,</p>
        <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
          {driverDisplayName}
        </h1>
      </div>
    </header>
  );
};
