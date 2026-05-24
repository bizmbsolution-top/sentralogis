"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Truck, Clock, CheckCircle2, ShoppingCart } from "lucide-react";

interface TaskItem {
  id: string;
  task_number: string;
  task_type: string;
  status: string;
  priority: string;
  notes: string;
  created_at: string;
  expected_qty: number;
}

export default function HQWarehouseOutbound() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("wh_tasks")
        .select(`
          id, task_number, task_type, status, priority, notes, created_at,
          wh_task_items!inner (expected_quantity)
        `)
        .eq("tenant_id", profile.tenant_id)
        .in("task_type", ["OUTBOUND", "PICKING", "PACKING"])
        .order("created_at", { ascending: false })
        .limit(50);

      setTasks((data || []).map((t: any) => ({
        id: t.id,
        task_number: t.task_number,
        task_type: t.task_type,
        status: t.status,
        priority: t.priority,
        notes: t.notes || "-",
        created_at: t.created_at,
        expected_qty: t.wh_task_items?.[0]?.expected_quantity || 0,
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile, supabase]);

  useEffect(() => { if (profile) fetchData(); }, [profile, fetchData]);

  const statusBadge = (s: string) => {
    const map: Record<string, "success" | "warning" | "info" | "default"> = {
      COMPLETED: "success", IN_PROGRESS: "warning", PENDING: "info",
    };
    return <Badge variant={map[s] || "default"}>{s}</Badge>;
  };

  const statCards = [
    { label: "Pending", value: tasks.filter(t => t.status === "PENDING").length, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "In Progress", value: tasks.filter(t => t.status === "IN_PROGRESS").length, icon: ShoppingCart, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Completed", value: tasks.filter(t => t.status === "COMPLETED").length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total", value: tasks.length, icon: Truck, color: "text-slate-600", bg: "bg-slate-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Outbound Management</h1>
        <p className="text-slate-500 text-sm mt-1">Monitor picking, packing, dan dispatch</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-slate-900">Outbound Tasks</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Task #</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Priority</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Expected Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Notes</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">No outbound tasks yet</td></tr>
                ) : tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{t.task_number}</td>
                    <td className="px-4 py-3"><Badge variant="warning">{t.task_type}</Badge></td>
                    <td className="px-4 py-3">{statusBadge(t.status)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={t.priority === "URGENT" ? "danger" : t.priority === "HIGH" ? "warning" : "default"}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{t.expected_qty}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{t.notes}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
