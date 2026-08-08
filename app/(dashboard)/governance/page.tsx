'use client';

import React from 'react';
import { useGovernanceData } from '@/src/features/governance/hooks/useGovernanceData';
import SituationCard, { SituationData } from '@/components/copilot/workspace/SituationCard';
import OperationalInsightCard, { InsightData } from '@/components/copilot/workspace/OperationalInsightCard';
import TimelinePanel, { TimelineMilestone } from '@/components/copilot/workspace/TimelinePanel';
import WhyNotCard, { AlternativeAction } from '@/components/copilot/workspace/WhyNotCard';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { RepositoryHealthProvider } from '@/src/features/governance/context/RepositoryHealthProvider';

function GovernanceDashboardContent() {
  const { metrics, history, isLoading, error, refresh, lastUpdated } = useGovernanceData();

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] items-center justify-center text-slate-400">
        <AlertCircle className="h-12 w-12 mb-4 text-slate-500" />
        <h2 className="text-xl font-semibold mb-2">No Governance Reports Found</h2>
        <p className="mb-4">Generate reports using the Engineering Governance CLI.</p>
        <button 
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
        >
          <RefreshCw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  // Map Governance Data to SituationCard format
  const situationData: SituationData = {
    situation: `Production Readiness: ${metrics.productionReadiness.isReady ? 'PASS' : 'FAIL'}`,
    phase: 'Architecture Governance',
    delayDuration: metrics.typescript.diagnostics.length > 0 ? `${metrics.typescript.diagnostics.length} TS Errors` : undefined,
    eta: `Debt Score: ${metrics.technicalDebt.score}`,
    gpsStatus: 'Live',
    gpsTime: 'Real-time',
    aiConfidence: metrics.productionReadiness.overallScore,
    operationalRisk: metrics.productionReadiness.isReady ? 'Low' : 'Critical'
  };

  // Map Governance Data to InsightCard format
  const insightData: InsightData = {
    title: 'Codebase Scan Results',
    description: `Found ${metrics.technicalDebt.deepNestingCount} deeply nested lines, ${metrics.technicalDebt.duplicatedCodeCount} duplications, and ${metrics.technicalDebt.todoCount} TODOs.`,
    metricLabel: 'Overall Health',
    metricValue: `${metrics.productionReadiness.overallScore}/100`,
    metricTrend: 'up',
    trendValue: 'Latest Run',
    priority: metrics.productionReadiness.overallScore < 80 ? 'High' : 'Normal',
    actionLabel: 'View Detailed Reports',
    actionHref: '#'
  };

  // Map History to TimelinePanel format
  const milestones: TimelineMilestone[] = history.slice(-5).map((entry, index) => ({
    key: entry.timestamp,
    label: `Run Score: ${entry.overallScore}`,
    status: 'DONE',
    timestamp: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    actor: 'CI/CD Pipeline',
    source: 'System'
  })).reverse();

  if (milestones.length > 0) {
    milestones[0].status = 'ACTIVE'; // Highlight latest
  }

  // Map Security/Deps to WhyNotCard format
  const alternatives: AlternativeAction[] = [
    { action: 'Security Vulnerabilities', reason: `Score: ${metrics.security.auditStatus}` },
    { action: 'Dependency Health', reason: `Score: ${metrics.dependencies.score}/100` },
    { action: 'Test Coverage', reason: `Coverage: ${metrics.tests.coveragePercent}%` },
    { action: 'Architecture Layers', reason: `Score: ${metrics.architecture.layerSeparation.score}/100` },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Engineering Governance Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Live repository metrics from the CLI generator (v{metrics.metadata.generatorVersion})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Updated {lastUpdated?.toLocaleTimeString()}
          </span>
          <button 
            onClick={refresh}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 text-slate-300"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <SituationCard data={situationData} />
          <OperationalInsightCard data={insightData} />
          <WhyNotCard alternatives={alternatives} />
        </div>
        
        <div>
          <TimelinePanel 
            milestones={milestones}
            activeJobId="Governance Timeline"
          />
        </div>
      </div>
    </div>
  );
}

export default function GovernanceDashboard() {
  return (
    <RepositoryHealthProvider>
      <GovernanceDashboardContent />
    </RepositoryHealthProvider>
  );
}
