'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Briefcase, Package, User } from 'lucide-react';
import { DriverAuthProvider, useDriverAuth } from '@/lib/hooks/useDriverAuth';
import { Toaster } from 'react-hot-toast';

function VendorBottomNav({ pathname }: { pathname: string }) {
  const NAV_ITEMS = [
    { name: 'My Jobs', href: '/portal/vendor', icon: Home },
    { name: 'Completed', href: '/portal/vendor/completed', icon: Package },
    { name: 'Profile', href: '/portal/vendor/profile', icon: User },
  ];

  return (
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
  );
}

function VendorPortalContent({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useDriverAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.replace('/driver/login?redirect=/portal/vendor');
    return null;
  }

  return (
    <div className="bg-slate-100 min-h-[100dvh] flex justify-center">
      <div className="w-full max-w-md bg-white h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-[80px]">
          {children}
        </div>
        <VendorBottomNav pathname={pathname} />
      </div>
    </div>
  );
}

export default function VendorPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverAuthProvider>
      <Toaster position="top-center" containerClassName="!z-[9999]" />
      <VendorPortalContent>{children}</VendorPortalContent>
    </DriverAuthProvider>
  );
}
