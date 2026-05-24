'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Truck, Package, Ship, Users, Clock, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TruckingMetrics, WmsMetrics, ForwardingMetrics } from './types';

function MetricWidget({ icon, label, value, variant }: { icon: React.ReactNode; label: string; value: number; variant?: 'success' | 'warning' | 'danger' | 'default' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">{icon}</div>
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <Badge variant={variant || 'default'}>{value}</Badge>
    </div>
  );
}

export function TruckingPanel({ data }: { data: TruckingMetrics }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Truck className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">SBU Trucking</h2>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricWidget icon={<Truck className="w-4 h-4" />} label="Active JO" value={data.active_jo} />
        <MetricWidget icon={<Users className="w-4 h-4" />} label="Pending Accept" value={data.pending_driver_accept} variant="warning" />
        <MetricWidget icon={<Clock className="w-4 h-4" />} label="Delivering" value={data.delivering} />
        <MetricWidget icon={<XCircle className="w-4 h-4" />} label="Delayed" value={data.delayed_delivery} variant="danger" />
        <MetricWidget icon={<AlertTriangle className="w-4 h-4" />} label="Failed WA" value={data.failed_wa} variant="danger" />
        <MetricWidget icon={<Package className="w-4 h-4" />} label="Unassigned WO" value={data.unassigned_wo} variant="warning" />
      </CardContent>
    </Card>
  );
}

export function WmsPanel({ data }: { data: WmsMetrics }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Package className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">WMS</h2>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricWidget icon={<AlertTriangle className="w-4 h-4" />} label="Low Stock" value={data.low_stock} variant="warning" />
        <MetricWidget icon={<XCircle className="w-4 h-4" />} label="Negative Stock" value={data.negative_stock} variant="danger" />
        <MetricWidget icon={<Clock className="w-4 h-4" />} label="Pending Picking" value={data.pending_picking} variant="warning" />
        <MetricWidget icon={<Clock className="w-4 h-4" />} label="Pending Putaway" value={data.pending_putaway} />
        <MetricWidget icon={<CheckCircle2 className="w-4 h-4" />} label="Inbound Today" value={data.inbound_today} variant="success" />
        <MetricWidget icon={<CheckCircle2 className="w-4 h-4" />} label="Outbound Today" value={data.outbound_today} variant="success" />
      </CardContent>
    </Card>
  );
}

export function ForwardingPanel({ data }: { data: ForwardingMetrics }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Ship className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Forwarding</h2>
      </CardHeader>
      <CardContent className="space-y-2">
        <MetricWidget icon={<Ship className="w-4 h-4" />} label="Active Shipments" value={data.active_shipment} />
        <MetricWidget icon={<XCircle className="w-4 h-4" />} label="Delayed" value={data.delayed_shipment} variant="danger" />
        <MetricWidget icon={<AlertTriangle className="w-4 h-4" />} label="Missing Docs" value={data.missing_documents} variant="warning" />
        <MetricWidget icon={<Clock className="w-4 h-4" />} label="Customs Pending" value={data.customs_pending} variant="warning" />
        <MetricWidget icon={<XCircle className="w-4 h-4" />} label="Container Lost" value={data.container_tracking_lost} variant="danger" />
      </CardContent>
    </Card>
  );
}
