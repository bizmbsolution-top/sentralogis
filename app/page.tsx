"use client";

import { useState, useEffect } from "react";
import { Zap, Lock, Truck, Loader2 } from 'lucide-react';
import toast, { Toaster } from "react-hot-toast";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import PortalAccessHubModal from "@/components/portal/PortalAccessHubModal";
import LanguageSelector from '@/components/LanguageSelector';
import EnterpriseGalaxy from '@/components/landing/EnterpriseGalaxy';
import { useAuth } from "@/lib/hooks/useAuth";
import { Capacitor } from '@capacitor/core';
import {
  HeroSection, SectionWhy, SectionArchitecture, SectionOperations,
  SectionAI, SectionKnowledge, SectionIntelligence, SectionEcosystem,
  SectionFuture, SectionCTA, FooterSection
} from '@/components/landing/Sections';

export default function SentralogisLanding() {
  const { profile, loading: authLoading } = useAuth();
  const [portalHubOpen, setPortalHubOpen] = useState(false);
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [checkingDeepLink, setCheckingDeepLink] = useState(true);

  useEffect(() => {
    async function init() {
      setMounted(true);
      if (Capacitor.isNativePlatform()) {
        // Check for pending deep link BEFORE showing idle screen
        try {
          const { App } = await import('@capacitor/app');
          const launchUrl = await App.getLaunchUrl();
          if (launchUrl?.url) {
            let path = '';
            const url = launchUrl.url;

            // Handle /job/{id} format (e.g. https://app.sentralogis.com/job/12345)
            const jobIdx = url.indexOf('/job/');
            if (jobIdx !== -1) {
              path = url.substring(jobIdx);
            }

            // Handle /jo/ and jo/ (for custom scheme sentralogis://jo/token)
            if (!path) {
              let joIdx = url.indexOf('/jo/');
              if (joIdx === -1) joIdx = url.indexOf('jo/');
              if (joIdx !== -1) {
                path = url.substring(joIdx);
              }
            }

            if (path) {
              const hashIndex = path.indexOf('#');
              if (hashIndex !== -1) path = path.substring(0, hashIndex);
              if (!path.startsWith('/')) path = '/' + path;
              const tokenParts = path.split('/jo/');
              if (tokenParts.length > 1) {
                const pendingToken = tokenParts[1].split('?')[0];
                if (pendingToken) {
                  try {
                    localStorage.setItem("pending_jo_token", pendingToken);
                  } catch (e) {}
                }
              }
              window.location.href = '/driver/portal';
              return; // Don't render anything, redirecting
            }
          }
        } catch (e) {
          console.log('[Homepage] Deep link check skipped:', e);
        }
        // If no deep link path was found, ALWAYS redirect Native App to /driver/portal
        window.location.href = '/driver/portal';
        return;
      }
      setCheckingDeepLink(false);
    }
    init();
  }, []);

  // Loading while checking for deep link or redirecting
  if (checkingDeepLink) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 relative">
      <Toaster position="top-right" />

      <PortalAccessHubModal isOpen={portalHubOpen} onClose={() => setPortalHubOpen(false)} />

      <EnterpriseGalaxy />

      {/* WORLD-CLASS NAVIGATION BAR — fully preserved from original */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/70 sm:bg-slate-950/40 border-b border-white/[0.08] px-3 sm:px-6 pt-safe-area-top shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col sm:flex-row justify-between items-center py-2 sm:py-4 gap-2 sm:gap-0">
          <div className="flex justify-between items-center w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 via-purple-500/20 to-pink-500/30 blur-lg rounded-full" />
                <img src="/logo2sentralogis.png" alt="Sentralogis" className="h-7 sm:h-9 w-auto relative z-10 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
              </div>
              <span className="text-base sm:text-xl font-black tracking-wider uppercase text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                Sentralogis
              </span>
              <span className="text-[8px] sm:text-[9px] font-black tracking-widest bg-purple-950/50 text-purple-300 px-2 py-0.5 border border-purple-500/30 rounded-full hidden md:inline-block shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                ENTERPRISE OS
              </span>
            </div>
            <div className="flex sm:hidden items-center">
              <LanguageSelector />
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-xs font-bold tracking-widest uppercase text-slate-400">
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-slate-100 transition-colors">{t.nav.beranda}</a>
            <a href="#features" className="hover:text-slate-100 transition-colors">{t.nav.fitur}</a>
            <a href="#contact" className="hover:text-slate-100 transition-colors">{t.nav.kontak}</a>
          </nav>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t border-white/10 sm:border-none">
            <div className="hidden sm:block relative">
              <LanguageSelector />
            </div>
            <button
              onClick={() => setPortalHubOpen(true)}
              className="flex-1 sm:flex-initial relative group overflow-hidden border border-cyan-400/60 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 text-slate-950 px-3 py-2.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.9)] transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 min-h-[42px] sm:min-h-0"
            >
              <Zap className="w-4 h-4 sm:w-4 sm:h-4 shrink-0 animate-bounce text-white" />
              <span className="font-black text-xs sm:text-xs tracking-wider uppercase text-white">{t.nav.login}</span>
            </button>
            <a
              href="/login"
              className="flex-1 sm:flex-initial relative group overflow-hidden border border-cyan-500/40 sm:border-slate-700/60 bg-slate-900/95 sm:bg-slate-900/80 hover:border-cyan-500 text-cyan-300 sm:text-slate-200 hover:text-white px-3 sm:px-4 py-2.5 sm:py-2 text-xs font-black sm:font-bold tracking-wider uppercase rounded-xl sm:rounded-full transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 min-h-[42px] sm:min-h-0 shadow-lg sm:shadow-none"
            >
              <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-black sm:font-bold">{t.nav.loginManajemen}</span>
            </a>
          </div>
        </div>
      </header>

      {mounted && (
        <>
          <HeroSection />
          <SectionWhy />
          <SectionArchitecture />
          <SectionOperations />
          <SectionAI />
          <SectionKnowledge />
          <SectionIntelligence />
          <SectionEcosystem />
          <SectionFuture />
          <SectionCTA />
          <FooterSection />
        </>
      )}
    </div>
  );
}
