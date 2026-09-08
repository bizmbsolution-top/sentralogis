'use client';

import React from 'react';
import {
  Package,
  Truck,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Upload
} from 'lucide-react';
import Link from 'next/link';

interface Assignment {
  id: string;
  label: string;
  status: string;
  shipmentRef: string;
  origin: string;
  destination: string;
}

interface Job {
  id: string;
  joNumber: string;
  status: string;
  pickup: string;
  delivery: string;
}

const ASSIGNMENTS: Assignment[] = [
  { id: '1', label: 'Ocean Freight', status: 'IN_TRANSIT', shipmentRef: 'SHP-2026-00125', origin: 'Shanghai', destination: 'Subang' },
  { id: '2', label: 'Port Handling', status: 'PENDING', shipmentRef: 'SHP-2026-00126', origin: 'Shanghai', destination: 'Subang' },
];

const JOBS: Job[] = [
  { id: '1', joNumber: 'JO-CC-RAS-0826-001-01', status: 'ASSIGNED', pickup: 'Port of Tanjung Priok', delivery: 'BYD Subang' },
  { id: '2', joNumber: 'JO-CC-RAS-0826-001-02', status: 'IN_PROGRESS', pickup: 'Warehouse Jakarta', delivery: 'Customer Site' },
];

export default function VendorPortal() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Partner Workspace
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          View assignments, jobs, and submit documents
        </p>
      </div>

      {/* Assignments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-500" />
          Assignments
        </h2>
        <div className="space-y-2">
          {ASSIGNMENTS.map((assignment) => (
            <Link
              key={assignment.id}
              href={`/portal/assignments/${assignment.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{assignment.label}</div>
                <div className="text-xs text-slate-500">{assignment.shipmentRef} — {assignment.origin} → {assignment.destination}</div>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full ${assignment.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                {assignment.status}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Jobs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-500" />
          Jobs
        </h2>
        <div className="space-y-2">
          {JOBS.map((job) => (
            <Link
              key={job.id}
              href={`/portal/jobs/${job.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{job.joNumber}</div>
                <div className="text-xs text-slate-500">{job.pickup} → {job.delivery}</div>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full ${job.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                {job.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
