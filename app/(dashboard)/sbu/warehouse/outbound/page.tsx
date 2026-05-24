"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Loader2, TrendingUp, Search, Plus,
  Package, CheckCircle2, Clock, ClipboardList
} from "lucide-react";
import { Card } from "@/components/ui/Card";

interface TaskItem {
  id: string;
  task_number: string;
  task_type: string;
  status: string;
  priority: string;
  notes: string;
  created_at: string;
  assigned_to?: string;
}

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  ASSIGNED: "bg-blue-100 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-cyan-100 text-cyan-700 border-cyan-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const priorityColor: Record<string, string> = {
  LOW: "text-slate-500",
  NORMAL: "text-blue-600",
  HIGH: "text-amber-600",
  URGENT: "text-red-600",
};

export default function SBUOutboundPage() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!profile) return;
    fetchTasks();
  }, [profile]);

  async function fetchTasks() {
    try {
      setLoading(true);
      let tenantId = profile?.tenant_id;
      if (!tenantId && (profile?.role?.startsWith('hq_') || profile?.role === 'owner_sentralogis')) {
        const { data } = await supabase.from('tenants').select('id').limit(1);
        if (data?.length) tenantId = data[0].id;
      }
      if (!tenantId) return;

      const { data, error } = await supabase
        .from('wh_tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('task_type', ['OUTBOUND', 'PICKING', 'PACKING'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTasks(data || []);
    } catch (e) {
      console.error('Failed to fetch outbound tasks:', e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = tasks.filter(t => {
    if (filter !== "ALL" && t.status !== filter) return false;
    if (search && !t.task_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "PENDING").length,
    inProgress: tasks.filter(t => t.status === "IN_PROGRESS").length,
    completed: tasks.filter(t => t.status === "COMPLETED").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outbound</h1>
          <p className="text-slate-500 text-sm mt-1">Picking & Packing Tasks</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium">
          <Plus size={16} />
          New Picking List
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500">Total Tasks</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          <p className="text-xs text-slate-500">Pending</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-cyan-600">{stats.inProgress}</p>
          <p className="text-xs text-slate-500">In Progress</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
          <p className="text-xs text-slate-500">Completed</p>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search task number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="p-12 text-center">
            <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No outbound tasks found</p>
          </Card>
        )}
        {filtered.map((task) => (
          <Card key={task.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  task.status === "COMPLETED" ? "bg-emerald-100" :
                  task.status === "IN_PROGRESS" ? "bg-cyan-100" : "bg-amber-100"
                }`}>
                  {task.status === "COMPLETED" ? (
                    <CheckCircle2 size={20} className="text-emerald-600" />
                  ) : task.status === "IN_PROGRESS" ? (
                    <Loader2 size={20} className="text-cyan-600 animate-spin" />
                  ) : (
                    <Clock size={20} className="text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{task.task_number}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusColor[task.status] || "bg-slate-100 text-slate-600"}`}>
                      {task.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs font-medium ${priorityColor[task.priority] || "text-slate-500"}`}>
                      {task.priority}
                    </span>
                    <span className="text-xs text-slate-400">{task.task_type}</span>
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                {new Date(task.created_at).toLocaleDateString()}
              </div>
            </div>
            {task.notes && (
              <p className="text-xs text-slate-500 mt-2 ml-12">{task.notes}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
