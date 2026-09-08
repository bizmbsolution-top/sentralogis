'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CustomsControlHeader } from '@/components/workspaces/customs/CustomsControlHeader';
import { CustomsKpiGrid, CustomsKpiMetrics } from '@/components/workspaces/customs/CustomsKpiGrid';
import { CustomsAttentionPanel, AttentionItem } from '@/components/workspaces/customs/CustomsAttentionPanel';
import { DeclarationDirectoryTable, DeclarationDirectoryItem } from '@/components/workspaces/customs/DeclarationDirectoryTable';
import { DeclarationCard } from '@/components/workspaces/customs/DeclarationCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Plus
} from 'lucide-react';

export default function CustomsControlCenterPage() {
  const router = useRouter();
  const [declarations, setDeclarations] = useState<DeclarationDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Declarations from REST Gateway
  const fetchDeclarations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/customs/declarations?limit=100');
      if (!res.ok) {
        throw new Error(`Failed to load declarations (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Map backend entities to Directory Item with mock/derived attention metadata if not present
        const mapped: DeclarationDirectoryItem[] = json.data.map((d: any) => {
          let primary_issue: DeclarationDirectoryItem['primary_issue'] = 'READY';
          let readiness_percentage = 100;

          if (d.status === 'DRAFT' || d.status === 'READY_FOR_CLASSIFICATION') {
            primary_issue = 'MISSING_HS';
            readiness_percentage = 60;
          } else if (d.status === 'DOCUMENTS_PENDING') {
            primary_issue = 'MISSING_DOC';
            readiness_percentage = 70;
          } else if (d.status === 'RELEASED' || d.status === 'COMPLETED') {
            primary_issue = 'RELEASED';
            readiness_percentage = 100;
          }

          return {
            ...d,
            importer_name: d.importer_name || `PT Importir ${d.importer_id ? d.importer_id.slice(0, 8) : 'Mandiri'}`,
            total_items_count: d.total_items_count || 1,
            total_cif_usd: d.total_cif_usd || 15000,
            total_tax_idr: d.total_duty_and_tax || 24000000,
            readiness_percentage,
            primary_issue
          };
        });
        setDeclarations(mapped);
      } else {
        setDeclarations([]);
      }
    } catch (err: any) {
      console.error('[Customs Control Center Fetch Error]:', err);
      setError(err.message || 'Unable to connect to Customs REST API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  // 2. Compute Operational KPI Metrics
  const metrics: CustomsKpiMetrics = useMemo(() => {
    const totalActive = declarations.filter(d => d.status !== 'CANCELLED' && d.status !== 'REJECTED').length;
    const draftCount = declarations.filter(d => d.status === 'DRAFT').length;
    const classificationErrors = declarations.filter(d => d.primary_issue === 'VALIDATION_ERROR' || d.status === 'READY_FOR_CLASSIFICATION').length;
    const validationWarnings = declarations.filter(d => d.primary_issue === 'PRICE_ANOMALY' || d.primary_issue === 'LARTAS').length;
    const missingDocumentsCount = declarations.filter(d => d.status === 'DOCUMENTS_PENDING' || d.primary_issue === 'MISSING_DOC').length;
    const waitingClassificationCount = declarations.filter(d => d.primary_issue === 'MISSING_HS' || d.status === 'DRAFT').length;
    const readyForCeisaCount = declarations.filter(d => d.status === 'READY_FOR_SUBMISSION' || d.primary_issue === 'READY').length;
    const releasedCount = declarations.filter(d => d.status === 'RELEASED' || d.status === 'COMPLETED' || d.sppb_number).length;

    return {
      totalActive,
      draftCount,
      classificationErrors,
      validationWarnings,
      missingDocumentsCount,
      waitingClassificationCount,
      readyForCeisaCount,
      releasedCount
    };
  }, [declarations]);

  // 3. Compute Attention Queue Items
  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = [];

    if (metrics.waitingClassificationCount > 0) {
      items.push({
        id: 'att-missing-hs',
        severity: 'CRITICAL',
        title: 'Items Missing HS Code Classification',
        count: metrics.waitingClassificationCount,
        description: 'Declarations contain unclassified items that require 8-digit BTKI tariff assignment.',
        category: 'MISSING_HS',
        filterKey: 'issue',
        filterValue: 'MISSING_HS'
      });
    }

    if (metrics.missingDocumentsCount > 0) {
      items.push({
        id: 'att-missing-doc',
        severity: 'CRITICAL',
        title: 'Mandatory Commercial Documents Pending',
        count: metrics.missingDocumentsCount,
        description: 'Invoice or Bill of Lading references are missing or require specialist verification.',
        category: 'MISSING_DOC',
        filterKey: 'issue',
        filterValue: 'MISSING_DOCUMENT'
      });
    }

    if (metrics.validationWarnings > 0) {
      items.push({
        id: 'att-warnings',
        severity: 'WARNING',
        title: 'Price Anomalies & Lartas Restrictions',
        count: metrics.validationWarnings,
        description: 'Declared item unit prices diverge significantly from historical averages or require trade permits.',
        category: 'PRICE_ANOMALY',
        filterKey: 'issue',
        filterValue: 'PRICE_ANOMALY'
      });
    }

    if (metrics.readyForCeisaCount > 0) {
      items.push({
        id: 'att-ready',
        severity: 'INFO',
        title: 'Declarations Ready for CEISA 4.0 Preparation',
        count: metrics.readyForCeisaCount,
        description: 'Fully validated declarations ready for licensed specialist review and XML export.',
        category: 'READY_CEISA',
        filterKey: 'readiness',
        filterValue: 'READY'
      });
    }

    return items;
  }, [metrics]);

  // Handlers
  const handleKpiClick = (filterType: string, filterValue: string) => {
    if (filterValue === 'ALL') {
      router.push('/sbu/clearance/declarations');
    } else {
      router.push(`/sbu/clearance/declarations?${filterType}=${encodeURIComponent(filterValue)}`);
    }
  };

  const handleOpenWorkbench = (declarationId: string) => {
    router.push(`/sbu/clearance/declarations/${declarationId}`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Cockpit Header */}
      <CustomsControlHeader
        totalDeclarations={metrics.totalActive}
        loading={loading}
        onRefresh={fetchDeclarations}
        onNewDeclaration={() => router.push('/sbu/clearance/declarations')}
        onImportBatch={() => router.push('/sbu/clearance/declarations')}
      />

      {/* 2. Error Banner */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchDeclarations} className="text-xs font-bold border-red-300">
            <RefreshCw size={12} className="mr-1" /> Retry
          </Button>
        </Card>
      )}

      {/* 3. Operational KPI Grid */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Operational KPIs</h2>
          <span className="text-[11px] text-slate-400">Click card to view filtered queue</span>
        </div>
        <CustomsKpiGrid metrics={metrics} onKpiClick={handleKpiClick} loading={loading} />
      </section>

      {/* 4. Attention Queue */}
      <section className="space-y-2">
        <CustomsAttentionPanel items={attentionItems} onActionClick={handleKpiClick} loading={loading} />
      </section>

      {/* 5. Live Operational Queue Preview */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Active Declarations Overview</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {declarations.length}
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/sbu/clearance/declarations')}
            className="text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          >
            Open Full Directory <ArrowRight size={13} className="ml-1" />
          </Button>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          <DeclarationDirectoryTable
            declarations={declarations.slice(0, 5)}
            loading={loading}
            onOpenWorkbench={handleOpenWorkbench}
          />
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {declarations.slice(0, 4).map(dec => (
            <DeclarationCard
              key={dec.id}
              declaration={dec}
              onOpenWorkbench={handleOpenWorkbench}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
