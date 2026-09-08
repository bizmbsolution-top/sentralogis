'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ControlTowerWorkspace } from '@/components/control-tower/ControlTowerWorkspace';

export default function CommercialControlTowerDetailPage() {
  const params = useParams();
  const salesOrderId = params?.salesOrderId as string;

  if (!salesOrderId) {
    return null;
  }

  return <ControlTowerWorkspace salesOrderId={salesOrderId} />;
}
