"use client";

import React from "react";
import {
  User,
  Phone,
  Truck,
  ShieldCheck,
  CreditCard,
  Building2,
  Smartphone,
  CheckCircle2,
  Calendar,
  LogOut,
  Clock,
  Wrench,
} from "lucide-react";
import { DriverProfileData, TenantInfoData, DeviceTelemetryState } from "./types";

interface ProfileTabProps {
  driver: DriverProfileData | null;
  tenantInfo: TenantInfoData | null;
  telemetry: DeviceTelemetryState;
  isDark: boolean;
  onOpenAttendance?: () => void;
  onOpenInspection?: () => void;
  onOpenInfoPerangkat: () => void;
  onLogout: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  driver,
  tenantInfo,
  telemetry,
  isDark,
  onOpenAttendance,
  onOpenInspection,
  onOpenInfoPerangkat,
  onLogout,
}) => {
  const isVendor = !!driver?.entity_id;
  const driverName = driver?.name || "Nama Driver";
  const driverPhone = driver?.whatsapp || driver?.phone || "-";
  const driverCode = driver?.driver_code || driver?.id?.substring(0, 8) || "-";

  return (
    <div className="space-y-5">
      {/* Profile Card Header */}
      <div
        className={`rounded-3xl p-6 shadow-xl border text-center relative overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-1 mx-auto mb-3 shadow-xl">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white overflow-hidden">
            {driver?.photo_url ? (
              <img
                src={driver.photo_url}
                alt={driverName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={44} className="text-indigo-300" />
            )}
          </div>
        </div>

        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
          {driverName}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          ID: {driverCode}
        </p>

        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
          {isVendor ? <Truck size={13} /> : <ShieldCheck size={13} />}
          {isVendor ? "Vendor Driver" : "Internal Driver"}
        </div>
      </div>

      {/* Optional Daily Facility Quick Buttons (Non-blocking) */}
      {(onOpenAttendance || onOpenInspection) && (
        <div
          className={`rounded-3xl p-4 border shadow-md ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
            Fasilitas Harian (Opsional)
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {onOpenAttendance && (
              <button
                type="button"
                onClick={onOpenAttendance}
                className="p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 text-indigo-500 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Clock size={15} /> Absen Masuk
              </button>
            )}
            {onOpenInspection && (
              <button
                type="button"
                onClick={onOpenInspection}
                className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-500 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Wrench size={15} /> Cek Kendaraan
              </button>
            )}
          </div>
        </div>
      )}

      {/* Master Data Section */}
      <div
        className={`rounded-3xl p-5 shadow-xl border space-y-3.5 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/20">
          Data Master Driver
        </h3>

        {/* WhatsApp */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <Phone size={15} /> No. WhatsApp
          </span>
          <span className="font-black text-slate-800 dark:text-slate-200">
            {driverPhone}
          </span>
        </div>

        {/* Tenant */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <Building2 size={15} /> Tenant
          </span>
          <span className="font-black text-slate-800 dark:text-slate-200">
            {tenantInfo?.name || "SENTRALOGIS"}
          </span>
        </div>

        {/* SIM */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <CreditCard size={15} /> SIM Driver
          </span>
          <span className="font-black text-slate-800 dark:text-slate-200">
            {driver?.sim_class ? `SIM ${driver.sim_class}` : "SIM B II UMUM"}
          </span>
        </div>

        {/* SIM Expiry */}
        {driver?.sim_expiry && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-400">
              <Calendar size={15} /> Masa Berlaku SIM
            </span>
            <span className="font-black text-slate-800 dark:text-slate-200">
              {driver.sim_expiry}
            </span>
          </div>
        )}
      </div>

      {/* App & Device Diagnostics Card */}
      <div
        className={`rounded-3xl p-5 shadow-xl border space-y-3 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/20">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Informasi Aplikasi & GPS
          </h3>
          <button
            type="button"
            onClick={onOpenInfoPerangkat}
            className="text-[11px] font-bold text-indigo-500 hover:text-indigo-600"
          >
            Diagnostik Lengkap
          </button>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <Smartphone size={15} /> Tipe Platform
          </span>
          <span className="font-black text-slate-800 dark:text-slate-200">
            {telemetry.isNativeApp ? "Native Android APK" : "PWA Browser"}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 size={15} className="text-emerald-500" /> Status Layanan GPS
          </span>
          <span className="font-black text-emerald-500">
            {telemetry.gpsStatus === "active" ? "Aktif Memancarkan" : "Standby"}
          </span>
        </div>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/30 text-red-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
      >
        <LogOut size={16} /> Keluar dari Akun Driver
      </button>
    </div>
  );
};
