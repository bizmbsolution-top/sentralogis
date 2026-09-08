'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export type Workspace = 'commercial' | 'operations' | 'finance' | 'intelligence' | 'admin';

export interface WorkspaceDefinition {
  id: Workspace;
  label: string;
  description: string;
  icon: string;
  href: string;
  requiredPermission?: string;
}

export const WORKSPACES: WorkspaceDefinition[] = [
  { id: 'commercial', label: 'Commercial', description: 'Customers, Engagements, Orders', icon: '💼', href: '/commercial' },
  { id: 'operations', label: 'Operations', description: 'Fulfillment, Shipments, Execution', icon: '⚙️', href: '/operations' },
  { id: 'finance', label: 'Financial', description: 'Invoices, Payments, Settlements', icon: '💰', href: '/finance' },
  { id: 'intelligence', label: 'Intelligence', description: 'Visibility, Margin, Exceptions', icon: '📊', href: '/intelligence' },
  { id: 'admin', label: 'Administration', description: 'Users, Roles, Settings', icon: '⚙️', href: '/admin' },
];

interface WorkspaceContextType {
  activeWorkspace: Workspace;
  setActiveWorkspace: (workspace: Workspace) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>('commercial');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (pathname.startsWith('/commercial')) setActiveWorkspace('commercial');
    else if (pathname.startsWith('/operations') || pathname.startsWith('/sbu')) setActiveWorkspace('operations');
    else if (pathname.startsWith('/finance') || pathname.startsWith('/hq/finance')) setActiveWorkspace('finance');
    else if (pathname.startsWith('/intelligence')) setActiveWorkspace('intelligence');
    else if (pathname.startsWith('/admin') || pathname.startsWith('/tenant')) setActiveWorkspace('admin');
  }, [pathname]);

  const handleSetActiveWorkspace = useCallback((workspace: Workspace) => {
    setActiveWorkspace(workspace);
    const def = WORKSPACES.find((w) => w.id === workspace);
    if (def) window.location.href = def.href;
  }, []);

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, setActiveWorkspace: handleSetActiveWorkspace, sidebarOpen, setSidebarOpen }}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
