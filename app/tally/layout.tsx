'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, PackageSearch, CloudDownload, CloudUpload, User } from 'lucide-react';
import Link from 'next/link';
import { Toaster } from 'react-hot-toast';

export default function TallyLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!loading && !profile) {
      router.replace('/login?redirect=/tally');
    }
  }, [profile, loading, router]);

  useEffect(() => {
    // Online/Offline detection
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Memuat Portal Tally...</p>
      </div>
    );
  }

  const isDetail = pathname.includes('/inbound/') || pathname.includes('/outbound/');

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-hidden font-sans">
      <Toaster position="top-center" />
      
      {/* Top Status Bar (Only visible if offline) */}
      {!isOnline && (
        <div className="bg-rose-500 text-white text-[10px] font-bold text-center py-1 uppercase tracking-widest flex items-center justify-center gap-2">
          Anda Sedang Offline
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${!isDetail ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation (Hidden on detail pages to maximize scanner space) */}
      {!isDetail && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between z-50 pb-safe">
          <Link href="/tally" className={`flex flex-col items-center gap-1 ${pathname === '/tally' ? 'text-blue-600' : 'text-slate-400'}`}>
            <PackageSearch size={24} />
            <span className="text-[10px] font-bold">Inbound</span>
          </Link>
          
          <Link href="/tally/outbound" className={`flex flex-col items-center gap-1 ${pathname === '/tally/outbound' ? 'text-blue-600' : 'text-slate-400'}`}>
            <CloudUpload size={24} />
            <span className="text-[10px] font-bold">Outbound</span>
          </Link>
          
          <Link href="/tally/profile" className={`flex flex-col items-center gap-1 ${pathname === '/tally/profile' ? 'text-blue-600' : 'text-slate-400'}`}>
            <User size={24} />
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
