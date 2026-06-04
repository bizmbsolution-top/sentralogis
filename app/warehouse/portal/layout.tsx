'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2, LogOut, User, Menu } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

export default function WarehousePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Check for PWA session in localStorage
    const storedSession = localStorage.getItem('sentralogis_wh_session');
    
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession);
        if (parsed.staff_id) {
          setSession(parsed);
        } else {
          localStorage.removeItem('sentralogis_wh_session');
          if (pathname !== '/warehouse/portal/login') router.replace('/warehouse/portal/login');
        }
      } catch (err) {
        localStorage.removeItem('sentralogis_wh_session');
        if (pathname !== '/warehouse/portal/login') router.replace('/warehouse/portal/login');
      }
    } else {
      if (pathname !== '/warehouse/portal/login') router.replace('/warehouse/portal/login');
    }
    
    setLoading(false);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('sentralogis_wh_session');
    router.replace('/warehouse/portal/login');
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  // If on login page, don't show the header shell
  if (pathname === '/warehouse/portal/login') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans text-slate-900">
        <Toaster position="top-center" />
        {children}
      </div>
    );
  }

  // Active PWA Shell
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Toaster position="top-center" />
      
      {/* PWA App Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md h-16">
        <div className="px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors md:hidden">
               <Menu size={20} />
            </button>
            <div>
               <h1 className="font-bold text-lg tracking-wide">Sentralogis <span className="font-black text-blue-400">WH</span></h1>
               <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{session?.role || 'Staff'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-right">
               <p className="text-base font-bold">{session?.name}</p>
               <p className="text-sm text-emerald-400 font-black font-mono">{session?.whatsapp}</p>
             </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-full hover:bg-slate-800" title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Scrollable) */}
      <main className="flex-1 overflow-y-auto w-full max-w-3xl mx-auto pb-20">
        {children}
      </main>
      
      {/* Safe area for mobile notch/home indicator */}
      <div className="h-safe-area-bottom bg-slate-50" />
    </div>
  );
}
