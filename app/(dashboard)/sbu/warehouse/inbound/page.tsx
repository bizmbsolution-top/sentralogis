'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  DownloadCloud, Search, Plus, Loader2, ArrowRight, Truck, ClipboardCheck,
  PackageCheck, CheckCircle2, PackageX, AlertTriangle, User, MapPin
} from 'lucide-react';
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
  status: string;
  expected_arrival: string;
  transporter: { name: string } | null;
  fleet: { plate_number: string } | null;
  driver: { name: string } | null;
  created_at: string;
  items_count: number;
}

export default function InboundReceivingPage() {
  const { profile, loading: loadingAuth } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  
  const [receipts, setReceipts] = useState<InboundReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  // Fetch Warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      if (!tenantId) return;
      const { data } = await supabase
        .from('md_warehouses')
        .select('id, name, code')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
        
      if (data && data.length > 0) {
        setWarehouses(data);
        setSelectedWarehouseId(data[0].id); // Auto select first
      }
    };
    fetchWarehouses();
  }, [tenantId]);

  const fetchReceipts = useCallback(async () => {
    if (!tenantId || !selectedWarehouseId) return;
    setLoading(true);

    try {
      let query = supabase
        .from('wh_inbound_receipts')
        .select(`
          id, receipt_number, status, expected_arrival, created_at,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name)
        `)
        .eq('tenant_id', tenantId)
        .eq('warehouse_id', selectedWarehouseId)
        .order('created_at', { ascending: false });

      if (activeTab !== 'ALL') {
        query = query.eq('status', activeTab);
      }

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

      setReceipts(enrichedData);
    } catch (error: any) {
      toast.error('Gagal mengambil data Inbound');
    } finally {
      setLoading(false);
    }
  }, [tenantId, selectedWarehouseId, activeTab]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string, text: string, icon: any, label: string }> = {
      'EXPECTED': { bg: 'bg-slate-100', text: 'text-slate-600', icon: DownloadCloud, label: 'Expected' },
      'TRUCK_ARRIVED': { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: Truck, label: 'Arrived' },
      'UNLOADING': { bg: 'bg-amber-100', text: 'text-amber-700', icon: Loader2, label: 'Unloading' },
      'CHECKING': { bg: 'bg-blue-100', text: 'text-blue-700', icon: ClipboardCheck, label: 'Checking' },
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

  const filteredReceipts = receipts.filter(r => 
    r.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (r.transporter?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DownloadCloud className="text-blue-600" size={24} />
            Inbound Receiving
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola proses penerimaan barang dari truk hingga putaway.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <MapPin size={16} className="text-slate-400" />
            <select 
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="text-sm font-bold text-slate-900 bg-transparent outline-none cursor-pointer"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>[{w.code}] {w.name}</option>
              ))}
              {warehouses.length === 0 && <option value="">No Warehouse Found</option>}
            </select>
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-medium text-sm shadow-sm shadow-blue-600/20 active:scale-95">
            <Plus size={18} />
            Create Receipt
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Card className="p-2 border-slate-200 shadow-none overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {['ALL', 'EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64 px-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search receipt..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all"
            />
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
                    {receipt.receipt_number}
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
