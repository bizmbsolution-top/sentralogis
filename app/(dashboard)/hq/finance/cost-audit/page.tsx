'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ArrowRight,
  Loader2,
  Truck,
  User,
  MapPin,
  Clock,
  ArrowLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Phone,
  Calendar,
  X,
  FileCheck,
  Receipt,
  Ban,
  MessageSquare,
  Zap,
  Filter,
  MoreVertical,
  Download,
  CreditCard,
  CheckSquare
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { createJournalEntry } from '@/lib/finance/journaling';

const CostAuditPage = () => {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('new_request');
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);
  
  useEffect(() => {
    if (profile?.tenant_id) {
      fetchData();
    }
  }, [profile?.tenant_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: tenantJos, error: joIdError } = await supabase
        .from('job_orders')
        .select('id')
        .eq('tenant_id', profile?.tenant_id);

      if (joIdError) throw joIdError;
      const tenantJoIds = tenantJos.map(j => j.id);

      if (tenantJoIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const { data: costs, error: costsError } = await supabase
        .from('extra_costs')
        .select('*')
        .neq('status', 'draft')
        .in('jo_id', tenantJoIds)
        .order('created_at', { ascending: false });

      if (costsError) throw costsError;

      const joIds = Array.from(new Set(costs.map(c => c.jo_id)));
      // [AI] Added driver_share_percentage, driver_id, fleet_id for internal profit-sharing model
      const { data: jos, error: josError } = await supabase
        .from('job_orders')
        .select(`
          id, jo_number, base_price, purchase_price, driver_phone, pod_status, status, created_at,
          driver_share_percentage, driver_id, fleet_id,
          is_doc_finished, is_cost_finished, pod_photo_url, advance_receipt_url, transfer_proof_url,
          md_drivers!fk_job_orders_md_driver(id, name, phone),
          md_fleets:fleet_id(id, plate_number, fleet_type:md_fleet_types!fleet_type_id(type_name)),
          wo_item:wo_items(
            id, item_data,
            wo:work_orders(
              id, wo_number,
              customer:md_entities!customer_id(name, legal_name, billing_method, phone)
            )
          )
        `)
        .eq('tenant_id', profile?.tenant_id)
        .in('status', ['pekerjaan selesai', 'PEKERJAAN SELESAI', 'completed', 'COMPLETED', 'done', 'DONE', 'awaiting_audit', 'AWAITING_AUDIT', 'ready_for_billing', 'READY_FOR_BILLING', 'invoiced', 'INVOICED', 'paid', 'PAID']);

      if (josError) throw josError;

      const normalizedJos = (jos || []).map(jo => {
        const woItem = Array.isArray(jo.wo_item) ? jo.wo_item[0] : jo.wo_item;
        const wo = woItem ? (Array.isArray(woItem.wo) ? woItem.wo[0] : woItem.wo) : null;
        return { ...jo, wo_item: woItem ? { ...woItem, wo } : null };
      });

      const seen = new Set();
      const hydratedCosts = costs
        .filter(c => Number(c.amount) > 0 && c.cost_type)
        .filter(c => {
          const key = `${c.jo_id}-${c.cost_type}-${c.amount}-${c.created_at}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(cost => ({
          ...cost,
          billing_proof_url: cost.description?.startsWith('http') ? cost.description : null,
          job_orders: normalizedJos.find(j => j.id === cost.jo_id) || null
        }));

      // Add dummy costs for SBU processing visibility
      const sbuProcessingJos = normalizedJos.filter(jo => 
         ['pekerjaan selesai', 'PEKERJAAN SELESAI', 'completed', 'COMPLETED', 'done', 'DONE'].includes(jo.status?.toUpperCase() || '') &&
         (!jo.is_doc_finished || !jo.is_cost_finished)
      );

      const sbuDummies = sbuProcessingJos.map(jo => ({
         id: `dummy-${jo.id}`,
         jo_id: jo.id,
         status: 'sbu_processing',
         amount: 0,
         cost_type: 'PENDING_SBU_SUBMISSION',
         name: 'Waiting for SBU to finalize Doc & Cost',
         created_at: jo.created_at,
         billing_proof_url: null,
         job_orders: jo
      }));

      // Add dummy costs for jobs awaiting audit but have no extra costs
      const auditJos = normalizedJos.filter(jo => 
         ['AWAITING_AUDIT', 'READY_FOR_BILLING', 'READY_TO_PAY'].includes(jo.status?.toUpperCase() || '') &&
         jo.is_doc_finished && jo.is_cost_finished &&
         !hydratedCosts.some(c => c.jo_id === jo.id)
      );

      const auditDummies = auditJos.map(jo => ({
         id: `audit-${jo.id}`,
         jo_id: jo.id,
         status: jo.status?.toUpperCase() === 'AWAITING_AUDIT' ? 'need_approval' : 'approved',
         amount: 0,
         cost_type: 'BASE_COST_AUDIT',
         name: 'Document & Base Cost Audit',
         created_at: jo.created_at,
         billing_proof_url: null,
         job_orders: jo
      }));

      setData([...hydratedCosts, ...sbuDummies, ...auditDummies]);
    } catch (err: any) {
      toast.error('Gagal mengambil data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (itemId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const item = data.find(d => d.id === itemId);
      if (!item) return;

      let finalStatus: any = newStatus;
      let isBillable = newStatus === 'approved';
      let paidBySbu = false;

      if (newStatus === 'rejected') {
        const confirmPaid = window.confirm('Apakah biaya ini SUDAH DIBAYAR?\n\nOK = Sudah Bayar (Masuk COGS)\nCancel = Belum Bayar (Reject Murni)');
        if (confirmPaid) {
          finalStatus = 'rejected_as_cogs';
          paidBySbu = true;
          isBillable = false;
        }
      }
      
      const { error } = await supabase
        .from('extra_costs')
        .update({ 
          status: finalStatus,
          is_billable: isBillable,
          paid_by_sbu: paidBySbu,
          decided_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      if (isBillable || paidBySbu) {
        await createJournalEntry({
          jobOrderId: item.jo_id,
          amount: item.amount,
          description: `${isBillable ? 'Approved' : 'Rejected (COGS)'} Add Cost ${item.cost_type}: ${item.job_orders?.jo_number}`,
          sourceType: (isBillable ? (item.charge_type === 'surcharge' ? 'surcharge' : 'reimbursement') : 'cogs_adjustment') as any,
          metadata: { jo_id: item.jo_id, customer: item.job_orders?.wo_item?.wo?.customer?.name }
        });
      }

      toast.success(`Biaya diproses sebagai ${finalStatus.toUpperCase()}`);
      fetchData();
    } catch (err) {
      toast.error('Gagal memproses data audit');
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', maximumFractionDigits: 0
    }).format(amount);
  };

  const groupedData = useMemo(() => {
    const groups: Record<string, any> = {};
    data.forEach(item => {
      const wo = item.job_orders?.wo_item?.wo;
      if (!wo) return;
      const woId = wo.id;
      
      if (!groups[woId]) {
        groups[woId] = { 
          wo: wo, 
          costs: [], 
          wo_id: woId,
          jo_map: {}
        };
      }
      
      groups[woId].costs.push(item);
      
      if (!groups[woId].jo_map[item.jo_id]) {
        groups[woId].jo_map[item.jo_id] = { jo: item.job_orders, costs: [] };
      }
      groups[woId].jo_map[item.jo_id].costs.push(item);
    });

    return Object.values(groups)
      .map((group: any) => {
        let totalRevenue = 0;
        let totalCogs = 0;
        let totalApprovedSurcharges = 0;
        let totalDriverShareAmount = 0;
        let totalApprovedExtraCosts = 0;
        
        const joList = Object.values(group.jo_map) as any[];
        
        joList.forEach((joGroup: any) => {
          const basePrice = Number(joGroup.jo?.base_price || 0);
          const dealPrice = Number(joGroup.jo?.wo_item?.item_data?.deal_price || 0);
          const effectiveRevenue = basePrice > 0 ? basePrice : dealPrice;
          
          const approvedSurcharges = joGroup.costs.reduce((sum: number, c: any) => sum + (c.status === 'approved' && c.charge_type === 'surcharge' ? Number(c.amount) : 0), 0);
          const joRevenue = effectiveRevenue + approvedSurcharges;
          
          const driverSharePct = Number(joGroup.jo?.driver_share_percentage || 40);
          const driverShareAmount = effectiveRevenue * (driverSharePct / 100);
          
          const approvedExtraCosts = joGroup.costs.reduce((sum: number, c: any) => sum + ((c.status === 'approved' || c.status === 'rejected_as_cogs') && (c.paid_by_sbu || c.charge_type === 'reimbursement') ? Number(c.amount) : 0), 0);
          const joCogs = driverShareAmount + approvedExtraCosts;
          
          totalRevenue += joRevenue;
          totalCogs += joCogs;
          totalApprovedSurcharges += approvedSurcharges;
          totalDriverShareAmount += driverShareAmount;
          totalApprovedExtraCosts += approvedExtraCosts;
          
          joGroup.margin = { revenue: joRevenue, cogs: joCogs, driverShareAmount, approvedExtraCosts, driverSharePct };
        });

        const grossMargin = totalRevenue - totalCogs;
        const marginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
        
        group.jo_list = joList;

        return {
          ...group,
          margin: { 
            revenue: totalRevenue, cogs: totalCogs, absolute: grossMargin, percent: marginPercent,
            driverShareAmount: totalDriverShareAmount, approvedExtraCosts: totalApprovedExtraCosts
          }
        };
      })
      .filter((group: any) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term || group.wo?.wo_number?.toLowerCase().includes(term) || group.wo?.customer?.name?.toLowerCase().includes(term);
        
        let matchesStatus = false;
        if (statusFilter === 'all') matchesStatus = true;
        else if (statusFilter === 'sbu_processing') matchesStatus = group.costs.some((c: any) => c.status === 'sbu_processing');
        else if (statusFilter === 'new_request') matchesStatus = group.costs.some((c: any) => c.status === 'need_approval');
        else if (statusFilter === 'audit_done') matchesStatus = group.costs.some((c: any) => c.status === 'approved') && !group.costs.some((c: any) => c.status === 'need_approval' || c.status === 'sbu_processing');
        else if (statusFilter === 'paid') matchesStatus = group.costs.every((c: any) => c.paid_by_sbu || c.status === 'rejected_as_cogs' || c.status === 'paid');

        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => {
        const aNeeds = a.costs.some((c: any) => c.status === 'need_approval');
        const bNeeds = b.costs.some((c: any) => c.status === 'need_approval');
        if (aNeeds && !bNeeds) return -1;
        if (!aNeeds && bNeeds) return 1;
        return 0;
      });
  }, [data, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const pending = groupedData.filter(g => g.costs.some((c: any) => c.status === 'need_approval')).length;
    const totalApproved = data.filter(d => d.status === 'approved').reduce((sum, d) => sum + Number(d.amount), 0);
    const podReady = groupedData.filter(g => g.jo_list.every((j: any) => j.jo?.pod_status === 'received_hq')).length;
    return { pending, totalApproved, podReady, total: groupedData.length };
  }, [groupedData, data]);

  const selectedWo = selectedWoId ? groupedData.find(g => g.wo_id === selectedWoId) : null;

  if (selectedWoId && selectedWo) {
    return (
      <div className="min-h-screen bg-indigo-50/50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Detail Header */}
        <div className="bg-white border-b border-indigo-100 px-8 py-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSelectedWoId(null)}
              className="w-12 h-12 rounded-2xl bg-indigo-50/80 flex items-center justify-center text-indigo-500 hover:bg-slate-200 hover:text-indigo-950 transition-all"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-indigo-950 tracking-tighter italic uppercase">{selectedWo.wo?.wo_number}</h1>
                <Badge className="bg-indigo-50 text-indigo-600 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                  Audit Hub
                </Badge>
              </div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Reviewing Additional Charges for Customer Billing</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="ghost" className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center transition-all border border-slate-700 shadow-lg shadow-slate-900/20">
                <Download size={16} className="mr-2" /> Export PDF
             </Button>
          </div>
        </div>

        <div className="flex-1 p-8 lg:p-12 overflow-y-auto">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left Col: Customer & JO Info */}
            <div className="lg:col-span-2 space-y-8">
               <Card className="rounded-[2rem] border-none shadow-sm shadow-slate-200/50 p-6 lg:p-8 bg-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  
                  <div className="relative">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-8 italic">
                      <User size={14} /> Customer Profile
                    </p>
                    
                    <div className="flex items-center justify-between mb-10">
                       <div>
                          <h2 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter mb-2 leading-none">
                            {selectedWo.wo?.customer?.legal_name || selectedWo.wo?.customer?.name || '---'}
                          </h2>
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate">
                               <MapPin size={12} className="text-indigo-500 flex-shrink-0" /> 
                               {selectedWo.jo_list[0]?.jo?.wo_item?.item_data?.origin_name || selectedWo.jo_list[0]?.jo?.wo_item?.item_data?.shipper_name || selectedWo.jo_list[0]?.jo?.wo_item?.item_data?.shipper_city || 'Origin'} 
                               → 
                               {selectedWo.jo_list[0]?.jo?.wo_item?.item_data?.destination_name || selectedWo.jo_list[0]?.jo?.wo_item?.item_data?.recipient_name || selectedWo.jo_list[0]?.jo?.wo_item?.item_data?.recipient_city || 'Dest'}
                               {selectedWo.jo_list[0]?.jo?.wo_item?.item_data?.locations?.length > 2 && (
                                 <span className="text-orange-500 italic ml-1 whitespace-nowrap">({selectedWo.jo_list[0]?.jo?.wo_item?.item_data?.locations?.length} Stops)</span>
                               )}
                            </span>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <a 
                            href={`https://wa.me/${selectedWo.wo?.customer?.phone?.replace(/\D/g, '')}`}
                            target="_blank"
                            className="w-14 h-14 rounded-2xl bg-emerald-900/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-900/40 border border-emerald-500/30 transition-all shadow-sm"
                          >
                             <MessageSquare size={24} />
                          </a>
                          <a 
                            href={`tel:${selectedWo.wo?.customer?.phone}`}
                            className="w-14 h-14 rounded-2xl bg-indigo-900/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-900/40 border border-indigo-500/30 transition-all shadow-sm"
                          >
                             <Phone size={24} />
                          </a>
                       </div>
                    </div>

                    
                    <div className="pt-8 border-t border-indigo-50/30 space-y-4">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic mb-4">Job Order Missions</p>
                       {selectedWo.jo_list.map((joGroup: any) => (
                         <div key={joGroup.jo.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-indigo-50/30 p-4 rounded-3xl border border-indigo-50">
                           <div className="col-span-1">
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic mb-1">{joGroup.jo.jo_number}</p>
                             <p className="font-black text-indigo-950 uppercase italic text-xs">{joGroup.jo.md_drivers?.name || 'No Driver'}</p>
                           </div>
                           <div className="col-span-1">
                             <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Bagi Hasil ({joGroup.margin.driverSharePct}%)</p>
                             <p className="font-black text-emerald-700 italic text-xs">{formatRupiah(joGroup.margin.driverShareAmount)}</p>
                           </div>
                           <div className="col-span-2">
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic">Fleet</p>
                             <p className="font-black text-indigo-800 uppercase italic text-xs">{joGroup.jo.md_fleets?.plate_number || 'N/A'} — {joGroup.jo.md_fleets?.fleet_type?.type_name || 'N/A'}</p>
                           </div>
                           <div className="col-span-4 mt-2 pt-2 border-t border-indigo-100/50 flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                             {joGroup.jo.pod_photo_url && joGroup.jo.pod_photo_url.length > 5 ? (() => {
                               try {
                                 const urls = JSON.parse(joGroup.jo.pod_photo_url);
                                 if (Array.isArray(urls)) {
                                   return urls.map((u: string, idx: number) => (
                                     <a key={idx} href={u} target="_blank" className="bg-white border border-indigo-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 whitespace-nowrap shadow-sm">
                                        <FileCheck size={12} /> SBU Doc {idx+1}
                                     </a>
                                   ));
                                 }
                                 return <a href={joGroup.jo.pod_photo_url} target="_blank" className="bg-white border border-indigo-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 whitespace-nowrap shadow-sm"><FileCheck size={12} /> SBU Document</a>;
                               } catch (e) {
                                 return <a href={joGroup.jo.pod_photo_url} target="_blank" className="bg-white border border-indigo-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 whitespace-nowrap shadow-sm"><FileCheck size={12} /> SBU Document</a>;
                               }
                             })() : <span className="text-[9px] text-slate-400 italic flex items-center gap-1"><FileCheck size={12}/> No POD Docs</span>}
                             
                             {joGroup.jo.advance_receipt_url && (
                               <a href={joGroup.jo.advance_receipt_url} target="_blank" className="bg-white border border-indigo-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-amber-600 hover:bg-amber-50 flex items-center gap-2 whitespace-nowrap shadow-sm"><Receipt size={12} /> Uang Jalan Proof</a>
                             )}
                             {joGroup.jo.transfer_proof_url && (
                               <a href={joGroup.jo.transfer_proof_url} target="_blank" className="bg-white border border-indigo-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 whitespace-nowrap shadow-sm"><Receipt size={12} /> Pelunasan Proof</a>
                             )}
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>

               </Card>

               <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <h3 className="text-sm font-black text-indigo-950 uppercase tracking-tighter italic">Reviewable Items</h3>
                    <div className="flex items-center gap-4">
                      {selectedWo.costs.filter((c: any) => c.status === 'need_approval').length > 1 && (
                         <Button onClick={async () => {
                             try {
                               const pendingCosts = selectedWo.costs.filter((c: any) => c.status === 'need_approval');
                               const updates = pendingCosts.map((c: any) => 
                                 supabase.from('extra_costs').update({ status: 'approved', is_billable: true, decided_at: new Date().toISOString() }).eq('id', c.id)
                               );
                               await Promise.all(updates);
                               toast.success('Semua item di-approve secara massal');
                               fetchData();
                             } catch(err) { toast.error('Gagal bulk approve'); }
                         }} className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest px-4 shadow-sm shadow-emerald-500/20">
                            Approve All Pending
                         </Button>
                      )}
                      <Badge className="bg-indigo-50/80 text-indigo-400 border-none font-black text-[10px]">{selectedWo.costs.length} Items</Badge>
                    </div>
                  </div>

                  {selectedWo.costs.map((item: any) => (
                    <Card key={item.id} className="rounded-3xl border border-indigo-50 shadow-sm p-5 lg:p-6 group hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-300">
                       <div className="flex flex-col lg:flex-row items-center gap-6">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                             <div>
                                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-2 italic">Category / Description</p>
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 bg-indigo-50/50 rounded-xl flex items-center justify-center text-indigo-400">
                                      <Zap size={20} />
                                   </div>
                                   <div>
                                      <p className="font-black text-indigo-900 uppercase italic leading-none">{item.cost_type.replace(/_/g, ' ')}</p>
                                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">{item.name || 'No Description Provided'}</p>
                                   </div>
                                </div>
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-2 italic">Value (IDR)</p>
                                <p className="text-xl font-black text-indigo-950 tracking-tighter italic">{formatRupiah(item.amount)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className={`border-none font-black text-[8px] uppercase ${item.charge_type === 'surcharge' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {item.charge_type || 'REIMBURSEMENT'}
                                  </Badge>
                                </div>
                             </div>
                          </div>

                          <div className="flex items-center gap-3 min-w-[320px]">
                             {item.billing_proof_url ? (
                               <a href={item.billing_proof_url} target="_blank" className="w-14 h-14 bg-indigo-900/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center hover:bg-indigo-900/40 transition-all">
                                  <Eye size={22} />
                               </a>
                             ) : (
                               <div className="w-14 h-14 bg-indigo-50/50 text-indigo-200 rounded-2xl flex items-center justify-center">
                                  <Ban size={22} />
                               </div>
                             )}

                             {item.status === 'need_approval' ? (
                               <>
                                 <Button 
                                   onClick={() => handleAction(item.id, 'approved')}
                                   className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                                 >
                                   Approve
                                 </Button>
                                 <Button 
                                   onClick={() => handleAction(item.id, 'rejected')}
                                   className="w-14 h-14 bg-rose-900/20 text-rose-400 border border-rose-500/30 hover:bg-rose-900/40 rounded-2xl flex items-center justify-center transition-all"
                                 >
                                   <X size={24} />
                                 </Button>
                               </>
                             ) : (
                               <div className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest ${
                                 item.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50/80 text-indigo-500'
                               }`}>
                                 {item.status === 'approved' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                 {item.status.replace(/_/g, ' ')}
                               </div>
                             )}
                          </div>
                       </div>
                    </Card>
                  ))}
               </div>
            </div>

            {/* Right Col: Margin & Audit Results */}
            <div className="space-y-6">
               <Card className="bg-indigo-50 border border-indigo-200 rounded-[2rem] p-6 lg:p-8 text-indigo-900 overflow-hidden relative shadow-sm">
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-200/40 rounded-full -mb-16 -mr-16 blur-2xl"></div>
                  
                  <div className="relative space-y-8">
                     <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-6 italic">Profitability Outlook</p>
                        <div className="flex justify-between items-end mb-4">
                           <div>
                              <p className="text-3xl font-black italic tracking-tighter leading-none text-indigo-950">
                                 {selectedWo.margin.percent.toFixed(0)}<span className="text-xl text-indigo-500">%</span>
                              </p>
                              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2 italic">Est. Gross Margin</p>
                           </div>
                           <Badge className={`border-none font-black text-[9px] px-3 py-1 rounded-full ${
                              selectedWo.margin.percent >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                           }`}>
                              {selectedWo.margin.percent >= 20 ? 'OPTIMAL' : 'LOW MARGIN'}
                           </Badge>
                        </div>
                        <div className="h-1.5 w-full bg-indigo-200/50 rounded-full overflow-hidden">
                           <div 
                              className={`h-full ${selectedWo.margin.percent >= 20 ? 'bg-emerald-500' : 'bg-rose-500'} transition-all duration-1000`} 
                              style={{ width: `${Math.min(100, selectedWo.margin.percent)}%` }}
                           />
                        </div>
                     </div>

                     <div className="space-y-4 pt-8 border-t border-indigo-200/50">
                        <div className="flex justify-between items-center">
                           <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Base Revenue</p>
                           <p className="font-black italic text-indigo-950">{formatRupiah(selectedWo.margin.revenue)}</p>
                        </div>
                        <div className="flex justify-between items-center">
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Driver Share ({selectedWo.margin.driverSharePct}%)</p>
                           <p className="font-black italic text-emerald-700">{formatRupiah(selectedWo.margin.driverShareAmount)}</p>
                        </div>
                        {selectedWo.margin.approvedExtraCosts > 0 && (
                        <div className="flex justify-between items-center">
                           <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Extra Costs</p>
                           <p className="font-black italic text-amber-600">{formatRupiah(selectedWo.margin.approvedExtraCosts)}</p>
                        </div>
                        )}
                        <div className="flex justify-between items-center">
                           <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Total COGS</p>
                           <p className="font-black italic text-rose-700">{formatRupiah(selectedWo.margin.cogs)}</p>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-indigo-200/50">
                           <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">Net Margin</p>
                           <p className="text-xl font-black italic text-emerald-600 tracking-tighter">{formatRupiah(selectedWo.margin.absolute)}</p>
                        </div>
                     </div>
                  </div>
               </Card>

               <Card className="rounded-[2rem] border border-indigo-50 shadow-sm p-6 lg:p-8 bg-white space-y-6">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 italic">Audit Checklist</p>
                    <div className="space-y-4">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedWo.jo_list.every((j: any) => j.jo?.pod_status === 'received_hq') ? 'bg-emerald-50 text-emerald-500' : 'bg-indigo-50/50 text-indigo-200'}`}>
                             <FileCheck size={18} />
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-indigo-950 uppercase">POD Verification</p>
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                               {selectedWo.jo_list.every((j: any) => j.jo?.pod_status === 'received_hq') ? 'Complete' : 'Pending Physical Document'}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedWo.costs.every((c: any) => c.status !== 'need_approval') ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500 animate-pulse'}`}>
                             <ShieldCheck size={18} />
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-indigo-950 uppercase">Financial Clearance</p>
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                               {selectedWo.costs.every((c: any) => c.status !== 'need_approval') ? 'All Costs Processed' : 'Action Required'}
                             </p>
                          </div>
                       </div>
                    </div>
                  </div>

                  <Button 
                    disabled={selectedWo.costs.some((c: any) => c.status === 'need_approval')}
                    onClick={async () => {
                       try {
                          const results = await Promise.all(selectedWo.jo_list.map((jo: any) => supabase.from('job_orders').update({ status: 'ready_for_billing' }).eq('id', jo.jo.id)));
                          const hasError = results.some(r => r.error);
                          if (hasError) throw new Error('Gagal memperbarui status');
                          toast.success('Audit Selesai. Job Order siap untuk Invoicing.');
                          setSelectedWoId(null); fetchData();
                       } catch (err) { toast.error('Gagal memperbarui status'); }
                    }}
                    className="w-full h-14 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3 border border-slate-700"
                  >
                    FINALIZE AUDIT <ArrowRight size={16} />
                  </Button>
               </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50/50 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
         {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card className="rounded-3xl border border-indigo-50 shadow-sm p-6 bg-white group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                 <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <Clock size={20} />
                 </div>
                 <Badge className="bg-amber-50 text-amber-600 border-none">Active</Badge>
              </div>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic mb-1">Pending Audit</p>
              <h3 className="text-3xl font-black text-indigo-950 italic tracking-tighter">{stats.pending}</h3>
           </Card>
           <Card className="rounded-3xl border border-indigo-50 shadow-sm p-6 bg-white group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                 <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <TrendingUp size={20} />
                 </div>
                 <Badge className="bg-indigo-50 text-indigo-600 border-none">Total</Badge>
              </div>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic mb-1">Approved Extra</p>
              <h3 className="text-2xl font-black text-indigo-950 italic tracking-tighter truncate">{formatRupiah(stats.totalApproved)}</h3>
           </Card>
           <Card className="rounded-3xl border border-indigo-50 shadow-sm p-6 bg-white group hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                 <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                    <FileCheck size={20} />
                 </div>
                 <Badge className="bg-emerald-50 text-emerald-600 border-none">Doc Health</Badge>
              </div>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest italic mb-1">POD Received HQ</p>
              <h3 className="text-3xl font-black text-indigo-950 italic tracking-tighter">{stats.podReady} <span className="text-xs text-indigo-300">/ {stats.total}</span></h3>
           </Card>
           <Card className="rounded-3xl border border-indigo-200 shadow-sm p-6 bg-indigo-50 text-indigo-900 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-200/50 blur-xl rounded-full -mr-10 -mt-10 transition-all"></div>
              <div className="relative">
                 <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5 italic">
                    <ShieldCheck size={14} /> Audit Command
                 </p>
                 <p className="text-[10px] font-black text-indigo-800 uppercase leading-relaxed mb-5">Verify all mission charges to clear for penagihan.</p>
                 <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 font-black text-[9px] uppercase tracking-widest h-10 rounded-xl border border-slate-700 shadow-lg shadow-slate-900/20">View Summary</Button>
              </div>
           </Card>
        </div>

        {/* Header & Filter */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-sm -rotate-3 border border-indigo-200">
              <CreditCard size={24} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none mb-1">FINANCE AUDIT</h1>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-1.5 italic">
                <Filter size={14} /> Verification & Clearance Hub
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
             <div className="relative group min-w-[300px]">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by JO# or Customer..."
                  className="h-16 w-full bg-white rounded-3xl pl-16 pr-8 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-slate-200/50 border-none focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div className="flex items-center gap-2 bg-white p-2 rounded-[2rem] shadow-lg shadow-slate-200/50 border border-indigo-50/30">
                {[
                  { id: 'sbu_processing', label: 'DOC PENDING' },
                  { id: 'new_request', label: 'Pending Audit' },
                  { id: 'audit_done', label: 'Ready to Pay' },
                  { id: 'paid', label: 'Settled / Paid' },
                  { id: 'all', label: 'All Bills' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-6 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === tab.id ? 'bg-slate-900 text-white shadow-lg border border-slate-700' : 'text-slate-500 hover:text-indigo-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-8">
           {loading ? (
             <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic animate-pulse">Fetching Mission Data...</p>
             </div>
           ) : groupedData.length === 0 ? (
             <Card className="h-[400px] rounded-[3rem] border-2 border-dashed border-indigo-100 bg-white flex flex-col items-center justify-center group overflow-hidden relative">
                <div className="absolute inset-0 bg-indigo-50/50/50 group-hover:scale-105 transition-transform duration-1000"></div>
                <ShieldCheck size={64} className="text-indigo-200 mb-6 relative" />
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest relative">Clearance Status: 100% Clean</p>
             </Card>
           ) : (
             <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {groupedData.map((group: any) => (
                  <Card 
                    key={group.wo_id} 
                    onClick={() => setSelectedWoId(group.wo_id)}
                    className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/60 bg-white hover:scale-[1.01] hover:shadow-indigo-500/10 transition-all cursor-pointer group overflow-hidden"
                  >
                    <div className="flex flex-col lg:flex-row min-h-[160px]">
                       <div className="flex-1 p-6 flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform ${
                             group.costs.some((c: any) => c.status === 'need_approval') ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
                          }`}>
                             {group.costs.some((c: any) => c.status === 'need_approval') ? <Clock size={28} /> : <CheckCircle2 size={28} />}
                          </div>
                          
                          <div className="flex-1">
                             <div className="flex items-center gap-3 mb-3">
                                <h2 className="text-xl font-black text-indigo-950 italic tracking-tighter uppercase leading-none">{group.wo?.wo_number}</h2>
                                {group.costs.some((c: any) => c.status === 'sbu_processing') ? (
                                   <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] px-3 py-1">WAITING DOC/COST SBU</Badge>
                                ) : group.costs.some((c: any) => c.status === 'need_approval') ? (
                                   <Badge className="bg-amber-100 text-amber-600 border-none font-black text-[9px] px-3 py-1 animate-pulse">PENDING REVIEW ({group.costs.filter((c: any) => c.status === 'need_approval').length})</Badge>
                                ) : statusFilter === 'paid' ? (
                                   <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] px-3 py-1">PAID & SETTLED</Badge>
                                ) : (
                                   <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[9px] px-3 py-1">READY TO PAY</Badge>
                                )}
                                {group.costs.some((c: any) => c.status === 'need_approval' && (Date.now() - new Date(c.created_at).getTime() > 2 * 24 * 60 * 60 * 1000)) && (
                                   <Badge className="bg-rose-100 text-rose-600 border-none font-black text-[8px] uppercase px-2 shadow-sm animate-pulse"><AlertCircle size={10} className="mr-1 inline"/> AGING &gt; 2 DAYS</Badge>
                                )}
                             </div>
                             
                             <div className="flex flex-wrap items-center gap-8">
                                <div>
                                   <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest italic mb-2">Customer / Client</p>
                                   <p className="text-lg font-black text-indigo-800 italic uppercase leading-none">{group.wo?.customer?.legal_name || group.wo?.customer?.name || '---'}</p>
                                </div>
                                <div className="h-10 w-[1px] bg-indigo-50/80 hidden md:block"></div>
                                <div>
                                   <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest italic mb-2">Operational Route</p>
                                   <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic flex items-center gap-2">
                                      {group.jo_list[0]?.jo?.wo_item?.item_data?.origin_name || group.jo_list[0]?.jo?.wo_item?.item_data?.shipper_name || group.jo_list[0]?.jo?.wo_item?.item_data?.shipper_city || 'Origin'} 
                                      <ArrowRight size={10} className="flex-shrink-0" /> 
                                      {group.jo_list[0]?.jo?.wo_item?.item_data?.destination_name || group.jo_list[0]?.jo?.wo_item?.item_data?.recipient_name || group.jo_list[0]?.jo?.wo_item?.item_data?.recipient_city || 'Dest'}
                                   </p>
                                   {group.jo_list[0]?.jo?.wo_item?.item_data?.locations?.length > 2 && (
                                     <p className="text-[8px] font-bold text-orange-500 uppercase tracking-widest italic mt-1">Multi-Stop ({group.jo_list[0]?.jo?.wo_item?.item_data?.locations?.length} Stops)</p>
                                   )}
                                </div>
                                <div className="h-10 w-[1px] bg-indigo-50/80 hidden md:block"></div>
                                <div>
                                   <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest italic mb-2">Est. Margin</p>
                                   <p className={`text-xl font-black italic ${group.margin.percent >= 20 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                      {group.margin.percent.toFixed(1)}%
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="w-full lg:w-72 bg-indigo-50/50/50 p-6 flex flex-col justify-center gap-5 group-hover:bg-indigo-50/30 transition-colors border-l border-indigo-50/30">
                          <div className="flex items-center justify-between px-1">
                             <div>
                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest italic mb-0.5">Parent Work Order</p>
                                <p className="text-xs font-black text-indigo-950 italic uppercase">{(group.jo_list.length + " Missions") || '---'}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest italic mb-0.5">Execution Date</p>
                                <p className="text-xs font-black text-indigo-950 italic">{group.costs[0]?.created_at ? new Date(group.costs[0].created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '---'}</p>
                             </div>
                          </div>
                          <Button className="h-12 w-full bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-all border border-slate-700">
                             Audit Mission <ChevronRight size={14} />
                          </Button>
                       </div>
                    </div>
                  </Card>
                ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default CostAuditPage;
