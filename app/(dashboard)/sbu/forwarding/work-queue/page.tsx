'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  Ship,
  FileText,
  Truck,
  Building2,
  Calendar,
  MapPin,
  Package,
  ChevronRight,
  Filter,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

interface ForwardingWorkItem {
  id: string;
  type: 'SHIPMENT' | 'HANDOFF' | 'CONSOLIDATION';
  referenceNumber: string;
  customerName: string;
  capabilityType: string;
  status: string;
  origin: string;
  destination: string;
  containerType: string;
  containerCount: number;
  orderDate: string;
  targetDate: string;
  assignedTo?: string;
  fclLclType?: 'FCL' | 'LCL' | 'UNKNOWN';
  cargoOwnerCount?: number;
}

const FCL_LCL_COLORS: Record<string, string> = {
  FCL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  LCL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  UNKNOWN: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PLANNED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  BOOKED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  IN_TRANSIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  ISSUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ACKNOWLEDGED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  ACCEPTED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  EXECUTING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PENDING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  AWAITING_ASSIGNMENT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  PARTIALLY_FULFILLED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  FULFILLED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PLANNED: 'Planned',
  BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit',
  ISSUED: 'Issued',
  ACKNOWLEDGED: 'Acknowledged',
  ACCEPTED: 'Accepted',
  EXECUTING: 'Executing',
  PENDING: 'Pending',
  AWAITING_ASSIGNMENT: 'Awaiting Assignment',
  ACTIVE: 'Active',
  PARTIALLY_FULFILLED: 'Partially Fulfilled',
  FULFILLED: 'Fulfilled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  FORWARDING: <Ship className="w-4 h-4" />,
  CUSTOMS: <FileText className="w-4 h-4" />,
  TRUCKING: <Truck className="w-4 h-4" />,
  WAREHOUSE: <Building2 className="w-4 h-4" />,
};

export default function ForwardingWorkQueuePage() {
  const [workItems, setWorkItems] = useState<ForwardingWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [fclLclFilter, setFclLclFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkItems() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/forwarding/shipments?limit=100');
        if (!res.ok) {
          throw new Error('Failed to fetch forwarding work items');
        }
        const json = await res.json();
        const items: ForwardingWorkItem[] = (json.data || []).map((item: any) => {
          const units = item.units || [];
          const containerUnits = units.filter((u: any) => u.unit_type === 'CONTAINER');
          const packageUnits = units.filter((u: any) => ['PALLET', 'BOX', 'BREAKBULK'].includes(u.unit_type));
          let fclLclType: 'FCL' | 'LCL' | 'UNKNOWN' = 'UNKNOWN';
          if (containerUnits.length > 0 && packageUnits.length === 0) {
            fclLclType = 'FCL';
          } else if (packageUnits.length > 0 || containerUnits.length > 1) {
            fclLclType = 'LCL';
          }
          return {
            ...item,
            fclLclType,
            cargoOwnerCount: item.cargoOwnerCount || undefined,
          };
        });
        setWorkItems(items);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchWorkItems();
  }, []);

  const filteredItems = workItems.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.referenceNumber || '').toLowerCase().includes(q) ||
      (item.customerName || '').toLowerCase().includes(q) ||
      (item.origin || '').toLowerCase().includes(q) ||
      (item.destination || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchesFclLcl = fclLclFilter === 'ALL' || item.fclLclType === fclLclFilter;
    return matchesSearch && matchesStatus && matchesType && matchesFclLcl;
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Forwarding Work Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage and assign forwarding operational work
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reference, customer, or route..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="AWAITING_ASSIGNMENT">Awaiting Assignment</option>
            <option value="ISSUED">Issued</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="EXECUTING">Executing</option>
            <option value="FULFILLED">Fulfilled</option>
          </select>
          <select
            value={fclLclFilter}
            onChange={(e) => setFclLclFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="FCL">FCL</option>
            <option value="LCL">LCL</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-500">Loading work queue...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Ship className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
            No forwarding work items
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' || fclLclFilter !== 'ALL'
              ? 'Try adjusting your search or filter criteria.'
              : 'Forwarding work will appear here when fulfillments are created.'}
          </p>
        </div>
      )}

      {/* Work Items List */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">Reference</div>
            <div className="col-span-2">Route</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-2">Target Date</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Assigned</div>
            <div className="col-span-1"></div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/sbu/forwarding/shipments/${item.id}`}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div className="md:col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    {CAPABILITY_ICONS[item.capabilityType] || <Ship className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                      {item.referenceNumber}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.customerName || 'Unknown customer'}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 flex items-center text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="w-3 h-3 mr-1 text-slate-400 hidden md:block" />
                  <span className="truncate">{item.origin} → {item.destination}</span>
                </div>
                <div className="md:col-span-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${FCL_LCL_COLORS[item.fclLclType || 'UNKNOWN']}`}>
                    {item.fclLclType || 'UNKNOWN'}
                  </span>
                  {item.containerType && (
                    <span className="text-xs text-slate-400">{item.containerType}</span>
                  )}
                </div>
                <div className="md:col-span-2 flex items-center text-sm text-slate-600 dark:text-slate-300">
                  <Calendar className="w-3 h-3 mr-1 text-slate-400 hidden md:block" />
                  {formatDate(item.targetDate)}
                </div>
                <div className="md:col-span-2 flex items-center">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || STATUS_COLORS.PENDING}`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <div className="md:col-span-2 flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {item.assignedTo || (
                      <span className="text-orange-500 dark:text-orange-400 flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        Unassigned
                      </span>
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="md:col-span-1 hidden" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Showing {filteredItems.length} of {workItems.length} work items
        </div>
      )}
    </div>
  );
}
