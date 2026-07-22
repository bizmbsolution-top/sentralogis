'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  CloudDownload, Search, Plus, Loader2, ArrowRight, Truck, ClipboardCheck,
  PackageCheck, CheckCircle2, PackageX, AlertTriangle, User, MapPin,
  MessageSquare, X
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import ReceiptDetailModal from './components/ReceiptDetailModal';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface InboundReceipt {
  id: string;
  receipt_number: string;
  wo_id: string;
  status: string;
  client_id: string;
  client_name?: string;
  warehouse_id: string;
  warehouse_name?: string;
  expected_arrival?: string;
  notes?: string;
  created_at: string;
  wo_number?: string;
  items_count?: number;
  transporter: { name: string } | null;
  fleet: { plate_number: string } | null;
  driver: { name: string } | null;
}

export default function InboundReceivingPage() {
  const { profile, loading: loadingAuth } = useAuth();
  const searchParams = useSearchParams();

  const [tenantId, setTenantId] = useState<string | null>(null);
  
  const [receipts, setReceipts] = useState<InboundReceipt[]>([]);
  const [allReceipts, setAllReceipts] = useState<InboundReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  const fetchReceipts = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      let whId = profile?.warehouse_id;
      const { data: whData } = await supabase.from('md_warehouses').select('id, name').eq('tenant_id', tenantId);
      if (whData) setWarehouses(whData);

      if (!whId) {
        if (selectedWarehouse) {
          whId = selectedWarehouse;
        } else if (whData && whData.length > 0) {
          whId = whData[0].id;
          setSelectedWarehouse(whId);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setSelectedWarehouse(whId);
      }

      const query = supabase
        .from('wh_inbound_receipts')
        .select(`
          id, receipt_number, status, expected_arrival, created_at,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('warehouse_id', whId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // In a real scenario we'd do a subquery or join for items count. For now, mocking items_count.
      const enrichedData = data.map(item => ({
        ...item,
        transporter: item.transporter as any,
        fleet: item.fleet as any,
        driver: item.driver as any,
        items_count: 0 // Will populate inside detail modal
      })) as InboundReceipt[];

      setAllReceipts(enrichedData);
      
      if (activeTab === 'ALL') {
        setReceipts(enrichedData);
      } else {
        setReceipts(enrichedData.filter(r => r.status === activeTab));
      }
    } catch (error: any) {
      toast.error('Gagal mengambil data Inbound');
    } finally {
      setLoading(false);
    }
  }, [tenantId, profile?.warehouse_id, activeTab, selectedWarehouse]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  useEffect(() => {
    if (activeTab === 'ALL') {
      setReceipts(allReceipts);
    } else {
      setReceipts(allReceipts.filter(r => r.status === activeTab));
    }
  }, [activeTab, allReceipts]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'create' && allReceipts.length > 0 && !isDetailModalOpen) {
      const target = allReceipts.find(r => r.status === 'EXPECTED' || r.status === 'TRUCK_ARRIVED' || r.status === 'UNLOADING') || allReceipts[0];
      if (target) {
        setSelectedReceiptId(target.id);
        setIsDetailModalOpen(true);
      }
    }
  }, [searchParams, allReceipts]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string, text: string, icon: any, label: string }> = {
      'EXPECTED': { bg: 'bg-slate-100', text: 'text-slate-600', icon: CloudDownload, label: 'Expected' },
      'TRUCK_ARRIVED': { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Truck, label: 'Arrived' },
      'UNLOADING': { bg: 'bg-amber-100', text: 'text-amber-700', icon: Loader2, label: 'Unloading' },
      'CHECKING': { bg: 'bg-blue-100', text: 'text-blue-700', icon: ClipboardCheck, label: 'Checking' },
      'CHECKING_DONE': { bg: 'bg-teal-100', text: 'text-teal-700', icon: ClipboardCheck, label: 'Review' },
      'PUTAWAY_IN_PROGRESS': { bg: 'bg-purple-100', text: 'text-purple-700', icon: PackageCheck, label: 'Putaway' },
      'COMPLETED': { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2, label: 'Completed' },
    };
    const s = map[status] || map['EXPECTED'];
    const Icon = s.icon;
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.bg} ${s.text} text-[10px] font-bold uppercase tracking-wider`}>
        <Icon size={12} className={status === 'UNLOADING' ? 'animate-spin' : ''} />
        {s.label}
      </div>
    );
  };

  const filteredReceipts = receipts.filter(r => {
    if (searchTerm && !(
      r.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (r.transporter?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )) return false;
    if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <CloudDownload className="text-blue-600" size={24} />
              Inbound Receiving
            </h1>
            <p className="text-sm text-slate-500 mt-1">Kelola proses penerimaan barang dari truk hingga putaway.</p>
          </div>
          {!profile?.warehouse_id && warehouses.length > 0 && (
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="ml-4 px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          )}
        </div>
        <button className="flex items-center bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold gap-2 hover:bg-slate-800 transition-colors">
          <Plus size={16} /> New Inbound
        </button>
      </div>

      {/* Tabs & Filters */}
      <Card className="p-3 md:p-4 border-slate-200 shadow-none overflow-hidden">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
            {['ALL', 'EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING', 'CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].map(tab => {
              const count = tab === 'ALL' ? allReceipts.length : allReceipts.filter(r => r.status === tab).length;
              return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap min-h-[40px] flex items-center gap-2 ${
                  activeTab === tab 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.replace(/_/g, ' ')}
                <span className={`px-2 py-0.5 rounded-md text-[10px] ${
                  activeTab === tab 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-slate-200 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            )})}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
              />
              <span className="text-slate-400 text-xs">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className="p-2.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search receipt..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Grid List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Memuat data Inbound...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 border-dashed border-2 shadow-none">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <PackageX className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Tidak ada Receipt</h3>
          <p className="text-slate-500 text-sm">Belum ada jadwal inbound untuk status ini.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredReceipts.map((receipt) => (
            <Card 
              key={receipt.id} 
              className="p-5 border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex flex-col"
              onClick={() => { setSelectedReceiptId(receipt.id); setIsDetailModalOpen(true); }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-mono font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                    {receipt.receipt_number?.replace(/^RCV-/, '')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                    {new Date(receipt.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {getStatusBadge(receipt.status)}
              </div>

              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <Truck size={12} className="text-slate-400" />
                  </div>
                  <span className="font-medium text-slate-700 truncate">
                    {receipt.transporter?.name || 'TBA'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <User size={12} className="text-slate-400" />
                  </div>
                  <span className="text-slate-600 truncate">
                    {receipt.driver?.name || 'Driver TBA'} {receipt.fleet?.plate_number ? `(${receipt.fleet.plate_number})` : ''}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>ETA: {receipt.expected_arrival ? new Date(receipt.expected_arrival).toLocaleDateString('id-ID') : '-'}</span>
                <div className="flex items-center gap-1 text-blue-600 group-hover:translate-x-1 transition-transform">
                  Process <ArrowRight size={14} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedReceiptId && (
        <ReceiptDetailModal 
          receiptId={selectedReceiptId} 
          onClose={() => { setIsDetailModalOpen(false); setSelectedReceiptId(null); fetchReceipts(); }} 
        />
      )}
    </div>
  );
}
