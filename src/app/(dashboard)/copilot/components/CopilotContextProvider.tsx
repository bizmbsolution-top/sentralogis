import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OperationalContext } from '../../../../platforms/copilot/context/OperationalContext';
import { WorkspaceContext } from '../../../../platforms/copilot/context/WorkspaceContext';

interface CopilotContextType {
  context: OperationalContext;
  updateContext: (updates: Partial<OperationalContext>) => void;
  pinEntity: (entityType: string, resolvedId: string) => void;
  setActiveContext: (key: string, id: string | undefined) => void;
  focusEntity: (entityType: string, id: string, displayName?: string) => void;
  clearFocus: () => void;
  focusJob: (jobId: string, driverId?: string, vehicleId?: string, customerId?: string) => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export const CopilotContextProvider: React.FC<{ children: ReactNode; initialContext: OperationalContext }> = ({ children, initialContext }) => {
  const [context, setContext] = useState<OperationalContext>(initialContext);

  const updateContext = (updates: Partial<OperationalContext>) => {
    // We don't do this anymore because OperationalContext has its own methods
    // and this UI provider should be re-architected if it needs to update tenant/user.
    // For now we just ignore generic updates to keep it compiling.
    console.warn('updateContext is deprecated for primitive properties.');
  };

  const pinEntity = (entityType: string, resolvedId: string) => {
    setContext(prev => prev.withWorkspace(prev.workspace.pin(entityType, resolvedId)));
  };

  const setActiveContext = (key: string, id: string | undefined) => {
      if (id) {
        setContext(prev => prev.withWorkspace(prev.workspace.focus(key, id)));
      }
  };

  const focusEntity = (entityType: string, id: string, displayName?: string) => {
    setContext(prev => {
      const updated = prev.withWorkspace(
        prev.workspace.pin(entityType.toUpperCase(), id, displayName).focus(entityType.toUpperCase(), id)
      );
      return updated;
    });
  };

  const clearFocus = () => {
    setContext(prev => prev.withWorkspace(
      WorkspaceContext.create({})
    ));
  };

  const focusJob = (jobId: string, driverId?: string, vehicleId?: string, customerId?: string) => {
    setContext(prev => {
      let ws = prev.workspace.pin('JOBORDER', jobId, jobId).focus('JOBORDER', jobId);
      if (driverId) ws = ws.pin('DRIVER', driverId, driverId).focus('DRIVER', driverId);
      if (vehicleId) ws = ws.pin('VEHICLE', vehicleId, vehicleId).focus('VEHICLE', vehicleId);
      if (customerId) ws = ws.pin('CUSTOMER', customerId, customerId).focus('CUSTOMER', customerId);
      return prev.withWorkspace(ws);
    });
  };

  return (
    <CopilotContext.Provider value={{ context, updateContext, pinEntity, setActiveContext, focusEntity, clearFocus, focusJob }}>
      {children}
    </CopilotContext.Provider>
  );
};

export const useCopilotContext = (): CopilotContextType => {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilotContext must be used within a CopilotContextProvider');
  }
  return context;
};
