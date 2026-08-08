import React from 'react';
import ActiveContextCard from './ActiveContextCard';
import PinnedJobsCard from './PinnedJobsCard';
import RecentExecutionCard from './RecentExecutionCard';
import AlertPanel from './AlertPanel';

export default function OperationalContextPanel() {
  return (
    <div className="w-80 lg:w-96 bg-slate-50 border-l border-slate-200 hidden md:flex flex-col overflow-y-auto shrink-0">
      <div className="p-4 space-y-2">
        <AlertPanel />
        <ActiveContextCard />
        <PinnedJobsCard />
        <RecentExecutionCard />
      </div>
    </div>
  );
}
