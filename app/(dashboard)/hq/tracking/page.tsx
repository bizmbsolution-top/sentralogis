'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import FleetTrackingConsole from '@/components/sbu/FleetTrackingConsole';

function TrackingLoader() {
  const [joParam, setJoParam] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jo = params.get('jo');
    if (jo) setJoParam(jo);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-white">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
      <p className="text-sm text-slate-400">Loading tracking{joParam ? `: ${joParam}` : '...'} </p>
    </div>
  );
}

export default function HQTrackingPage() {
  return (
    <Suspense fallback={<TrackingLoader />}>
      <FleetTrackingConsole />
    </Suspense>
  );
}
