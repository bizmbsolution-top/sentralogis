'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Ship,
  Calendar,
  MapPin,
  Package,
  Truck,
  FileText,
  UserPlus,
  CheckCircle2,
  Clock,
  XCircle,
  Container
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ShipmentDetail {
  id: string;
  shipmentNumber: string;
  trackingToken: string;
  globalStatus: string;
  customerId: string;
  customerName: string;
  workOrderId: string;
  serviceScopeId: string;
  originLocationId: string;
  originName: string;
  destinationLocationId: string;
  destinationName: string;
  masterBlNumber: string;
  houseBlNumber: string;
  bookingReference: string;
  etd: string;
  eta: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ShipmentUnit {
  id: string;
  unitType: string;
  containerNumber: string;
  isoType: string;
  sealNumber: string;
  tareWeightKg: number;
  maxPayloadKg: number;
}

interface ExecutionLeg {
  id: string;
  legType: string;
  startLocation: string;
  endLocation: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
}

interface ForwardingAssignment {
  id: string;
  jo_number: string;
  status: string;
  assignee_name: string | null;
  assignee_notes: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  PLANNED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  BOOKED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  IN_TRANSIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  AT_INTERMEDIATE_NODE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  CUSTOMS_HOLD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CUSTOMS_RELEASED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PLANNED: 'Planned',
  BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit',
  AT_INTERMEDIATE_NODE: 'At Intermediate Node',
  CUSTOMS_HOLD: 'Customs Hold',
  CUSTOMS_RELEASED: 'Customs Released',
  OUT_FOR_DELIVERY: 'Out For Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export default function ForwardingShipmentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [units, setUnits] = useState<ShipmentUnit[]>([]);
  const [legs, setLegs] = useState<ExecutionLeg[]>([]);
  const [assignment, setAssignment] = useState<ForwardingAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigneeName, setAssigneeName] = useState('');
  const [assigneeNotes, setAssigneeNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [res, assignRes] = await Promise.all([
          fetch(`/api/v1/forwarding/shipments/${id}`),
          fetch(`/api/forwarding/assign?shipmentId=${id}`),
        ]);

        if (!res.ok) throw new Error('Failed to fetch shipment');
        const json = await res.json();
        setShipment(json.data);
        setUnits(json.data?.units || []);
        setLegs(json.data?.executionLegs || []);

        if (assignRes.ok) {
          const assignJson = await assignRes.json();
          setAssignment(assignJson.data);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleAssign = async () => {
    if (!assigneeName.trim()) return;
    setAssigning(true);
    setError(null);
    try {
      const res = await fetch('/api/forwarding/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId: id,
          assigneeName: assigneeName.trim(),
          notes: assigneeNotes.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to assign work.');
      }

      setAssignment(json.data);
      setAssignModalOpen(false);
      setAssigneeName('');
      setAssigneeNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to assign.');
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-slate-500">Loading shipment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-300">Shipment not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <Link
        href="/sbu/forwarding/work-queue"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Work Queue
      </Link>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Ship className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {shipment.shipmentNumber}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {shipment.customerName || shipment.customerId}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[shipment.globalStatus] || STATUS_COLORS.DRAFT}`}>
                  {STATUS_LABELS[shipment.globalStatus] || shipment.globalStatus}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {assignment ? (
              <button
                onClick={() => {
                  setAssigneeName(assignment.assignee_name || '');
                  setAssigneeNotes(assignment.assignee_notes || '');
                  setAssignModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Reassign
              </button>
            ) : (
              <button
                onClick={() => setAssignModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                Assign
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Status */}
      {assignment && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <UserPlus className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Assignment</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-slate-400">Status</span>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {assignment.status === 'assigned' ? 'Assigned' : assignment.status}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Assigned To</span>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {assignment.assignee_name || '-'}
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-400">Assigned At</span>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {assignment.assigned_at ? formatDateTime(assignment.assigned_at) : '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Route & Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Route</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {shipment.originName || shipment.originLocationId} → {shipment.destinationName || shipment.destinationLocationId}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">ETD / ETA</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {formatDate(shipment.etd)} → {formatDate(shipment.eta)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">BL / Booking</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            MBL: {shipment.masterBlNumber || '-'} | HBL: {shipment.houseBlNumber || '-'}
          </p>
        </div>
      </div>

      {/* Containers/Units */}
      {units.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Containers / Units
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {units.map((unit) => (
              <div key={unit.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Container className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {unit.containerNumber}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div>Type: {unit.isoType} | Seal: {unit.sealNumber || '-'}</div>
                  <div>Tare: {unit.tareWeightKg}kg | Max Payload: {unit.maxPayloadKg}kg</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Legs */}
      {legs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Execution Plan
          </h2>
          <div className="space-y-3">
            {legs.map((leg, index) => (
              <div key={leg.id} className="flex items-center gap-4 p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {leg.legType}: {leg.startLocation} → {leg.endLocation}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(leg.scheduledStart)} → {formatDateTime(leg.scheduledEnd)}
                  </div>
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[leg.status] || STATUS_COLORS.PLANNED}`}>
                  {STATUS_LABELS[leg.status] || leg.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Timeline
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Created {formatDateTime(shipment.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Last updated {formatDateTime(shipment.updatedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              {assignment ? 'Reassign Forwarding Work' : 'Assign Forwarding Work'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Assignee Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Enter assignee name..."
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={assigneeNotes}
                  onChange={(e) => setAssigneeNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setAssignModalOpen(false);
                    setAssigneeName('');
                    setAssigneeNotes('');
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assigning || !assigneeName.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {assignment ? 'Reassign' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
