import React from 'react';
import MasterDataRouteGate from '@/components/master/MasterDataRouteGate';

// Server-side Master Data access gate (see lib/application/identity/master-data-guard.ts).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <MasterDataRouteGate categories={['fleet']}>{children}</MasterDataRouteGate>;
}
