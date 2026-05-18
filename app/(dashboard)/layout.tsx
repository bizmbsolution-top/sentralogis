'use client'

import React, { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopNavbar from '@/components/layout/TopNavbar'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  // [AI] Removed the redundant router.refresh() on mount/auth confirmation to prevent full-screen loading spinner flashes.
  // The client-side useAuth context manages state and triggers component re-renders seamlessly.

  // [AI] Auth guard: redirect to /login if not authenticated after loading completes
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Verifying Session...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    // [AI] Use window.location.replace for a clean redirect to avoid stale state
    if (typeof window !== 'undefined') {
      window.location.replace('/login')
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Redirecting to Login...
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onLinkClick={() => {}} // [AI] Removed redundant router.refresh() on link click to keep transitions smooth
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
