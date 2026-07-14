'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Search, FileText, Anchor, ArrowLeft, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function ClearancePortalPage() {
  const [docNumber, setDocNumber] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber) return;
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[160px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/"
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2 border border-slate-700 transition-all text-xs font-bold uppercase tracking-wider shadow-md"
            title="Kembali ke Beranda / Portal Hub"
          >
            <ArrowLeft size={16} className="text-cyan-400" />
            <span className="hidden sm:inline">Kembali ke Portal Hub</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white leading-tight">
                Sentralogis <span className="text-cyan-400">Customs & Trade</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                B2B Document Vault & PPJK Portal
              </p>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>INSW Customs Connect Ready</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="text-center mb-8 space-y-2">
            <div className="w-16 h-16 bg-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30 mb-4">
              <Anchor size={32} className="text-slate-950" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome to Customs Portal
            </h1>
            <p className="text-xs font-semibold text-slate-400">
              Track Document Number (AJU, BL/DO) or SPPB status directly from HQ Vault
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nomor Referensi (AJU / BL / JO / SPPB)
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Contoh: HALU-TPS-0726-001 / 000000-123456-20260710"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono tracking-wide"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                PIN Verifikasi B2B (Opsional)
              </label>
              <input 
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="•••••• (Kosongkan untuk pencarian publik)"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono tracking-widest"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Search size={16} />
              <span>Cari & Verifikasi Dokumen</span>
            </button>
          </form>

          {searched && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 pt-6 border-t border-slate-800 space-y-4"
            >
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-cyan-400 font-bold">{docNumber.toUpperCase()}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={12} /> SPPB Diterbitkan (Green Channel)
                  </span>
                </div>
                
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-500 font-medium">Consignee:</span>
                    <span className="font-bold">PT. MAKMUR BERKAT SOLUSI</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-500 font-medium">PPJK Broker:</span>
                    <span className="font-bold">Sentralogis Customs Division</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-900">
                    <span className="text-slate-500 font-medium">Pelabuhan:</span>
                    <span className="font-bold">Tanjung Priok / TPS JICT</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Est. Delivery:</span>
                    <span className="font-bold text-cyan-400">11 Juli 2026 (Armada Siap)</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold py-2 rounded-xl text-white transition-all flex items-center justify-center gap-1.5">
                    <FileText size={14} className="text-cyan-400" /> Unduh SPPB & BAST
                  </button>
                  <Link href="/login" className="px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold py-2 rounded-xl text-slate-300 hover:text-white transition-all flex items-center justify-center">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Akses Khusus Klien Terdaftar & Mitra PPJK</span>
            <Link href="/login" className="text-cyan-400 hover:underline">Masuk sebagai Internal Admin ➔</Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-600 font-mono">
        &copy; 2026 Sentralogis &bull; All Customs Data Synchronized via CEISA 4.0 / INSW
      </footer>
    </div>
  );
}
