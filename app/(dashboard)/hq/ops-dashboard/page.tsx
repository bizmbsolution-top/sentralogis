"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  Activity, 
  ShieldCheck, 
  Truck, 
  Users, 
  FileText, 
  ArrowUpRight, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Timer,
  RefreshCw,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Package,
  FileCheck,
  DollarSign,
  CreditCard,
  Siren,
  Megaphone,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';

type SlaCompliance = {
  sla_stage: string;
  total_count: number;
  pass_count: number;
  fail_count: number;
  compliance_pct: number;
  target_minutes: number;
};

type SlaSbuBreakdown = {
  sbu_type: string;
  compliance_pct: number;
  total_count: number;
  pass_count: number;
  fail_count: number;
  target_minutes: number;
};

type Breach = {
  breach_type: string;
  wo_number: string;
  jo_number: string;
  stage: string;
  overdue_minutes: number;
  customer_name: string;
  vendor_name: string;
  details: string;
};

type WoAlert = {
  wo_id: string;
  wo_number: string;
  total_jo: number;
  completed_jo: number;
  doc_complete_jo: number;
  cost_complete_jo: number;
  all_ready: boolean;
  missing_jo_details: string;
  customer_name: string;
};

type DueAlert = {
  id: string;
  invoice_number: string;
  entity_name: string;
  amount: number;
  due_date: string;
  days_until_due: number;
  status: string;
};

const SLA_CONFIG = [
  { 
    id: 'SLA 1', 
    label: 'WO Draft → Submit', 
    desc: 'CS finalisasi order', 
    target: '30 min', 
    icon: Zap, 
    link: '/hq/work-orders',
    color: 'blue' 
  },
  { 
    id: 'SLA 2', 
    label: 'Submit → SBU Assigned', 
    desc: 'Routing ke SBU', 
    target: '60 min', 
    icon: Timer, 
    link: '/hq/job-orders',
    color: 'indigo' 
  },
  { 
    id: 'SLA 3', 
    label: 'Assigned → Completed', 
    desc: 'Proses Eksekusi per SBU', 
    target: '2-5 hari', 
    icon: Truck, 
    link: '/hq/sbu-activities',
    color: 'cyan' 
  },
  { 
    id: 'SLA 4', 
    label: 'Done → Ready Billing', 
    desc: 'Doc & cost complete', 
    target: '3 hari', 
    icon: Package, 
    link: '/hq/sbu-activities',
    color: 'purple' 
  },
  { 
    id: 'SLA 5', 
    label: 'Ready → Invoiced', 
    desc: 'Finance audit', 
    target: '1 hari', 
    icon: FileCheck, 
    link: '/hq/invoice-customer',
    color: 'emerald' 
  },
  { 
    id: 'SLA 6', 
    label: 'Accepted → Paid', 
    desc: 'AR collection', 
    target: 'per ToP', 
    icon: DollarSign, 
    link: '/hq/invoice-customer',
    color: 'amber' 
  },
  { 
    id: 'SLA 7', 
    label: 'Vendor Invoice → Paid', 
    desc: 'AP discipline', 
    target: 'per ToP', 
    icon: CreditCard, 
    link: '/hq/finance/cost-audit',
    color: 'rose' 
  },
];

// Per-SBU target minutes for SLA 3 (Processing)
const SBU_SLA3_TARGETS: Record<string, number> = {
  TRUCKING: 2 * 24 * 60,    // 2 days = 2880 min
  WAREHOUSE: 3 * 24 * 60,   // 3 days = 4320 min
  CLEARANCE: 5 * 24 * 60,   // 5 days = 7200 min
  FORWARDING: 3 * 24 * 60,  // 3 days = 4320 min
};

const FLEET_COLORS: Record<string, string> = {
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
  purple: 'text-purple-600',
  indigo: 'text-indigo-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
};

const PROGRESS_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  indigo: 'bg-indigo-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
};

function getSlaStatus(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: 'Excellent', color: 'text-emerald-600' };
  if (pct >= 60) return { label: 'Stable', color: 'text-amber-600' };
  return { label: 'Delays', color: 'text-rose-600' };
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

function formatOverdue(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return `${days}d ${remainHours}h`;
}

function getDueBadge(daysUntilDue: number): { label: string; className: string } {
  if (daysUntilDue < 0) return { label: 'Overdue', className: 'bg-rose-100 text-rose-700 border-rose-200' };
  if (daysUntilDue === 0) return { label: 'Hari ini', className: 'bg-orange-100 text-orange-700 border-orange-200' };
  if (daysUntilDue === 1) return { label: 'H-1', className: 'bg-amber-100 text-amber-700 border-amber-200' };
  if (daysUntilDue <= 3) return { label: `H-${daysUntilDue}`, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return { label: `${daysUntilDue} hari`, className: 'bg-slate-100 text-slate-600 border-slate-200' };
}

export default function HQOpsDashboardPage() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [slaData, setSlaData] = useState<SlaCompliance[]>([]);
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [woAlerts, setWoAlerts] = useState<WoAlert[]>([]);
  const [arDueAlerts, setArDueAlerts] = useState<DueAlert[]>([]);
  const [apDueAlerts, setApDueAlerts] = useState<DueAlert[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escalationCount, setEscalationCount] = useState(0);
  const [slaSbuBreakdown, setSlaSbuBreakdown] = useState<SlaSbuBreakdown[]>([]);
  const [slaTrend, setSlaTrend] = useState<any[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [metrics, setMetrics] = useState({
    activeMissions: 0,
    totalFleet: 0,
    activeDrivers: 0,
    pendingJobs: 0,
    readyToInvoice: 0
  });

  const [joFulfillment, setJoFulfillment] = useState({
    totalSlots: 0,
    assignedSlots: 0,
    rejectedSlots: 0,
    unfilledSlots: 0,
    byReason: {} as Record<string, number>,
    rejectDetails: [] as { wo_number: string; reason: string; note: string; rejected_at: string }[],
  });
  const [fulfillmentModalOpen, setFulfillmentModalOpen] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) {
      setLoading(false);
      return;
    }
    
    try {
      // 1. Fetch Work Orders for Local SLA Calculation
      // 1. Fetch Work Orders and Job Orders for Local SLA Calculation
      const [{ data: wos }, { data: josSla }] = await Promise.all([
        supabase
          .from('work_orders')
          .select('id, wo_number, status, created_at, updated_at, target_date')
          .eq('tenant_id', profile.tenant_id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('job_orders')
          .select('id, status, sbu_type, created_at, updated_at')
          .eq('tenant_id', profile.tenant_id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const workOrders = wos || [];
      const totalWO = workOrders.length;
      
      const localSlaData: any[] = [];
      const localBreaches: any[] = [];

      // [AI] Only show real data — no mock/hardcoded values for empty tenants
      if (totalWO === 0) {
        // Empty state: all SLA at 0%
        for (let i = 1; i <= 7; i++) {
          localSlaData.push({
            sla_stage: `SLA ${i}`,
            compliance_pct: 0,
            total_count: 0,
            pass_count: 0,
            fail_count: 0
          });
        }
        setSlaSbuBreakdown([]);
      } else {
        // SLA 1: WO Draft -> Submit
        const passSla1 = workOrders.filter(wo => wo.status !== 'DRAFT').length;
        localSlaData.push({
          sla_stage: 'SLA 1',
          compliance_pct: Math.round((passSla1 / totalWO) * 100),
          total_count: totalWO,
          pass_count: passSla1,
          fail_count: Math.max(0, totalWO - passSla1)
        });

        // SLA 2: Submit -> SBU Assigned
        const passSla2 = workOrders.filter(wo => !['DRAFT','PENDING_APPROVAL'].includes(wo.status)).length;
        localSlaData.push({
          sla_stage: 'SLA 2',
          compliance_pct: Math.round((passSla2 / totalWO) * 100) || 0,
          total_count: totalWO,
          pass_count: passSla2,
          fail_count: Math.max(0, totalWO - passSla2)
        });

        // SLA 3: Assigned -> Completed (Proses Eksekusi per SBU)
        const sbuList = ['TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING'];
        const breakdown: SlaSbuBreakdown[] = [];
        let totalSla3 = 0;
        let passSla3 = 0;

        for (const sbu of sbuList) {
          const sbuJos = (josSla || []).filter(j => (j.sbu_type || 'TRUCKING').toUpperCase() === sbu);
          const total = sbuJos.length;
          const targetMin = SBU_SLA3_TARGETS[sbu] || 2880;
          let pass = 0;
          for (const j of sbuJos) {
            const created = new Date(j.created_at || Date.now()).getTime();
            const updated = new Date(j.updated_at || Date.now()).getTime();
            const diffMin = (updated - created) / (1000 * 60);
            if (['COMPLETED', 'PAID', 'DONE', 'SELESAI', 'PEKERJAAN SELESAI', 'RECEIVED'].includes((j.status || '').toUpperCase()) && diffMin <= targetMin) {
              pass++;
            }
          }
          breakdown.push({
            sbu_type: sbu,
            compliance_pct: total > 0 ? Math.round((pass / total) * 100) : 0,
            total_count: total,
            pass_count: pass,
            fail_count: Math.max(0, total - pass),
            target_minutes: targetMin
          });
          totalSla3 += total;
          passSla3 += pass;
        }
        setSlaSbuBreakdown(breakdown);

        localSlaData.push({
          sla_stage: 'SLA 3',
          compliance_pct: totalSla3 > 0 ? Math.round((passSla3 / totalSla3) * 100) : 0,
          total_count: totalSla3,
          pass_count: passSla3,
          fail_count: Math.max(0, totalSla3 - passSla3)
        });

        // SLA 4: Done -> Ready Billing
        const passSla4 = workOrders.filter(wo => ['COMPLETED','PAID'].includes(wo.status)).length;
        localSlaData.push({
          sla_stage: 'SLA 4',
          compliance_pct: Math.round((passSla4 / totalWO) * 100) || 0,
          total_count: totalWO,
          pass_count: passSla4,
          fail_count: Math.max(0, totalWO - passSla4)
        });

        // SLA 5: Ready -> Invoiced
        const passSla5 = workOrders.filter(wo => wo.status === 'PAID').length;
        localSlaData.push({
          sla_stage: 'SLA 5',
          compliance_pct: Math.round((passSla5 / totalWO) * 100) || 0,
          total_count: totalWO,
          pass_count: passSla5,
          fail_count: Math.max(0, totalWO - passSla5)
        });

        // SLA 6: Accepted -> Paid
        const passSla6 = workOrders.filter(wo => wo.status === 'PAID').length;
        localSlaData.push({
          sla_stage: 'SLA 6',
          compliance_pct: Math.round((passSla6 / totalWO) * 100) || 0,
          total_count: totalWO,
          pass_count: passSla6,
          fail_count: Math.max(0, totalWO - passSla6)
        });

        // SLA 7: Vendor Invoice -> Paid
        const passSla7 = workOrders.filter(wo => wo.status === 'PAID').length;
        localSlaData.push({
          sla_stage: 'SLA 7',
          compliance_pct: Math.round((passSla7 / totalWO) * 100) || 0,
          total_count: totalWO,
          pass_count: passSla7,
          fail_count: Math.max(0, totalWO - passSla7)
        });
      }

      setSlaData(localSlaData);

      // Generate active breaches based on actual data
      workOrders.filter(wo => wo.status === 'DRAFT').forEach((wo) => {
        const created = new Date(wo.created_at).getTime();
        const now = Date.now();
        const diffMins = Math.floor((now - created) / 60000);
        if (diffMins > 30) {
          localBreaches.push({
            stage: 'SLA 1',
            wo_number: wo.wo_number,
            overdue_minutes: diffMins - 30,
            details: 'WO masih Draft lebih dari 30 menit',
            breach_type: 'SLA 1'
          });
        }
      });

      // If no actual breaches found, show empty state (no mock data)
      if (localBreaches.length === 0 && totalWO === 0) {
        // No breaches — all clear
      }

      setBreaches(localBreaches.sort((a, b) => b.overdue_minutes - a.overdue_minutes).slice(0, 10));

      // 3. WO readiness alerts
      const { data: woResult, error: woError } = await supabase
        .from('work_orders')
        .select(`
          id, wo_number, customer_id,
          wo_items (
            id,
            job_orders (
              id, jo_number, status, is_doc_finished, is_cost_finished
            )
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .not('status', 'in', '("completed","cancelled","paid")');
      
      if (!woError && woResult) {
        const alerts: WoAlert[] = [];
        for (const wo of woResult) {
          const jos = (wo as any).wo_items?.flatMap((wi: any) => wi.job_orders || []) || [];
          if (jos.length === 0) continue;
          const totalJo = jos.length;
          const completedJo = jos.filter((j: any) => 
            ['completed', 'COMPLETED', 'PEKERJAAN SELESAI', 'awaiting_audit', 'AWAITING_AUDIT'].includes(j.status)
          ).length;
          const docComplete = jos.filter((j: any) => j.is_doc_finished).length;
          const costComplete = jos.filter((j: any) => j.is_cost_finished).length;
          const allReady = docComplete === totalJo && costComplete === totalJo;
          if (!allReady) {
            const missing = jos
              .filter((j: any) => !j.is_doc_finished || !j.is_cost_finished)
              .map((j: any) => {
                const parts = [];
                if (!j.is_doc_finished) parts.push('doc');
                if (!j.is_cost_finished) parts.push('cost');
                return `${j.jo_number}: ${parts.join(', ')} incomplete`;
              })
              .join('; ');
            alerts.push({
              wo_id: wo.id,
              wo_number: wo.wo_number,
              total_jo: totalJo,
              completed_jo: completedJo,
              doc_complete_jo: docComplete,
              cost_complete_jo: costComplete,
              all_ready: false,
              missing_jo_details: missing,
              customer_name: ''
            });
          }
        }
        setWoAlerts(alerts.slice(0, 10));
      }

      // 4. AR due alerts (customer invoices) — scoped to tenant via work_orders
      const { data: tenantWos } = await supabase
        .from('work_orders')
        .select('id, customer_id')
        .eq('tenant_id', profile.tenant_id);

      const woMap = new Map((tenantWos || []).map(wo => [wo.id, wo.customer_id]));
      const woIds = Array.from(woMap.keys());

      if (woIds.length > 0) {
        const { data: arInvoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, total_billing, status, due_date, wo_id')
          .in('wo_id', woIds)
          .in('status', ['sent', 'accepted'])
          .order('due_date', { ascending: true })
          .limit(10);

        const now = new Date();
        const arAlerts: DueAlert[] = [];
        for (const inv of (arInvoices || [])) {
          if (!inv.due_date) continue;
          const due = new Date(inv.due_date);
          const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 3) {
            arAlerts.push({
              id: inv.id,
              invoice_number: inv.invoice_number || 'N/A',
              entity_name: woMap.get(inv.wo_id) || 'Customer',
              amount: inv.total_billing || 0,
              due_date: inv.due_date,
              days_until_due: daysUntilDue,
              status: inv.status
            });
          }
        }
        setArDueAlerts(arAlerts);
      }

      // 5. AP due alerts (vendor invoices) — scoped to tenant
      const { data: apInvoices } = await supabase
        .from('vendor_invoices')
        .select('id, invoice_number, invoice_amount, status, received_at, vendor_id')
        .eq('tenant_id', profile.tenant_id)
        .in('status', ['verified', 'submitted'])
        .order('received_at', { ascending: true })
        .limit(10);

      if (apInvoices && apInvoices.length > 0) {
        const vendorIds = apInvoices.map(i => i.vendor_id).filter(Boolean);
        const { data: vendors } = await supabase
          .from('md_entities')
          .select('id, name')
          .eq('tenant_id', profile.tenant_id)
          .in('id', vendorIds);

        const vendorMap = new Map((vendors || []).map(v => [v.id, v.name]));
        const apResult = apInvoices.map(vi => ({
          ...vi,
          vendor: vendorMap.has(vi.vendor_id) ? { name: vendorMap.get(vi.vendor_id) } : null,
        }));

        const now = new Date();
        const apAlerts: DueAlert[] = [];
        for (const vi of apResult) {
          if (!vi.received_at) continue;
          const due = new Date(vi.received_at);
          due.setDate(due.getDate() + 30);
          const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 3) {
            apAlerts.push({
              id: vi.id,
              invoice_number: vi.invoice_number || 'N/A',
              entity_name: (vi as any).vendor?.name || 'Vendor',
              amount: vi.invoice_amount || 0,
              due_date: vi.received_at,
              days_until_due: daysUntilDue,
              status: vi.status
            });
          }
        }
        setApDueAlerts(apAlerts);
      }

      // 5b. SLA Escalations
      const { data: escData } = await supabase
        .from('sla_escalations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

      setEscalations(escData || []);
      setEscalationCount(escData?.length || 0);

      // 6. Fleet & driver stats
      const [fleetRes, driverRes, joRes] = await Promise.all([
        supabase.from('md_fleets').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('md_drivers').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('job_orders').select('id, status').eq('tenant_id', profile.tenant_id)
      ]);

      const jos = joRes.data || [];
      setMetrics({
        activeMissions: jos.filter(j => !['completed', 'cancelled', 'paid', 'ready_for_billing'].includes(j.status)).length,
        totalFleet: fleetRes.count || 0,
        activeDrivers: driverRes.count || 0,
        pendingJobs: jos.filter(j => j.status === 'pending').length,
        readyToInvoice: jos.filter(j => j.status === 'ready_for_billing').length
      });

      // 6b. JO Fulfillment Breakdown — rejected_slots from wo_items.item_data
      const { data: fulfillmentWos } = await supabase
        .from('work_orders')
        .select('id, wo_number, wo_items(id, item_data, status)')
        .eq('tenant_id', profile.tenant_id)
        .not('status', 'in', '("completed","cancelled","paid")');

      const reasonLabels: Record<string, string> = {
        truck_unavailable: 'Truk Tidak Tersedia',
        vendor_cancelled: 'Vendor Batal',
        driver_unavailable: 'Sopir Tidak Tersedia',
        cost_too_high: 'Biaya Terlalu Tinggi',
        other: 'Lainnya',
      };

      let totalSlots = 0;
      let rejectedSlots = 0;
      const byReason: Record<string, number> = {};
      const rejectDetails: { wo_number: string; reason: string; note: string; rejected_at: string }[] = [];

      for (const wo of (fulfillmentWos || [])) {
        const woNum = (wo as any).wo_number;
        for (const wi of ((wo as any).wo_items || [])) {
          const itemData = wi.item_data || {};
          const capacity = itemData.capacity_truck || 0;
          const rejected = itemData.rejected_slots || [];
          totalSlots += Math.max(capacity, 0);
          rejectedSlots += rejected.length;
          for (const r of rejected) {
            const label = reasonLabels[r.reason] || r.reason;
            byReason[label] = (byReason[label] || 0) + 1;
            rejectDetails.push({ wo_number: woNum, reason: label, note: r.note || '', rejected_at: r.rejected_at || '' });
          }
        }
      }

      setJoFulfillment({
        totalSlots,
        assignedSlots: Math.max(0, totalSlots - rejectedSlots),
        rejectedSlots,
        unfilledSlots: rejectedSlots,
        byReason,
        rejectDetails,
      });

      // 7. Fetch SLA Trend (last 4 weeks)
      const cutoffDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: trendData } = await supabase
        .from('sla_daily_snapshots')
        .select('snapshot_date, sla_stage, compliance_pct, total_count, pass_count')
        .eq('tenant_id', profile.tenant_id)
        .gte('snapshot_date', cutoffDate)
        .order('snapshot_date', { ascending: true });

      setSlaTrend(trendData || []);

      setLastRefresh(new Date());
    } catch (err) {
      console.error("Ops Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const handleManualRefresh = () => {
    setLoading(true);
    fetchData();
  };

  const [triggeringEscalation, setTriggeringEscalation] = useState(false);

  const handleTriggerEscalation = async () => {
    setTriggeringEscalation(true);
    try {
      const res = await fetch('/api/admin/sla-escalation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: profile?.tenant_id }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`${result.summary.escalations_created} escalation(s), ${result.summary.notifications_sent} notification(s) sent`);
        fetchData();
      } else {
        toast.error(result.error || 'Failed to trigger escalation');
      }
    } catch (err) {
      toast.error('Failed to trigger escalation');
    } finally {
      setTriggeringEscalation(false);
    }
  };

  const globalScore = slaData.reduce((acc, sla) => {
    const weight = sla.sla_stage.includes('SLA 3') ? 0.25 :
                   sla.sla_stage.includes('SLA 5') ? 0.20 :
                   sla.sla_stage.includes('SLA 6') ? 0.20 :
                   sla.sla_stage.includes('SLA 4') ? 0.15 : 0.10;
    return acc + (sla.compliance_pct || 0) * weight;
  }, 0);

  if (loading && slaData.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <Toaster position="top-right" />
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Operations Dashboard</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Operations</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-400">
              Last update: {lastRefresh.toLocaleTimeString('id-ID')}
            </div>
            <button
              onClick={handleTriggerEscalation}
              disabled={triggeringEscalation}
              className="p-2 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
              title="Trigger SLA Escalation Check"
            >
              <Megaphone size={16} className={triggeringEscalation ? 'animate-pulse text-rose-400' : 'text-rose-600'} />
            </button>
            <button
              onClick={handleManualRefresh}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-slate-400' : 'text-slate-500'} />
            </button>
            <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
              <div className={`w-10 h-10 ${globalScore >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-lg flex items-center justify-center`}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase">Health Score</p>
                <p className={`text-sm font-semibold ${globalScore >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {Math.round(globalScore)}% - {globalScore >= 90 ? 'Optimal' : globalScore >= 70 ? 'Stable' : 'Critical'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SLA Compliance Cards */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SLA_CONFIG.map((sla) => {
            const slaResult = slaData.find(s => s.sla_stage.startsWith(sla.id));
            const pct = slaResult?.compliance_pct || 0;
            const status = getSlaStatus(pct);
            const Icon = sla.icon;
            return (
              <Link key={sla.id} href={sla.link}>
                <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 bg-${sla.color}-50 text-${sla.color}-600 rounded-lg flex items-center justify-center`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{sla.label}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{sla.desc}</p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-medium text-slate-500">
                      SLA: {sla.target}
                    </span>
                  </div>
                  
                  <div className="flex items-end gap-3 mb-4">
                    <h2 className="text-2xl font-semibold text-slate-900">{pct}%</h2>
                    <span className={`text-xs font-medium mb-0.5 ${status.color}`}>{status.label}</span>
                  </div>

                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(pct)}`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {slaResult && slaResult.total_count > 0 && (
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{slaResult.pass_count} pass / {slaResult.fail_count} fail</span>
                      <span>Total: {slaResult.total_count}</span>
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* SLA 3 SBU Breakdown */}
      {slaSbuBreakdown.some(s => s.total_count > 0) && (
        <div className="max-w-7xl mx-auto mb-8">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-50 text-cyan-600 rounded-lg flex items-center justify-center">
                  <Truck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">SLA 3 — Proses Eksekusi per SBU</h3>
                  <p className="text-xs text-slate-400">Assigned → Completed (target berbeda per SBU)</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {slaSbuBreakdown.map((sbu) => {
                  const status = getSlaStatus(sbu.compliance_pct);
                  const targetDays = Math.round(sbu.target_minutes / (24 * 60));
                  return (
                    <div key={sbu.sbu_type} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-600">{sbu.sbu_type}</span>
                        <span className="text-[10px] text-slate-400">{targetDays}h target</span>
                      </div>
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-xl font-semibold text-slate-900">{sbu.compliance_pct}%</span>
                        <span className={`text-[10px] font-medium mb-0.5 ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(sbu.compliance_pct)}`} 
                          style={{ width: `${sbu.compliance_pct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-[10px] text-slate-400">
                        {sbu.pass_count}/{sbu.total_count} on time
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* SLA Trend — Last 4 Weeks */}
      {slaTrend.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">SLA Trend — Last 4 Weeks</h3>
                  <p className="text-xs text-slate-400">Compliance mingguan per stage (rekapan snapshot harian)</p>
                </div>
              </div>
              <span className="text-[11px] font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {slaTrend.length} Snapshots
              </span>
            </div>
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4">SLA Stage</th>
                    <th className="pb-3 px-4 text-center">Minggu -3</th>
                    <th className="pb-3 px-4 text-center">Minggu -2</th>
                    <th className="pb-3 px-4 text-center">Minggu -1</th>
                    <th className="pb-3 px-4 text-center">Minggu Ini</th>
                    <th className="pb-3 pl-4 text-right">Tren & Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {SLA_CONFIG.map((cfg) => {
                    const stageSnaps = slaTrend.filter(s => s.sla_stage === cfg.id);
                    const nowTime = Date.now();
                    const getWeekAvg = (minDays: number, maxDays: number) => {
                      const wSnaps = stageSnaps.filter(s => {
                        const daysAgo = Math.floor((nowTime - new Date(s.snapshot_date).getTime()) / (24 * 60 * 60 * 1000));
                        return daysAgo >= minDays && daysAgo <= maxDays;
                      });
                      if (wSnaps.length === 0) return null;
                      const sum = wSnaps.reduce((acc, curr) => acc + Number(curr.compliance_pct), 0);
                      return Math.round(sum / wSnaps.length);
                    };

                    const w3 = getWeekAvg(21, 27);
                    const w2 = getWeekAvg(14, 20);
                    const w1 = getWeekAvg(7, 13);
                    const w0 = getWeekAvg(0, 6);

                    const latestPct = w0 !== null ? w0 : (w1 !== null ? w1 : (w2 !== null ? w2 : (w3 !== null ? w3 : 0)));
                    const prevPct = w1 !== null ? w1 : (w2 !== null ? w2 : (w3 !== null ? w3 : latestPct));
                    const diff = latestPct - prevPct;
                    const status = getSlaStatus(latestPct);

                    const renderWeekBadge = (val: number | null) => {
                      if (val === null) return <span className="text-slate-300">—</span>;
                      const st = getSlaStatus(val);
                      return (
                        <span className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] ${st.color}`}>
                          {val}%
                        </span>
                      );
                    };

                    return (
                      <tr key={cfg.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-slate-900">{cfg.id}</div>
                          <div className="text-[11px] text-slate-400">{cfg.label}</div>
                        </td>
                        <td className="py-3 px-4 text-center">{renderWeekBadge(w3)}</td>
                        <td className="py-3 px-4 text-center">{renderWeekBadge(w2)}</td>
                        <td className="py-3 px-4 text-center">{renderWeekBadge(w1)}</td>
                        <td className="py-3 px-4 text-center">{renderWeekBadge(w0)}</td>
                        <td className="py-3 pl-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {diff > 0 && (
                              <span className="flex items-center gap-0.5 text-emerald-600 font-semibold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                <TrendingUp size={12} /> +{diff}%
                              </span>
                            )}
                            {diff < 0 && (
                              <span className={`flex items-center gap-0.5 font-semibold text-[11px] px-1.5 py-0.5 rounded border ${diff <= -10 ? 'text-rose-600 bg-rose-50 border-rose-200 animate-pulse' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                                <TrendingDown size={12} /> {diff}%
                              </span>
                            )}
                            {diff === 0 && (
                              <span className="flex items-center gap-0.5 text-slate-400 font-medium text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                <Minus size={12} /> Steady
                              </span>
                            )}
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Active Breaches Table */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Breach Aktif — Perlu Intervensi</h3>
                <p className="text-xs text-slate-400">Top 10 paling overdue</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold">
              {breaches.length} active
            </span>
          </div>

          {breaches.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
              <p className="text-sm font-medium text-slate-600">Tidak ada breach aktif</p>
              <p className="text-xs text-slate-400 mt-1">Semua SLA berjalan sesuai target</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3">Stage</th>
                    <th className="px-5 py-3">WO#</th>
                    <th className="px-5 py-3">JO#</th>
                    <th className="px-5 py-3">Overdue</th>
                    <th className="px-5 py-3">Customer / Vendor</th>
                    <th className="px-5 py-3">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {breaches.map((b, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold ${
                          b.breach_type === 'SLA 1' ? 'bg-blue-50 text-blue-600' :
                          b.breach_type === 'SLA 2' ? 'bg-indigo-50 text-indigo-600' :
                          b.breach_type === 'SLA 3' ? 'bg-purple-50 text-purple-600' :
                          b.breach_type === 'SLA 4' ? 'bg-emerald-50 text-emerald-600' :
                          b.breach_type === 'SLA 5' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {b.stage}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-slate-700">{b.wo_number}</td>
                      <td className="px-5 py-3 text-xs font-mono text-slate-500">{b.jo_number || '—'}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold text-rose-600">{formatOverdue(b.overdue_minutes)}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600">{b.customer_name || b.vendor_name || '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-500 max-w-[200px] truncate">{b.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* SLA Escalations Panel */}
      {escalations.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <Card className="border border-rose-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="p-5 border-b border-rose-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center animate-pulse">
                  <Siren size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-rose-900">SLA Escalations — Active</h3>
                  <p className="text-xs text-rose-600">Auto-escalated breaches requiring attention</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-200 text-rose-800 rounded-full text-xs font-semibold">
                {escalationCount} active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3">Level</th>
                    <th className="px-5 py-3">SLA Stage</th>
                    <th className="px-5 py-3">WO / JO</th>
                    <th className="px-5 py-3">Notified</th>
                    <th className="px-5 py-3">Details</th>
                    <th className="px-5 py-3">Escalated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {escalations.map((esc) => {
                    const levelColors: Record<number, string> = {
                      1: 'bg-amber-50 text-amber-700 border-amber-200',
                      2: 'bg-orange-50 text-orange-700 border-orange-200',
                      3: 'bg-rose-50 text-rose-700 border-rose-200',
                      4: 'bg-red-100 text-red-800 border-red-300',
                    };
                    const levelLabels: Record<number, string> = {
                      1: '⚠ Warning',
                      2: '🔔 Breach',
                      3: '🚨 Critical',
                      4: '💀 Emergency',
                    };
                    return (
                      <tr key={esc.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-semibold border ${levelColors[esc.escalation_level] || 'bg-slate-50 text-slate-600'}`}>
                            {levelLabels[esc.escalation_level] || `Level ${esc.escalation_level}`}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs font-mono text-slate-700">{esc.sla_stage}</td>
                        <td className="px-5 py-3">
                          <div className="text-xs font-mono text-slate-900">{esc.wo_id ? esc.wo_id.slice(0, 8) : '—'}</div>
                          {esc.jo_id && <div className="text-[10px] text-slate-400 font-mono">{esc.jo_id.slice(0, 8)}</div>}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-600">{esc.notified_role || '—'}</td>
                        <td className="px-5 py-3 text-xs text-slate-500 max-w-[250px] truncate">{esc.details}</td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {esc.created_at ? new Date(esc.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* JO Fulfillment Breakdown */}
      <div className="max-w-7xl mx-auto mb-8">
        <Card
          className={`border shadow-sm rounded-xl bg-white overflow-hidden cursor-pointer hover:shadow-md transition-all ${
            joFulfillment.rejectedSlots > 0 ? 'border-rose-200' : 'border-slate-200'
          }`}
          onClick={() => setFulfillmentModalOpen(true)}
        >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                joFulfillment.rejectedSlots > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <Package size={16} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">JO Fulfillment — Slot Status</h3>
                <p className="text-xs text-slate-400">Truck assignment slot breakdown (rejected / assigned / unfilled)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {joFulfillment.rejectedSlots > 0 && (
                <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full text-[11px] font-bold">
                  {joFulfillment.rejectedSlots} rejected
                </span>
              )}
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Total Slots</p>
                <h3 className="text-xl font-semibold text-slate-900">{joFulfillment.totalSlots}</h3>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-[10px] font-medium text-emerald-500 uppercase mb-1">Assigned</p>
                <h3 className="text-xl font-semibold text-emerald-700">{joFulfillment.assignedSlots}</h3>
              </div>
              <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                <p className="text-[10px] font-medium text-rose-500 uppercase mb-1">Rejected</p>
                <h3 className="text-xl font-semibold text-rose-700">{joFulfillment.rejectedSlots}</h3>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-[10px] font-medium text-amber-500 uppercase mb-1">Unfilled</p>
                <h3 className="text-xl font-semibold text-amber-700">{joFulfillment.unfilledSlots}</h3>
              </div>
            </div>
            {joFulfillment.rejectedSlots > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(joFulfillment.byReason).map(([reason, count]) => (
                  <span key={reason} className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-md text-[10px] font-semibold border border-rose-100">
                    {reason}: {count}
                  </span>
                ))}
              </div>
            )}
            {joFulfillment.totalSlots === 0 && (
              <p className="text-xs text-slate-400 text-center py-2">No active slots with capacity_truck data</p>
            )}
          </div>
        </Card>
      </div>

      {/* Fulfillment Drill-down Modal */}
      {fulfillmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setFulfillmentModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                  <Package size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Rejected Slot Details</h2>
                  <p className="text-xs text-slate-400">Per-WO slot rejection breakdown</p>
                </div>
              </div>
              <button onClick={() => setFulfillmentModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <XCircle size={18} className="text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {joFulfillment.rejectDetails.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600">No rejected slots</p>
                  <p className="text-xs text-slate-400 mt-1">All slots are assigned or unfilled without rejection</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {joFulfillment.rejectDetails.map((d, i) => (
                    <div key={i} className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold text-rose-800">{d.wo_number}</span>
                        <span className="text-[10px] text-rose-500">{d.rejected_at ? new Date(d.rejected_at).toLocaleString('id-ID') : '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-rose-200 text-rose-800 rounded text-[10px] font-bold">{d.reason}</span>
                      </div>
                      {d.note && <p className="text-[11px] text-rose-700 mt-1">{d.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WO Readiness + Due Alerts */}
      <div className="max-w-7xl mx-auto mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WO Readiness */}
        <Card className="lg:col-span-1 border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">WO Belum Siap Invoice</h3>
              <p className="text-xs text-slate-400">Doc/cost JO belum lengkap</p>
            </div>
          </div>

          {woAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Semua WO siap invoice</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
              {woAlerts.slice(0, 5).map((alert) => (
                <Link key={alert.wo_id} href={`/hq/work-orders`} className="block p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-slate-700">{alert.wo_number}</span>
                    <span className="text-[10px] font-medium text-amber-600">
                      {alert.doc_complete_jo}/{alert.total_jo} JO
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${(alert.doc_complete_jo / alert.total_jo) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{alert.missing_jo_details}</p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* AR Due Alerts */}
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Invoice Customer — Jatuh Tempo</h3>
              <p className="text-xs text-slate-400">AR yang perlu ditagih</p>
            </div>
          </div>

          {arDueAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Tidak ada invoice jatuh tempo</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
              {arDueAlerts.map((alert) => {
                const badge = getDueBadge(alert.days_until_due);
                return (
                  <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold text-slate-700">{alert.invoice_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">{alert.entity_name}</p>
                    <p className="text-xs font-semibold text-slate-900 mt-1">
                      Rp {alert.amount.toLocaleString('id-ID')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* AP Due Alerts */}
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
              <CreditCard size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Invoice Vendor — Perlu Dibayar</h3>
              <p className="text-xs text-slate-400">AP yang perlu diproses</p>
            </div>
          </div>

          {apDueAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Tidak ada invoice vendor jatuh tempo</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
              {apDueAlerts.map((alert) => {
                const badge = getDueBadge(alert.days_until_due);
                return (
                  <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold text-slate-700">{alert.invoice_number}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">{alert.entity_name}</p>
                    <p className="text-xs font-semibold text-slate-900 mt-1">
                      Rp {alert.amount.toLocaleString('id-ID')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Access + Fleet */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/hq/work-orders" className="group">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Work Orders</h3>
              <p className="text-xs text-slate-400">Manage requests</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Active: {metrics.activeMissions}</span>
                <ArrowUpRight size={14} className="text-blue-500 group-hover:text-blue-600" />
              </div>
            </Card>
          </Link>

          <Link href="/hq/job-orders" className="group">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Truck size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Job Orders</h3>
              <p className="text-xs text-slate-400">Dispatch tracking</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Live: {metrics.activeMissions}</span>
                <ArrowUpRight size={14} className="text-emerald-500 group-hover:text-emerald-600" />
              </div>
            </Card>
          </Link>

          <Link href="/hq/sbu-activities" className="group">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-purple-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Activity size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Mission Radar</h3>
              <p className="text-xs text-slate-400">Live operations</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Activity: {metrics.activeMissions}</span>
                <ArrowUpRight size={14} className="text-purple-500 group-hover:text-purple-600" />
              </div>
            </Card>
          </Link>

          <Link href="/hq/finance/cost-audit" className="group">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-amber-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Finance</h3>
              <p className="text-xs text-slate-400">Cost audit</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Pending: {metrics.readyToInvoice}</span>
                <ArrowUpRight size={14} className="text-amber-500 group-hover:text-amber-600" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Fleet Readiness */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Fleet Readiness</h2>
                <p className="text-xs text-slate-400 mt-0.5">Real-time asset capacity</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Fleet', value: metrics.totalFleet, color: 'blue', sub: 'Owned assets' },
                { label: 'Active Drivers', value: metrics.activeDrivers, color: 'emerald', sub: 'Verified' },
                { label: 'Utilisation', value: `${metrics.totalFleet > 0 ? Math.round((metrics.activeMissions / metrics.totalFleet) * 100) : 0}%`, color: 'purple', sub: 'Asset load' },
              ].map((m, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">{m.label}</p>
                  <h3 className={`text-xl font-semibold ${FLEET_COLORS[m.color] || 'text-slate-600'} mb-1`}>{m.value}</h3>
                  <p className="text-xs text-slate-400">{m.sub}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Clock size={16} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">System Status</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">Cloud Sync</span>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Active
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500">Auto Refresh</span>
                <span className="text-xs font-medium text-slate-700">30 detik</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-slate-500">Last Check</span>
                <span className="text-xs font-medium text-slate-700">{lastRefresh.toLocaleTimeString('id-ID')}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
