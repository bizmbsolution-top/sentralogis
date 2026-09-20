'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileBottomNav from './MobileBottomNav';
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
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
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
        setSidebarOpen,
      }}
    >
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
          <main className="flex-1 p-4 md:p-6 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-6 overflow-y-auto">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </NavigationContext.Provider>
  );
}

export { NAVIGATION_SECTIONS, getNavigationSectionLabel };
