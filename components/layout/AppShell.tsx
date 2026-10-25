'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileBottomNav from './MobileBottomNav';
import { CopilotV2Provider } from '@/components/copilot/v2/CopilotV2Provider';
import CopilotRecentsDrawer from '@/components/copilot/CopilotRecentsDrawer';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  NavigationSection,
  NAVIGATION_SECTIONS,
  getNavigationSectionLabel,
  getVisibleNavigationSections,
  getSectionFromPathname,
} from '@/lib/navigation/types';

interface NavigationContextType {
  activeSection: NavigationSection | null;
  setActiveSection: (section: NavigationSection) => void;
  visibleSections: NavigationSection[];
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  role?: string | null;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}

export function getActiveSectionForPathname(pathname: string): NavigationSection | null {
  const section = getSectionFromPathname(pathname);
  if (section) return section;

  const roleBasedFallbacks: Array<[string, NavigationSection]> = [
    ['/tenant', 'administration'],
    ['/owner', 'administration'],
    ['/sbu', 'work'],
    ['/hq', 'work'],
    ['/portal/customer', 'customers'],
    ['/portal/partner', 'customers'],
    ['/driver', 'work'],
    ['/ground', 'work'],
  ];

  for (const [prefix, section] of roleBasedFallbacks) {
    if (pathname.startsWith(prefix)) return section;
  }

  return 'command-center';
}

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { profile } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const role = profile?.role;
  const [activeSection, setActiveSectionState] = useState<NavigationSection | null>(null);

  const visibleSections = getVisibleNavigationSections(role);

  useEffect(() => {
    const initialSection = getActiveSectionForPathname(pathname);
    if (initialSection && visibleSections.includes(initialSection)) {
      setActiveSectionState(initialSection);
    } else if (initialSection) {
      setActiveSectionState(initialSection);
    }
  }, [pathname, visibleSections]);

  useEffect(() => {
    // Initial responsive setup + desktop preference
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        setSidebarOpen(false);
      } else {
        const saved = localStorage.getItem('sentralogis-sidebar-open');
        if (saved !== null) {
          setSidebarOpen(saved === 'true');
        } else {
          setSidebarOpen(true);
        }
      }
    }
  }, []);

  // Auto-close drawer on mobile when navigating
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  const handleSetSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpen(open);
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      localStorage.setItem('sentralogis-sidebar-open', String(open));
    }
  }, []);

  const setActiveSection = useCallback((section: NavigationSection) => {
    setActiveSectionState(section);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        activeSection,
        setActiveSection,
        visibleSections,
        isSidebarOpen,
        setSidebarOpen: handleSetSidebarOpen,
        role,
      }}
    >
      <CopilotV2Provider>
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
          <Sidebar isOpen={isSidebarOpen} onClose={() => handleSetSidebarOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar onMenuClick={() => handleSetSidebarOpen(!isSidebarOpen)} />
            <main className="flex-1 p-4 md:p-6 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-6 overflow-y-auto">{children}</main>
          </div>
          <MobileBottomNav />
          <CopilotRecentsDrawer />
        </div>
      </CopilotV2Provider>
    </NavigationContext.Provider>
  );
}

export { NAVIGATION_SECTIONS, getNavigationSectionLabel };
