'use client';

import React, { useState } from 'react';
import { 
  Play, 
  RefreshCw, 
  X, 
  Check, 
  AlertCircle, 
  Send, 
  Layers,
  Loader2
} from 'lucide-react';

interface CommandActionDrawerProps {
  salesOrderId: string;
  fulfillmentId?: string | null;
  availableCommands: string[];
  onCommandExecuted?: () => void;
  className?: string;
}

export function CommandActionDrawer({
  salesOrderId,
  fulfillmentId,
  availableCommands,
  onCommandExecuted,
  className = '',
}: CommandActionDrawerProps) {
  const [loadingCommand, setLoadingCommand] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    action: string;
    title: string;
    description: string;
    payload?: any;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (availableCommands.length === 0) {
    return null;
  }

  const executeAction = async (command: string, payload: any = {}) => {
    setLoadingCommand(command);
    setErrorMessage(null);

    try {
      let res;
      if (command === 'confirmSalesOrder') {
        res = await fetch(`/api/v1/commercial/sales-orders/${salesOrderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm' }),
        });
      } else if (command === 'cancelSalesOrder') {
        res = await fetch(`/api/v1/commercial/sales-orders/${salesOrderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', reason: payload.reason || 'User cancelled' }),
        });
      } else if (command === 'activateFulfillment' && fulfillmentId) {
        res = await fetch(`/api/v1/commercial/fulfillments/${fulfillmentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'activate' }),
        });
      } else if (command === 'cancelFulfillment' && fulfillmentId) {
        res = await fetch(`/api/v1/commercial/fulfillments/${fulfillmentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', reason: payload.reason || 'Replanning required' }),
        });
      } else if (command === 'createFulfillment') {
        res = await fetch(`/api/v1/commercial/fulfillments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ salesOrderId }),
        });
      }

      if (res && !res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to execute ${command}`);
      }

      setConfirmModal(null);
      if (onCommandExecuted) onCommandExecuted();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during command execution.');
    } finally {
      setLoadingCommand(null);
    }
  };

  const handleCommandClick = (cmd: string) => {
    if (cmd === 'cancelSalesOrder') {
      setConfirmModal({
        action: cmd,
        title: 'Cancel Sales Order',
        description: 'Are you sure you want to cancel this Sales Order? This action will void the commercial agreement.',
      });
    } else if (cmd === 'cancelFulfillment') {
      setConfirmModal({
        action: cmd,
        title: 'Cancel Current Fulfillment Plan',
        description: 'Cancelling this plan marks Revision as CANCELLED. Historical progress records will remain intact.',
      });
    } else if (cmd === 'replanFulfillment') {
      setConfirmModal({
        action: 'cancelFulfillment', // First cancels existing to allow creating new revision
        title: 'Initiate Fulfillment Replanning',
        description: 'This will close the current active fulfillment revision and allow you to draft a new fulfillment plan.',
      });
    } else {
      executeAction(cmd);
    }
  };

  const renderButton = (cmd: string) => {
    const isRunning = loadingCommand === cmd;

    switch (cmd) {
      case 'confirmSalesOrder':
        return (
          <button
            key={cmd}
            disabled={isRunning}
            onClick={() => handleCommandClick(cmd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Confirm Sales Order
          </button>
        );
      case 'createFulfillment':
        return (
          <button
            key={cmd}
            disabled={isRunning}
            onClick={() => handleCommandClick(cmd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
            Compose Fulfillment Plan
          </button>
        );
      case 'activateFulfillment':
        return (
          <button
            key={cmd}
            disabled={isRunning}
            onClick={() => handleCommandClick(cmd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Activate Fulfillment
          </button>
        );
      case 'replanFulfillment':
        return (
          <button
            key={cmd}
            disabled={isRunning}
            onClick={() => handleCommandClick(cmd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Replan Fulfillment
          </button>
        );
      case 'cancelFulfillment':
        return (
          <button
            key={cmd}
            disabled={isRunning}
            onClick={() => handleCommandClick(cmd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            Cancel Plan
          </button>
        );
      case 'cancelSalesOrder':
        return (
          <button
            key={cmd}
            disabled={isRunning}
            onClick={() => handleCommandClick(cmd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            Cancel Sales Order
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Available Operations
          </span>
          <p className="text-xs text-slate-400">
            Commands strictly authorized by current lifecycle state
          </p>
        </div>

        {/* Command Buttons Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {availableCommands.map((cmd) => renderButton(cmd))}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {confirmModal.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                disabled={Boolean(loadingCommand)}
                onClick={() => setConfirmModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Keep Current
              </button>
              <button
                disabled={Boolean(loadingCommand)}
                onClick={() => executeAction(confirmModal.action, confirmModal.payload)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5"
              >
                {loadingCommand ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
