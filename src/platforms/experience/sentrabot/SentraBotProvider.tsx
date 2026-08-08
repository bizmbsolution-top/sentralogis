'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { SentraBotContext } from './SentraBotContext';
import { SentraBotConfig } from './SentraBotState';
import { SentraBotRuntime } from './runtime/SentraBotRuntime';

interface SentraBotProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<SentraBotConfig>;
}

export function SentraBotProvider({ children, initialConfig }: SentraBotProviderProps) {
  // Initialize the runtime once
  const runtime = useMemo(() => new SentraBotRuntime(initialConfig), []);
  
  // Force a re-render when the runtime state changes
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = runtime.subscribe(() => {
      setTick(t => t + 1);
    });
    return () => unsubscribe();
  }, [runtime]);

  return (
    <SentraBotContext.Provider value={runtime}>
      {children}
    </SentraBotContext.Provider>
  );
}
