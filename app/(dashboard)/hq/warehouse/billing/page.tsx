"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileText, CreditCard, Calendar, AlertCircle } from "lucide-react";

export default function HQWarehouseBilling() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        supabase.from("md_storage_contracts").select("*").eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false }),
        supabase.from("md_billing_rates").select("*, contract:md_storage_contracts!contract_id(contract_number)").eq("tenant_id", profile.tenant_id).limit(50),
      ]);
      setContracts(cRes.data || []);
      setRates(rRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile, supabase]);

  useEffect(() => { if (profile) fetchData(); }, [profile, fetchData]);

  const statusBadge = (s: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
      ACTIVE: "success", DRAFT: "default", EXPIRED: "warning", TERMINATED: "danger",
    };
    return <Badge variant={map[s] || "default"}>{s}</Badge>;
  };

  const chargeLabels: Record<string, string> = {
    "STR-FIX": "Sewa Tetap", "STR-CBM": "Sewa per CBM", "STR-SQM": "Sewa per SQM",
    "STR-COLD": "Sewa Cold Storage", "HD-IN": "Handling Inbound", "HD-OUT": "Handling Outbound",
    "HD-PICK": "Picking", "HD-KIT": "Kitting", "HD-ALAT": "Sewa Alat", "HD-DOC": "Dokumentasi",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contract & Billing</h1>
        <p className="text-slate-500 text-sm mt-1">Kelola kontrak sewa gudang dan tarif</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{contracts.length}</p>
              <p className="text-xs text-slate-500">Total Contracts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{contracts.filter(c => c.status === "ACTIVE").length}</p>
              <p className="text-xs text-slate-500">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{rates.length}</p>
              <p className="text-xs text-slate-500">Rate Cards</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{contracts.filter(c => c.billing_method === "HYBRID").length}</p>
              <p className="text-xs text-slate-500">Hybrid Billing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900">Storage Contracts</h2>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Contract #</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Billing Method</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Committed Space</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Period</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {contracts.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">No contracts yet</td></tr>
                  ) : contracts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{c.contract_number}</td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3"><Badge variant="info">{c.billing_method}</Badge></td>
                      <td className="px-4 py-3 text-right font-medium">{c.committed_space} {c.uom_space}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {c.start_date} → {c.end_date}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{c.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-bold text-slate-900">Billing Rates</h2>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Contract</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Charge</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Rate</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">UOM</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Valid</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rates.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">No rate cards yet</td></tr>
                  ) : rates.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-xs">{r.contract?.contract_number || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{r.charge_code}</Badge>
                        <span className="ml-1 text-xs text-slate-500">{chargeLabels[r.charge_code] || ""}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        Rp {r.rate_value?.toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.uom}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.valid_from} → {r.valid_to || "∞"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.is_active ? "success" : "default"}>
                          {r.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
