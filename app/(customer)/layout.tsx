'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Loader2, 
  Package, 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  LogOut, 
  Building2, 
  Menu, 
  X, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, authReady, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [fetchingName, setFetchingName] = useState<boolean>(false);

  useEffect(() => {
    if (authReady && !isAuthenticated) {
      window.location.replace('/login');
    }
  }, [authReady, isAuthenticated]);

  useEffect(() => {
    async function fetchCustomerEntity() {
      if (profile?.customer_id) {
        setFetchingName(true);
        try {
          const { data } = await supabase
            .from('md_entities')
            .select('name, legal_name, entity_code')
            .eq('id', profile.customer_id)
            .maybeSingle();
          if (data) {
            const displayName = [data.name, data.legal_name].filter(Boolean).join(' - ');
            setCustomerName(displayName || data.entity_code || 'B2B Client');
          } else {
            setCustomerName(profile.full_name || 'B2B Client');
          }
        } catch (e) {
          console.warn('Error fetching entity name', e);
          setCustomerName(profile.full_name || 'B2B Client');
        } finally {
          setFetchingName(false);
        }
      } else if (profile?.full_name) {
        setCustomerName(profile.full_name);
      }
    }
    if (profile) {
      fetchCustomerEntity();
    }
  }, [profile]);

  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#070b19] text-white">
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin relative z-10" />
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Verifying Client Portal Access...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user?.id) {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/customer/warehouse', icon: LayoutDashboard },
    { name: 'Live Inventory', href: '/customer/warehouse/inventory', icon: Package },
    { name: 'Inbound Receipts', href: '/customer/warehouse/inbound', icon: ArrowDownLeft },
    { name: 'Outbound Shipments', href: '/customer/warehouse/outbound', icon: ArrowUpRight },
  ];

  return (
    <div className="min-h-screen bg-[#070b19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Logo and Entity Badge */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/sentralogis_logo.png" alt="Sentralogis" className="h-8 sm:h-10 w-auto drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black tracking-wider text-white uppercase leading-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                  Sentralogis
                </span>
                <span className="text-[9px] font-black tracking-widest text-cyan-400 uppercase leading-none">
                  B2B Client Portal
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 pl-6 border-l border-white/10">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Principal Account</div>
                <div className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                  {fetchingName ? (
                    <span className="animate-pulse text-slate-500">Loading Client...</span>
                  ) : (
                    <>
                      {customerName || 'Authorized Client'}
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 inline drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-cyan-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">{profile?.full_name || user?.email}</span>
              <span className="text-[10px] font-medium text-slate-400">{profile?.email}</span>
            </div>
            
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Client Entity Banner */}
        <div className="md:hidden bg-slate-900/90 border-t border-white/[0.06] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs font-black text-white tracking-tight">
              {customerName || profile?.full_name || 'Authorized Client'}
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            Principal
          </span>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950/95 border-b border-white/10 px-4 py-4 space-y-2 animate-in slide-in-from-top duration-300">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                      : 'bg-slate-900/60 text-slate-300 border border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-in fade-in duration-500">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 bg-slate-950/60 text-center text-xs font-medium text-slate-500">
        <p>© {new Date().getFullYear()} Sentralogis — Enterprise WMS & 3PL Logistics Portal. All rights reserved.</p>
      </footer>
    </div>
  );
}
