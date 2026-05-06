'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import IntelligenceTower from '@/components/sbu/IntelligenceTower';

export default function HQSBUActivitiesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-24 min-h-screen bg-white">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Initializing Satellite Link...</p>
      </div>
    }>
      <IntelligenceTower />
    </Suspense>
  );
}
