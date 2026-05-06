import React from 'react';
import CargoTrackingClient from '@/components/tracking/CargoTrackingClient';

export default function CargoTrackPage({ params }: { params: { token: string } }) {
  // Mock data for demo
  const cargoData = {
    sku: `CARGO-${params.token.toUpperCase()}`,
    owner: 'Forwarder Partner A'
  };

  return (
    <div className="bg-[#050505] min-h-screen">
      {/* Example showing end-user view by default */}
      <CargoTrackingClient cargoData={cargoData} isForwarderView={false} />
    </div>
  );
}
