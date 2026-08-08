import { createContext, useContext } from 'react';
import { SentraBotRuntime } from './runtime/SentraBotRuntime';

export const SentraBotContext = createContext<SentraBotRuntime | undefined>(undefined);

export function useSentraBot() {
  const context = useContext(SentraBotContext);
  if (!context) {
    throw new Error('useSentraBot must be used within a SentraBotProvider');
  }
  return context;
}
