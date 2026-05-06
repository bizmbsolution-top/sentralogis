"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  CreditCard,
  History,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import toast from 'react-hot-toast';

interface SidebarItem {
  name: string;
  href: string;
  icon: any;
}

export function Sidebar({ items }: { items: SidebarItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { logout, profile } = useAuth();

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-slate-900 border border-white/5 rounded-xl text-slate-400"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[50] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed inset-y-0 left-0 z-[55] w-72 bg-slate-950 border-r border-white/5 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tighter uppercase italic">
                Sentralogis<span className="text-emerald-500">.</span>
              </span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] -mt-1">
                OS v4.0.1
              </span>
            </div>
          </div>

          {/* User Profile Summary */}
          <div className="mb-10 p-4 rounded-2xl bg-white/5 border border-white/5">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-emerald-400 uppercase tracking-tighter">
                   {profile?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col overflow-hidden">
                   <span className="text-[10px] font-black text-white truncate">{profile?.full_name || 'User'}</span>
                   <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest truncate">{(profile?.role || 'user').replace('_', ' ')}</span>
                </div>
             </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-2">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent'}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-500' : 'text-slate-600 group-hover:text-slate-400'}`} />
                  <span className="text-xs font-black uppercase tracking-widest">{item.name}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-6 border-t border-white/5">
            <button 
              onClick={() => logout()}
              className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all group"
            >
              <LogOut className="w-5 h-5 text-slate-600 group-hover:text-rose-500" />
              <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
