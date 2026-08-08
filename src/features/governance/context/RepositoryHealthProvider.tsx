'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useGovernanceData } from '../hooks/useGovernanceData';
import { GovernanceSnapshot, GovernanceTrendSnapshot } from '../types';

interface RepositoryHealthContextType {
  metrics: GovernanceSnapshot | null;
  history: GovernanceTrendSnapshot[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

const RepositoryHealthContext = createContext<RepositoryHealthContextType | undefined>(undefined);

export function RepositoryHealthProvider({ children }: { children: ReactNode }) {
  const data = useGovernanceData();

  return (
    <RepositoryHealthContext.Provider value={data}>
      {children}
    </RepositoryHealthContext.Provider>
  );
}

export function useRepositoryHealth() {
  const context = useContext(RepositoryHealthContext);
  if (context === undefined) {
    throw new Error('useRepositoryHealth must be used within a RepositoryHealthProvider');
  }
  return context;
}
