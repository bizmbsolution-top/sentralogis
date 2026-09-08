'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CustomsAggregate, CustomsDeclarationDocument } from '@/lib/domain/customs/types';
import { WorkbenchHeader } from '@/components/workspaces/customs/WorkbenchHeader';
import { DeclarationSummaryCard } from '@/components/workspaces/customs/DeclarationSummaryCard';
import { ReadinessCommandBar, ReadinessCategoryStatus } from '@/components/workspaces/customs/ReadinessCommandBar';
import { WorkbenchAttentionStrip, WorkbenchIssueItem } from '@/components/workspaces/customs/WorkbenchAttentionStrip';
import { WorkbenchTabNav } from '@/components/workspaces/customs/WorkbenchTabNav';
import { OverviewTabWorkspace } from '@/components/workspaces/customs/OverviewTabWorkspace';
import { PpjkItemGrid } from '@/components/workspaces/customs/PpjkItemGrid';
import { ClassificationWorkspace } from '@/components/workspaces/customs/ClassificationWorkspace';
import { ValidationWorkspace } from '@/components/workspaces/customs/ValidationWorkspace';
import { DocumentsWorkspace } from '@/components/workspaces/customs/DocumentsWorkspace';
import { ValuationWorkspace } from '@/components/workspaces/customs/ValuationWorkspace';
import { LartasWorkspace } from '@/components/workspaces/customs/LartasWorkspace';
import { CeisaWorkspace } from '@/components/workspaces/customs/CeisaWorkspace';
import { AuditWorkspace } from '@/components/workspaces/customs/AuditWorkspace';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  AlertCircle,
  RefreshCw,
  Boxes,
  HelpCircle,
  FileText,
  DollarSign,
  ShieldAlert,
  Send,
  History,
  Layers,
  Scale,
  Globe2,
  Receipt,
  Truck,
  Building2,
  Construction
} from 'lucide-react';

function WorkbenchContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = (params?.id as string) || '';
  const currentTab = searchParams.get('tab') || 'overview';

  const [aggregate, setAggregate] = useState<CustomsAggregate | null>(null);
  const [documents, setDocuments] = useState<CustomsDeclarationDocument[]>([]);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Declaration Aggregate & Validation
  const fetchDeclarationData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch aggregate
      const res = await fetch(`/api/v1/customs/declarations/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Declaration not found or unauthorized');
        throw new Error(`Failed to load declaration (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (!json.success || !json.data) throw new Error('Invalid declaration payload');
      setAggregate(json.data);

      // 2. Fetch documents
      try {
        const docRes = await fetch(`/api/v1/customs/declarations/${id}/documents`);
        if (docRes.ok) {
          const docJson = await docRes.json();
          if (docJson.success && Array.isArray(docJson.data)) {
            setDocuments(docJson.data);
          }
        }
      } catch (e) {
        console.warn('Documents fetch skipped/failed:', e);
      }

      // 3. Trigger validation check
      try {
        const valRes = await fetch(`/api/v1/customs/declarations/${id}/validate`, { method: 'POST' });
        if (valRes.ok) {
          const valJson = await valRes.json();
          if (valJson.success && valJson.data) {
            setValidationReport(valJson.data);
          }
        }
      } catch (e) {
        console.warn('Validation check skipped/failed:', e);
      }
    } catch (err: any) {
      console.error('[PPJK Workbench Fetch Error]:', err);
      setError(err.message || 'Unable to connect to declaration API');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDeclarationData();
  }, [fetchDeclarationData]);

  // Run Manual Validation Trigger
  const handleValidate = async () => {
    if (!id) return;
    setValidating(true);
    try {
      const valRes = await fetch(`/api/v1/customs/declarations/${id}/validate`, { method: 'POST' });
      if (valRes.ok) {
        const valJson = await valRes.json();
        if (valJson.success && valJson.data) {
          setValidationReport(valJson.data);
        }
      }
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setValidating(false);
    }
  };

  const handleSelectTab = (tabId: string, filter?: string) => {
    let url = `/sbu/clearance/declarations/${id}?tab=${tabId}`;
    if (filter) {
      url += `&issue=${encodeURIComponent(filter)}`;
    }
    router.push(url);
  };

  // 2. Compute Readiness Categories
  const readinessCategories: ReadinessCategoryStatus[] = useMemo(() => {
    const rbc = validationReport?.readinessByCategory || {};
    const lines = aggregate?.classification_lines || [];
    const missingHsCount = lines.filter(l => !l.hs_code).length;
    const priceAnomalies = lines.filter(l => l.price_anomaly_flag).length;
    const lartasCount = lines.filter(l => l.lartas_flag).length;

    return [
      {
        key: 'classification',
        label: 'Classification',
        status: missingHsCount > 0 ? 'BLOCKED' : (rbc.classification || 'READY'),
        issueCount: missingHsCount,
        tabTarget: 'items',
        icon: HelpCircle
      },
      {
        key: 'valuation',
        label: 'Valuation',
        status: priceAnomalies > 0 ? 'WARNING' : (rbc.valuation || 'READY'),
        issueCount: priceAnomalies,
        tabTarget: 'valuation',
        icon: DollarSign
      },
      {
        key: 'documents',
        label: 'Documents',
        status: rbc.documents || (documents.length === 0 ? 'WARNING' : 'READY'),
        tabTarget: 'documents',
        icon: FileText
      },
      {
        key: 'origin',
        label: 'Origin',
        status: rbc.origin || 'READY',
        tabTarget: 'items',
        icon: Globe2
      },
      {
        key: 'tax',
        label: 'Tax & KMK',
        status: rbc.tax || 'READY',
        tabTarget: 'valuation',
        icon: Receipt
      },
      {
        key: 'lartas',
        label: 'Lartas',
        status: lartasCount > 0 ? 'WARNING' : (rbc.lartas || 'READY'),
        issueCount: lartasCount,
        tabTarget: 'lartas',
        icon: ShieldAlert
      },
      {
        key: 'transport',
        label: 'Transport',
        status: rbc.transport || 'READY',
        tabTarget: 'overview',
        icon: Truck
      },
      {
        key: 'parties',
        label: 'Parties',
        status: rbc.parties || 'READY',
        tabTarget: 'overview',
        icon: Building2
      }
    ];
  }, [validationReport, aggregate, documents]);

  // 3. Compute Actionable Attention Issues
  const attentionIssues: WorkbenchIssueItem[] = useMemo(() => {
    const issues: WorkbenchIssueItem[] = [];
    const lines = aggregate?.classification_lines || [];

    const missingHs = lines.filter(l => !l.hs_code);
    if (missingHs.length > 0) {
      issues.push({
        id: 'issue-missing-hs',
        severity: 'CRITICAL',
        title: 'Items Missing HS Code',
        count: missingHs.length,
        message: `${missingHs.length} item lines require BTKI 8-digit tariff code classification before submission.`,
        targetTab: 'items',
        targetFilter: 'missing_hs'
      });
    }

    const unverifiedDocs = documents.filter(d => d.verification_status !== 'VERIFIED');
    if (unverifiedDocs.length > 0) {
      issues.push({
        id: 'issue-docs',
        severity: 'WARNING',
        title: 'Documents Pending Verification',
        count: unverifiedDocs.length,
        message: `${unverifiedDocs.length} commercial attachment documents require licensed specialist verification.`,
        targetTab: 'documents'
      });
    }

    const priceAnomalies = lines.filter(l => l.price_anomaly_flag);
    if (priceAnomalies.length > 0) {
      issues.push({
        id: 'issue-price',
        severity: 'WARNING',
        title: 'Price Anomalies Detected',
        count: priceAnomalies.length,
        message: `${priceAnomalies.length} items show unit price variance > 50% from historical customs average.`,
        targetTab: 'valuation'
      });
    }

    const lartas = lines.filter(l => l.lartas_flag);
    if (lartas.length > 0) {
      issues.push({
        id: 'issue-lartas',
        severity: 'WARNING',
        title: 'Lartas Restriction Indicated',
        count: lartas.length,
        message: `${lartas.length} items are flagged under BTKI restriction rules requiring import permits.`,
        targetTab: 'lartas'
      });
    }

    return issues;
  }, [aggregate, documents]);

  // Tab Badge Counts
  const tabBadgeCounts = useMemo(() => {
    const lines = aggregate?.classification_lines || [];
    const missingHsCount = lines.filter(l => !l.hs_code).length;
    const priceAnomalies = lines.filter(l => l.price_anomaly_flag).length;
    const lartasCount = lines.filter(l => l.lartas_flag).length;
    const unverifiedDocs = documents.filter(d => d.verification_status !== 'VERIFIED').length;

    return {
      validation: {
        count: (validationReport?.errorCount || 0) + (validationReport?.warningCount || 0),
        type: (validationReport?.errorCount || 0) > 0 ? ('error' as const) : ('warning' as const)
      },
      items: { count: missingHsCount, type: 'error' as const },
      classification: { count: missingHsCount, type: 'error' as const },
      documents: { count: unverifiedDocs, type: 'warning' as const },
      valuation: { count: priceAnomalies, type: 'warning' as const },
      lartas: { count: lartasCount, type: 'warning' as const }
    };
  }, [aggregate, documents, validationReport]);

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-in fade-in duration-300">
        <div className="h-32 bg-slate-200/70 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !aggregate) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-base font-bold text-slate-900">Customs Declaration Unavailable</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{error || 'Declaration data could not be found'}</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" onClick={() => router.push('/sbu/clearance/declarations')} className="text-xs font-semibold">
            Back to Directory
          </Button>
          <Button onClick={fetchDeclarationData} className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
            <RefreshCw size={13} className="mr-1.5" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const readinessScore = validationReport?.errorCount === 0 ? (validationReport?.warningCount === 0 ? 100 : 85) : 60;
  const overallReadinessStatus = validationReport?.overallStatus || (readinessScore === 100 ? 'READY' : readinessScore >= 75 ? 'READY_WITH_WARNINGS' : 'BLOCKED');

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* 1. WORKBENCH HEADER */}
      <WorkbenchHeader
        declaration={aggregate.declaration}
        importerName={`PT Importir ${aggregate.declaration.importer_id.slice(0, 8)}`}
        loading={loading}
        validating={validating}
        onRefresh={fetchDeclarationData}
        onValidate={handleValidate}
        onNavigateTab={handleSelectTab}
      />

      {/* 2. DECLARATION SUMMARY CARDS */}
      <DeclarationSummaryCard
        aggregate={aggregate}
        importerName={`PT Importir ${aggregate.declaration.importer_id.slice(0, 8)}`}
        readinessPercentage={readinessScore}
      />

      {/* 3. READINESS COMMAND BAR */}
      <ReadinessCommandBar
        overallStatus={overallReadinessStatus}
        readinessPercentage={readinessScore}
        categories={readinessCategories}
        onCategoryClick={handleSelectTab}
      />

      {/* 4. BLOCKING / ATTENTION STRIP */}
      <WorkbenchAttentionStrip
        issues={attentionIssues}
        onNavigateTab={handleSelectTab}
      />

      {/* 5. WORKBENCH TABS & CONTENT */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <WorkbenchTabNav
          activeTab={currentTab}
          onSelectTab={handleSelectTab}
          badgeCounts={tabBadgeCounts}
        />

        <div className="p-6">
          {currentTab === 'overview' && (
            <OverviewTabWorkspace
              aggregate={aggregate}
              importerName={`PT Importir ${aggregate.declaration.importer_id.slice(0, 8)}`}
              readinessPercentage={readinessScore}
              documents={documents}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'validation' && (
            <ValidationWorkspace
              declaration={aggregate.declaration}
              lines={aggregate.classification_lines || []}
              documents={documents}
              onDeclarationUpdated={(updatedDec) => {
                setAggregate(prev => prev ? { ...prev, declaration: updatedDec } : null);
              }}
              onLinesUpdated={(updatedLines) => {
                setAggregate(prev => prev ? { ...prev, classification_lines: updatedLines } : null);
              }}
              onNavigateTab={handleSelectTab}
              initialFilter={searchParams.get('issue') || undefined}
            />
          )}

          {currentTab === 'items' && (
            <PpjkItemGrid
              declarationId={aggregate.declaration.id}
              importerId={aggregate.declaration.importer_id}
              initialLines={aggregate.classification_lines || []}
              onRefreshDeclaration={fetchDeclarationData}
              initialFilter={searchParams.get('issue') || undefined}
            />
          )}

          {currentTab === 'classification' && (
            <ClassificationWorkspace
              declaration={aggregate.declaration}
              lines={aggregate.classification_lines}
              onLinesUpdated={(updatedLines) => {
                setAggregate(prev => prev ? { ...prev, classification_lines: updatedLines } : null);
              }}
              onDeclarationUpdated={(updatedDec) => {
                setAggregate(prev => prev ? { ...prev, declaration: updatedDec } : null);
              }}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsWorkspace
              declaration={aggregate.declaration}
              lines={aggregate.classification_lines || []}
              onDocumentsUpdated={fetchDeclarationData}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'valuation' && (
            <ValuationWorkspace
              declaration={aggregate.declaration}
              lines={aggregate.classification_lines || []}
              onNavigateTab={handleSelectTab}
            />
          )}

          {currentTab === 'lartas' && (
            <LartasWorkspace
              declaration={aggregate.declaration}
              lines={aggregate.classification_lines || []}
              documents={documents}
              onNavigateTab={handleSelectTab}
              onRefreshDeclaration={fetchDeclarationData}
            />
          )}

          {currentTab === 'ceisa' && (
            <CeisaWorkspace
              declaration={aggregate.declaration}
              lines={aggregate.classification_lines || []}
              documents={documents}
              onNavigateTab={handleSelectTab}
              onRefreshDeclaration={fetchDeclarationData}
            />
          )}

          {currentTab === 'audit' && (
            <AuditWorkspace
              declaration={aggregate.declaration}
              lines={aggregate.classification_lines || []}
              documents={documents}
              onNavigateTab={handleSelectTab}
              onRefreshDeclaration={fetchDeclarationData}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function PpjkWorkbenchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Workbench...</div>}>
      <WorkbenchContent />
    </Suspense>
  );
}
