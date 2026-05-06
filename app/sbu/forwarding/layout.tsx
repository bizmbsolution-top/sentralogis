import React from 'react';
import { Home, LayoutGrid, Ship, Wallet, Search } from 'lucide-react';
import Link from 'next/link';

export default function ForwardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-[#006699]/5 text-slate-800">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/20">
               <Ship className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900 italic uppercase">SBU Forwarding</h1>
              <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase">Vessel & Consol Hub</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-black tracking-widest text-slate-400">
            <Link href="/sbu/forwarding" className="hover:text-slate-900 transition-colors uppercase">Cockpit</Link>
            <Link href="/sbu/forwarding/consol" className="hover:text-slate-900 transition-colors uppercase">Consolidation</Link>
            <Link href="/sbu/forwarding/hs-codes" className="hover:text-slate-900 transition-colors uppercase border-b-2 border-purple-600 text-slate-900 pb-1">HS Engine</Link>
            <Link href="/sbu/forwarding/clearance" className="hover:text-slate-900 transition-colors uppercase">Clearance</Link>
            <Link href="/sbu/forwarding/finances" className="hover:text-slate-900 transition-colors uppercase">Finances</Link>
          </nav>

          <div className="flex items-center gap-3">
             <div className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-2">
                <Search className="w-3 h-3 text-purple-600" />
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Global Sync V2</span>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      {/* Mobile Nav mirroring Trucking */}
      <nav className="fixed bottom-0 w-full left-0 bg-white border-t border-slate-200 px-4 py-3 rounded-t-[2rem] shadow-[0_-15px_40px_rgba(0,0,0,0.06)] z-20 pb-safe md:hidden">
        <div className="flex justify-around items-center">
          <Link href="/sbu-launchpad" className="flex flex-col items-center gap-1 p-2 text-slate-400"><Home className="w-6 h-6" /><span className="text-[10px] font-bold">Portal</span></Link>
          <Link href="/sbu/forwarding" className="flex flex-col items-center gap-1 p-2 text-purple-600"><LayoutGrid className="w-6 h-6" /><span className="text-[10px] font-bold">Cockpit</span></Link>
          <Link href="/sbu/forwarding/consol" className="flex flex-col items-center gap-1 p-2 text-slate-400"><Ship className="w-6 h-6" /><span className="text-[10px] font-bold">Consol</span></Link>
          <Link href="/sbu/forwarding/finances" className="flex flex-col items-center gap-1 p-2 text-slate-400"><Wallet className="w-6 h-6" /><span className="text-[10px] font-bold">Billing</span></Link>
        </div>
      </nav>
    </div>
  );
}
