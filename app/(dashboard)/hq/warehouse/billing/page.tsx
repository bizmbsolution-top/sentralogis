"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FileText, CreditCard, Calendar, AlertCircle, Plus, Building2, TrendingUp, Search, MoreHorizontal, ArrowUpRight, CheckCircle2, Edit2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function HQWarehouseBilling() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'contracts' | 'rates'>('contracts');

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        supabase.from("md_storage_contracts").select("*, md_entities:customer_id(name)").eq("tenant_id", profile.tenant_id).order("created_at", { ascending: false }),
        supabase.from("md_billing_rates").select("*, contract:md_storage_contracts!contract_id(contract_number, customer_id, md_entities:customer_id(name))").eq("tenant_id", profile.tenant_id).limit(100),
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
    return <Badge variant={map[s] || "default"} className="uppercase tracking-wider text-[10px] px-2 py-0.5">{s}</Badge>;
  };

  const chargeLabels: Record<string, string> = {
    "STR-FIX": "Fixed Storage", "STR-CBM": "Storage / CBM", "STR-SQM": "Storage / SQM",
    "STR-COLD": "Cold Storage", "HD-IN": "Handling In", "HD-OUT": "Handling Out",
    "HD-PICK": "Picking", "HD-KIT": "Kitting", "HD-ALAT": "Equipment Rental", "HD-DOC": "Documentation",
  };

  const filteredContracts = contracts.filter(c => 
    c.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.md_entities?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRates = rates.filter(r =>
    r.charge_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.contract?.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.contract?.md_entities?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F4F7F9] p-4 lg:p-8 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <Building2 className="text-white w-5 h-5" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Contract & Billing</h1>
            </div>
            <p className="text-slate-500 text-sm md:text-base max-w-xl leading-relaxed ml-13">
              Manage enterprise storage contracts, service level agreements, and commercial billing rates dynamically.
            </p>
          </div>
          
          <div className="relative z-10 flex items-center gap-3 w-full lg:w-auto">
            <a 
              href="/hq/business/contracts/new"
              className="group flex flex-1 lg:flex-none items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-blue-200 hover:-translate-y-0.5"
            >
              <Plus size={18} className="transition-transform group-hover:rotate-90 duration-300" />
              New Contract
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: "Total Contracts", value: contracts.length, icon: FileText, color: "blue" },
            { label: "Active Agreements", value: contracts.filter(c => c.status === "ACTIVE").length, icon: CheckCircle2, color: "emerald" },
            { label: "Active Rate Cards", value: rates.length, icon: CreditCard, color: "indigo" },
            { label: "Hybrid Billing", value: contracts.filter(c => c.billing_method === "HYBRID").length, icon: TrendingUp, color: "amber" }
          ].map((stat, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={stat.label}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-50 rounded-bl-full -z-0 transition-transform group-hover:scale-110 duration-500`} />
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600`}>
                  <stat.icon size={22} strokeWidth={2.5} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px] bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Loading commercial data...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit">
              <button
                onClick={() => setActiveTab('contracts')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'contracts'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText size={16} />
                Active Contracts ({contracts.length})
              </button>
              <button
                onClick={() => setActiveTab('rates')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'rates'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard size={16} />
                Catalog Rate Cards ({rates.length})
              </button>
            </div>

            {/* Content Section */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {activeTab === 'contracts' ? 'Active Contracts' : 'Catalog Rate Cards'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {activeTab === 'contracts' ? 'Overview of all customer agreements' : 'Active billing rates and SLAs across contracts'}
                  </p>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder={activeTab === 'contracts' ? "Search by ID or Customer..." : "Search charge code or customer..."} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                {activeTab === 'contracts' ? (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-6 py-4 font-semibold text-slate-500">Contract ID / Customer</th>
                        <th className="px-6 py-4 font-semibold text-slate-500">Status</th>
                        <th className="px-6 py-4 font-semibold text-slate-500">Billing Type</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 text-right">Committed Space</th>
                        <th className="px-6 py-4 font-semibold text-slate-500">Validity Period</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredContracts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-16">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                <FileText size={24} />
                              </div>
                              <p className="text-slate-500 font-medium">No contracts found</p>
                            </div>
                          </td>
                        </tr>
                      ) : filteredContracts.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs uppercase shrink-0">
                                {c.md_entities?.name?.substring(0, 2) || "NA"}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{c.md_entities?.name || "Unknown Customer"}</p>
                                <p className="font-mono text-xs text-slate-500 mt-0.5">{c.contract_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">{statusBadge(c.status)}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {c.billing_method.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-bold text-slate-900">{c.committed_space?.toLocaleString() || 0}</div>
                            <div className="text-xs text-slate-500">{c.uom_space}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-900 font-medium">{new Date(c.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <ArrowUpRight size={10} />
                              {new Date(c.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link 
                              href={`/hq/business/contracts/${c.id}/edit`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                            >
                              <Edit2 size={14} />
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-6 py-4 font-semibold text-slate-500">Charge Code / Service</th>
                        <th className="px-6 py-4 font-semibold text-slate-500">Customer & Contract</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 text-right">Rate Value</th>
                        <th className="px-6 py-4 font-semibold text-slate-500">UOM</th>
                        <th className="px-6 py-4 font-semibold text-slate-500">Validity</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredRates.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-16">
                            <div className="flex flex-col items-center gap-3">
                              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                <CreditCard size={24} />
                              </div>
                              <p className="text-slate-500 font-medium">No rate cards found</p>
                            </div>
                          </td>
                        </tr>
                      ) : filteredRates.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs rounded-md border border-indigo-100">
                                {r.charge_code}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {chargeLabels[r.charge_code] || r.charge_code}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{r.contract?.md_entities?.name || "Customer"}</div>
                            <div className="font-mono text-xs text-slate-500 mt-0.5">{r.contract?.contract_number || "No Contract"}</div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                            Rp {Number(r.rate_value || 0).toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">
                            {r.uom}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-slate-900 text-xs font-medium">{r.valid_from ? new Date(r.valid_from).toLocaleDateString('id-ID') : '-'}</div>
                            <div className="text-slate-400 text-[11px]">s/d {r.valid_to ? new Date(r.valid_to).toLocaleDateString('id-ID') : 'Aktif'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-xs font-bold">
                              ACTIVE
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

