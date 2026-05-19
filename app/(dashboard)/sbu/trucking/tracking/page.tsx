'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import FleetTrackingConsole from '@/components/sbu/FleetTrackingConsole';

export default function SBUTrackingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400">Loading tracking...</p>
      </div>
    }>
      <FleetTrackingConsole />
    </Suspense>
  );
}
