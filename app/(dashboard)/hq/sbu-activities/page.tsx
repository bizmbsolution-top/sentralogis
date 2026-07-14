'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import FleetTrackingConsole from '@/components/sbu/FleetTrackingConsole';

export default function HQSBUActivitiesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] bg-white">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-500 text-sm font-medium">Loading unified live radar console...</p>
      </div>
    }>
      <FleetTrackingConsole />
    </Suspense>
  );
}
