'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MessageSquare, Calendar, Briefcase } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function SalesPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const NAV_ITEMS = [
    { name: 'Home', href: '/portal/sales', icon: Home, match: '/portal/sales' },
    { name: 'Leads', href: '/portal/sales/leads', icon: Users, match: '/portal/sales/leads' },
    { name: 'Deals', href: '/portal/sales/deals', icon: Briefcase, match: '/portal/sales/deals' },
    { name: 'Chat', href: '/portal/sales/chat', icon: MessageSquare, match: '/portal/sales/chat' },
    { name: 'Schedule', href: '/portal/sales/schedule', icon: Calendar, match: '/portal/sales/schedule' },
  ];

  if (!user || profile?.role !== 'hq_sales_staff') {
    // Optionally return null or loading state while auth redirect happens
  }

  return (
    <div className="bg-slate-100 min-h-[100dvh] flex justify-center">
      {/* Mobile Container */}
      <div className="w-full max-w-md bg-white h-[100dvh] flex flex-col relative shadow-2xl overflow-hidden">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-[80px]">
          {children}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-[70px] bg-white border-t border-slate-200 flex justify-around items-center px-2 pb-2 pt-1 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[900]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            // Exact match for Home, prefix match for others
            const isActive = item.href === '/portal/sales' 
              ? pathname === '/portal/sales'
              : pathname.startsWith(item.match);

            return (
              <Link 
                key={item.name} 
                href={item.href}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 relative group"
              >
                <div className={`p-1.5 rounded-full transition-all duration-200 ${isActive ? 'bg-indigo-100 text-indigo-600 scale-110' : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-50'}`}>
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
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
