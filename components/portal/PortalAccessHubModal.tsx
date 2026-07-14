'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Warehouse, 
  Truck, 
  ShieldCheck, 
  TowerControl, 
  X, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Radio, 
  Lock, 
  CheckCircle2, 
  ExternalLink,
  Smartphone,
  Tablet,
  Globe
} from 'lucide-react';
import Link from 'next/link';

interface PortalAccessHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PortalAccessHubModal({ isOpen, onClose }: PortalAccessHubModalProps) {
  if (!isOpen) return null;

  const portalCards = [
    {
      id: 'warehouse',
      title: 'Portal Gudang (PIN Access)',
      subtitle: 'Warehouse Touch & Scanner Console',
      description: 'Akses cepat Tallyman, Picker, & Kepala Gudang dengan PIN 6-Angka untuk Stock Opname, Inbound/Outbound Scanner, dan Repacking barang.',
      badge: '⚡ Touch & PIN 6-Digits',
      deviceInfo: 'Tablet & Handheld Friendly',
      icon: Warehouse,
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      buttonBg: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
      href: '/warehouse/portal/login',
      isExternal: false,
    },
    {
      id: 'driver',
      title: 'Portal Supir Truk & Armada',
      subtitle: 'Driver Telemetry & Mission Console',
      description: 'Akses supir lapangan dan transporter untuk konfirmasi penugasan (JO), update status milestone, ping GPS lokal, serta upload e-POD & Surat Jalan.',
      badge: '🛰️ Offline-First & Resilient',
      deviceInfo: 'High-Contrast Mobile View',
      icon: Truck,
      gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      buttonBg: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      href: '/driver/portal',
      isExternal: false,
    },
    {
      id: 'trade',
      title: 'Portal Forwarding & Clearance',
      subtitle: 'B2B Trade & Customs Document Vault',
      description: 'Akses B2B untuk PPJK (Customs Broker), Agen Forwarder, Shipping Lines, serta Klien Consignee untuk tracking SPPB, BL, DO, dan status kontainer.',
      badge: '🌐 Document Vault & Milestone',
      deviceInfo: 'Client & Vendor Collaboration',
      icon: ShieldCheck,
      gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      buttonBg: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950',
      href: '/clearance/portal',
      isExternal: false,
    },
    {
      id: 'backoffice',
      title: 'Backoffice & Executive Suite',
      subtitle: 'HQ Command Center & SBU Management',
      description: 'Akses manajemen untuk Direktur, Manajer SBU, Finance, dan Tenant Admin untuk memonitor Mission Radar, audit biaya, dan SLA Trend Analysis.',
      badge: '🔒 Email & Role Verified',
      deviceInfo: 'Full Desktop Command Center',
      icon: TowerControl,
      gradient: 'from-purple-500/20 via-indigo-500/10 to-transparent',
      borderColor: 'border-purple-500/40 hover:border-purple-400',
      iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      buttonBg: 'bg-purple-500 hover:bg-purple-400 text-slate-950',
      href: '/login',
      isExternal: false,
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-5xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
        >
          {/* Top Cosmic Banner / Header */}
          <div className="relative p-6 sm:p-8 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Unified Operational Gateway
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                  Sentralogis <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Portal Hub</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700/80 transition-all active:scale-95"
                title="Tutup Portal Hub"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Subheader info */}
          <div className="px-6 sm:px-8 py-3 bg-slate-950/50 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-medium">
            <span>Pilih gerbang akses sesuai dengan divisi operasional lapangan atau kewenangan peran Anda:</span>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1"><CheckCircle2 size={13} className="text-emerald-400" /> End-to-End Encrypted</span>
              <span className="flex items-center gap-1"><Radio size={13} className="text-cyan-400" /> Synchronized Telemetry</span>
            </div>
          </div>

          {/* Grid of Portals */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {portalCards.map((portal) => {
              const IconComponent = portal.icon;
              return (
                <div 
                  key={portal.id}
                  className={`relative group rounded-2xl border ${portal.borderColor} bg-gradient-to-br ${portal.gradient} p-6 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl flex flex-col justify-between`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner shrink-0 ${portal.iconBg}`}>
                        <IconComponent size={24} />
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border ${portal.badgeBg}`}>
                        {portal.badge}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors uppercase tracking-tight mb-1">
                      {portal.title}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mb-3 tracking-wide">
                      {portal.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-xs text-slate-300/90 leading-relaxed mb-6 font-normal">
                      {portal.description}
                    </p>
                  </div>

                  {/* Footer & CTA Button */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4 mt-auto">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      {portal.id === 'warehouse' && <Tablet size={13} className="text-emerald-400" />}
                      {portal.id === 'driver' && <Smartphone size={13} className="text-amber-400" />}
                      {portal.id === 'trade' && <Globe size={13} className="text-cyan-400" />}
                      {portal.id === 'backoffice' && <Lock size={13} className="text-purple-400" />}
                      {portal.deviceInfo}
                    </span>

                    <Link 
                      href={portal.href}
                      onClick={onClose}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 flex items-center gap-2 shrink-0 ${portal.buttonBg}`}
                    >
                      <span>Masuk Portal</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer bar */}
          <div className="px-6 sm:px-8 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-semibold">Butuh bantuan akses atau integrasi API baru untuk vendor?</span>
            <a 
              href="mailto:support@sentralogis.com" 
              className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors flex items-center gap-1.5"
            >
              <span>Hubungi Tim Dukungan Teknis Sentralogis</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
