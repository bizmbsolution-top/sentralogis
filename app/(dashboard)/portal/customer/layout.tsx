'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Package, AlertCircle, User } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Toaster } from 'react-hot-toast';

export default function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, authReady } = useAuth();

  const NAV_ITEMS = [
    { name: 'My Orders', href: '/portal/customer', icon: Home },
    { name: 'Shipments', href: '/portal/customer/shipments', icon: Package },
    { name: 'Exceptions', href: '/portal/customer/exceptions', icon: AlertCircle },
    { name: 'Profile', href: '/portal/customer/profile', icon: User },
  ];

  if (!authReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || profile?.role !== 'warehouse_customer') {
    router.replace('/login?redirect=/portal/customer');
    return null;
  }

  return (
    <div className="bg-slate-100 min-h-[100dvh] flex justify-center">
      <Toaster position="top-center" containerClassName="!z-[9999]" />
      <div className="w-full max-w-md bg-white h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-[80px]">
          {children}
        </div>

        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[80px] bg-white border-t border-slate-200 flex justify-around items-center px-2 pb-2 pt-1 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[900]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 relative group"
              >
                <div className={`p-2 rounded-full transition-all duration-200 ${isActive ? 'bg-indigo-100 text-indigo-600 scale-110' : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-50'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                </div>
                <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
