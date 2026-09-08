'use client';

import React, { useState, useEffect } from 'react';
import { CustomsDeclaration, CustomsClassificationLine } from '@/lib/domain/customs/types';
import { PrioritySkuQueue } from './PrioritySkuQueue';
import { ClassificationCockpit } from './ClassificationCockpit';
import { BtkiTreeExplorer } from './BtkiTreeExplorer';
import { Layers, Sparkles, BookOpen, AlertCircle } from 'lucide-react';

interface ClassificationWorkspaceProps {
  declaration: CustomsDeclaration;
  lines: CustomsClassificationLine[];
  onLinesUpdated: (updatedLines: CustomsClassificationLine[]) => void;
  onDeclarationUpdated?: (updatedDec: CustomsDeclaration) => void;
}

export function ClassificationWorkspace({
  declaration,
  lines,
  onLinesUpdated,
  onDeclarationUpdated
}: ClassificationWorkspaceProps) {
  // Active selected line state
  const [selectedLineId, setSelectedLineId] = useState<string | null>(() => {
    // Default to first unclassified line or first line
    const unclassified = lines.find(l => !l.hs_code || l.hs_code.trim() === '');
    return unclassified ? unclassified.id : lines.length > 0 ? lines[0].id : null;
  });

  // Mobile active pane state ('queue' | 'cockpit' | 'btki')
  const [mobilePane, setMobilePane] = useState<'queue' | 'cockpit' | 'btki'>('cockpit');

  const selectedLine = lines.find(l => l.id === selectedLineId) || null;

  // Handler when classification is approved
  const handleClassificationApproved = (
    updatedLine: CustomsClassificationLine,
    updatedDec: CustomsDeclaration
  ) => {
    // Update lines array in parent state
    const nextLines = lines.map(l => (l.id === updatedLine.id ? updatedLine : l));
    onLinesUpdated(nextLines);

    if (onDeclarationUpdated) {
      onDeclarationUpdated(updatedDec);
    }

    // Auto-advance to next unclassified item if available
    const nextUnclassified = nextLines.find(
      l => l.id !== updatedLine.id && (!l.hs_code || l.hs_code.trim() === '')
    );
    if (nextUnclassified) {
      setSelectedLineId(nextUnclassified.id);
    }
  };

  // Direct HS Code application from BTKI explorer
  const handleApplyFromBtki = (hsCode: string) => {
    if (!selectedLine) return;
    // Trigger approval with BTKI explorer justification
    const justification = `Selected from BTKI 2026.1 Tariff Explorer`;
    // We can call cockpit's action by passing this or using a trigger
    // Let's execute the approval API
    fetch(`/api/v1/customs/declarations/${declaration.id}/classify-line`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        line_id: selectedLine.id,
        hs_code: hsCode,
        justification,
        update_sku_memory: true
      })
    })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          handleClassificationApproved(json.data.line, json.data.declaration);
        } else {
          alert(json.error?.message || 'Failed to apply HS code');
        }
      })
      .catch(err => {
        console.error('Failed to apply HS code', err);
        alert('Network error while applying HS code');
      });
  };

  return (
    <div className="space-y-3">
      {/* Mobile/Tablet Sub-Pane Switcher Bar */}
      <div className="lg:hidden flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl shadow-xs">
        <button
          onClick={() => setMobilePane('queue')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mobilePane === 'queue'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={14} />
          SKU Queue ({lines.length})
        </button>
        <button
          onClick={() => setMobilePane('cockpit')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mobilePane === 'cockpit'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles size={14} />
          Cockpit
        </button>
        <button
          onClick={() => setMobilePane('btki')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mobilePane === 'btki'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen size={14} />
          BTKI Explorer
        </button>
      </div>

      {/* 3-Pane Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[640px] h-[calc(100vh-280px)]">
        {/* Pane 1: Priority SKU Queue (Col Span 3) */}
        <div
          className={`lg:col-span-3 h-full ${
            mobilePane === 'queue' ? 'block' : 'hidden lg:block'
          }`}
        >
          <PrioritySkuQueue
            lines={lines}
            selectedLineId={selectedLineId}
            onSelectLine={id => {
              setSelectedLineId(id);
              setMobilePane('cockpit');
            }}
          />
        </div>

        {/* Pane 2: Classification Cockpit (Col Span 5) */}
        <div
          className={`lg:col-span-5 h-full ${
            mobilePane === 'cockpit' ? 'block' : 'hidden lg:block'
          }`}
        >
          <ClassificationCockpit
            declaration={declaration}
            selectedLine={selectedLine}
            onClassificationApproved={handleClassificationApproved}
            onInspectInBtki={hs => {
              setMobilePane('btki');
            }}
          />
        </div>

        {/* Pane 3: BTKI Tariff Hierarchy Tree Explorer (Col Span 4) */}
        <div
          className={`lg:col-span-4 h-full ${
            mobilePane === 'btki' ? 'block' : 'hidden lg:block'
          }`}
        >
          <BtkiTreeExplorer
            onSelectHsCode={handleApplyFromBtki}
            activeHsCode={selectedLine?.hs_code}
          />
        </div>
      </div>
    </div>
  );
}
