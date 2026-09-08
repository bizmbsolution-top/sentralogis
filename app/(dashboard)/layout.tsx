'use client'

import React, { useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import { useAuth } from '@/lib/hooks/useAuth'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, authReady, isAuthenticated } = useAuth()

  useEffect(() => {
    if (authReady && !isAuthenticated) {
      window.location.replace('/login');
    }
  }, [authReady, isAuthenticated]);

  if (loading || !authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Verifying Session...
        </p>
      </div>
    )
  }

  if (!isAuthenticated || !user?.id) {
    return null
  }

  return <AppShell>{children}</AppShell>
}
