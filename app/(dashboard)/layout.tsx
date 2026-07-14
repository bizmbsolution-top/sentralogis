'use client'

import React, { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopNavbar from '@/components/layout/TopNavbar'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ChatProvider } from '@/lib/contexts/ChatContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, profile, loading, authReady, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // [AI] Redirect to login when auth is resolved and user is not authenticated
  useEffect(() => {
    if (authReady && !isAuthenticated) {
      window.location.replace('/login');
    }
  }, [authReady, isAuthenticated]);

  // [AI] Show spinner while auth is loading OR while auth session is not ready yet
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

  if (!isAuthenticated) {
    return null
  }

  if (!user?.id) {
    return null
  }

  return (
    <ChatProvider userId={user.id} tenantId={profile?.tenant_id}>
      <div className="flex min-h-screen bg-slate-50">
        
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          onLinkClick={() => {}}
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
    </ChatProvider>
  )
}
