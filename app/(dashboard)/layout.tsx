"use client";

import React from 'react';
import { GoogleMapsProvider } from '@/lib/google-maps-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GoogleMapsProvider>
      {children}
    </GoogleMapsProvider>
  );
}
