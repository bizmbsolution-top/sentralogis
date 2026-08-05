'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Truck, Settings, AlertTriangle, CheckCircle2, 
  X, Loader2, Search, Filter, Wrench, Calendar,
  ShieldAlert, BadgeCheck, MapPin, Clock, Gauge,
  Power, PowerOff, Wifi, WifiOff, Car, Pause, Anchor
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Fleet {
  id: string;
  fleet_code: string;
  plate_number: string;
  db_status: string;
  brand: string;
  model: string;
  live_status: string;
  engine_status: string;
  speed: number;
  last_seen: string | null;
  last_address: string | null;
  active_jo_count: number;
  active_jos: Array<{ id: string; jo_number: string; status: string }>;
}

interface FleetSummary {
  total: number;
  driving: number;
  idle: number;
  parking: number;
  no_signal: number;
  stale: number;
  engine_on: number;
  on_job: number;
}

interface Inspection {
  id: string;
  created_at: string;
  total_score: number;
  status: string;
  notes: string;
  rem_ok: boolean;
  rem_notes: string;
  lampu_ok: boolean;
  lampu_notes: string;
  ban_ok: boolean;
  ban_notes: string;
  wiper_ok: boolean;
  wiper_notes: string;
  kemudi_ok: boolean;
  kemudi_notes: string;
  is_resolved: boolean;
  resolved_at: string;
  resolved_notes: string;
  md_fleets: { id: string; plate_number: string };
  md_drivers: { name: string };
}

const LIVE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Car }> = {
  DRIVING: { label: 'On Road', color: 'text-blue-700', bg: 'bg-blue-100', icon: Car },
  IDLE: { label: 'Idle', color: 'text-amber-700', bg: 'bg-amber-100', icon: Pause },
  PARKING: { label: 'Parking', color: 'text-slate-700', bg: 'bg-slate-100', icon: Anchor },
  STALE: { label: 'Stale (>30m)', color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
  NO_SIGNAL: { label: 'No Signal', color: 'text-rose-700', bg: 'bg-rose-100', icon: WifiOff },
};

const DB_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  on_road: { label: 'On Road', color: 'text-blue-700', bg: 'bg-blue-50' },
  on_duty: { label: 'On Duty', color: 'text-blue-700', bg: 'bg-blue-50' },
  maintenance: { label: 'Maintenance', color: 'text-rose-700', bg: 'bg-rose-50' },
};

export default function FleetPerformancePage() {
  const { profile } = useAuth();
  
  // Fleet status state
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary | null>(null);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetFilter, setFleetFilter] = useState<string>('ALL');

  // Inspection state
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'GROUNDED' | 'LAYAK JALAN'>('ALL');
  
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'live' | 'inspections'>('live');

  const fetchFleetStatus = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setFleetLoading(true);
    try {
      const res = await fetch(`/api/fleet-status?tenant_id=${profile.tenant_id}`);
      const data = await res.json();
      if (data.success) {
        setFleets(data.fleets);
        setFleetSummary(data.summary);
      }
    } catch (error: any) {
      console.error('Failed to fetch fleet status:', error);
    } finally {
      setFleetLoading(false);
    }
  }, [profile?.tenant_id]);

  const fetchInspections = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fleet_inspections')
        .select('*, md_fleets(id, plate_number), md_drivers(name)')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInspections(data || []);
    } catch (error: any) {
      toast.error('Gagal mengambil data inspeksi');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchFleetStatus();
    fetchInspections();
    // Auto-refresh fleet status every 60 seconds
    const interval = setInterval(fetchFleetStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchFleetStatus, fetchInspections]);

  const handleResolveSubmit = async () => {
    if (!selectedInspection) return;
    if (!resolveNotes.trim()) {
      toast.error('Catatan perbaikan wajib diisi');
      return;
    }
    
    setResolving(true);
    try {
      const { error: updateError } = await supabase
        .from('fleet_inspections')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_notes: resolveNotes
        })
        .eq('id', selectedInspection.id);
        
      if (updateError) throw updateError;

      if (selectedInspection.md_fleets?.id) {
        await supabase
          .from('md_fleets')
          .update({ status: 'available' })
          .eq('id', selectedInspection.md_fleets.id);
      }

      toast.success('Laporan kerusakan berhasil ditandai sebagai diperbaiki!');
      setShowResolveModal(false);
      setResolveNotes('');
      setSelectedInspection(null);
      fetchInspections();
    } catch (error: any) {
      toast.error('Gagal menyimpan perbaikan: ' + error.message);
    } finally {
      setResolving(false);
    }
  };

  const getFilteredInspections = () => {
    let filtered = [...inspections];
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(i => i.status === filterStatus);
    }
    if (searchTerm) {
      filtered = filtered.filter(i => 
        i.md_fleets?.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.md_drivers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  const getFilteredFleets = () => {
    let filtered = [...fleets];
    if (fleetFilter !== 'ALL') {
      filtered = filtered.filter(f => f.live_status === fleetFilter);
    }
    if (fleetSearch) {
      filtered = filtered.filter(f =>
        f.plate_number?.toLowerCase().includes(fleetSearch.toLowerCase()) ||
        f.fleet_code?.toLowerCase().includes(fleetSearch.toLowerCase()) ||
        f.last_address?.toLowerCase().includes(fleetSearch.toLowerCase())
      );
    }
    return filtered;
  };

  const groundedCount = inspections.filter(i => i.status === 'GROUNDED' && !i.is_resolved).length;
  const avgScore = inspections.length > 0 
    ? inspections.reduce((sum, i) => sum + i.total_score, 0) / inspections.length 
    : 0;

  const getBrokenParts = (insp: Inspection) => {
    const parts = [];
    if (!insp.rem_ok) parts.push(`Rem: ${insp.rem_notes || 'Bermasalah'}`);
    if (!insp.lampu_ok) parts.push(`Lampu: ${insp.lampu_notes || 'Bermasalah'}`);
    if (!insp.ban_ok) parts.push(`Ban: ${insp.ban_notes || 'Bermasalah'}`);
    if (!insp.wiper_ok) parts.push(`Wiper: ${insp.wiper_notes || 'Bermasalah'}`);
    if (!insp.kemudi_ok) parts.push(`Kemudi: ${insp.kemudi_notes || 'Bermasalah'}`);
    return parts;
  };

  const formatLastSeen = (iso: string | null) => {
    if (!iso) return '—';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}d lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return `${Math.floor(diff / 86400)}h lalu`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Settings size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Maintenance & Inspections</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Fleet Performance</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
            {activeTab === 'live' ? (
              <div className="relative group w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari plat / kode / lokasi..." 
                  value={fleetSearch}
                  onChange={(e) => setFleetSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all outline-none"
                />
              </div>
            ) : (
              <div className="relative group w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari plat / nama driver..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 w-fit">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'live'
                ? 'bg-orange-100 text-orange-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Wifi size={16} /> Live Fleet Status
          </button>
          <button
            onClick={() => setActiveTab('inspections')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'inspections'
                ? 'bg-orange-100 text-orange-700'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Wrench size={16} /> Riwayat Inspeksi
          </button>
        </div>
      </div>

      {/* ===== LIVE FLEET STATUS TAB ===== */}
      {activeTab === 'live' && (
        <>
          {/* Summary Cards */}
          {fleetSummary && (
            <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <Card className="p-4 border border-slate-200 shadow-sm rounded-xl bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Truck size={16} className="text-slate-500" />
                </div>
                <p className="text-xl font-bold text-slate-900">{fleetSummary.total}</p>
                <p className="text-[10px] text-slate-500">Total Armada</p>
              </Card>

              <Card className="p-4 border border-blue-200 shadow-sm rounded-xl bg-blue-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Car size={16} className="text-blue-600" />
                </div>
                <p className="text-xl font-bold text-blue-700">{fleetSummary.driving}</p>
                <p className="text-[10px] text-blue-600">On Road</p>
              </Card>

              <Card className="p-4 border border-amber-200 shadow-sm rounded-xl bg-amber-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Pause size={16} className="text-amber-600" />
                </div>
                <p className="text-xl font-bold text-amber-700">{fleetSummary.idle}</p>
                <p className="text-[10px] text-amber-600">Idle</p>
              </Card>

              <Card className="p-4 border border-slate-200 shadow-sm rounded-xl bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Anchor size={16} className="text-slate-500" />
                </div>
                <p className="text-xl font-bold text-slate-700">{fleetSummary.parking}</p>
                <p className="text-[10px] text-slate-500">Parking</p>
              </Card>

              <Card className="p-4 border border-rose-200 shadow-sm rounded-xl bg-rose-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <WifiOff size={16} className="text-rose-600" />
                </div>
                <p className="text-xl font-bold text-rose-700">{fleetSummary.no_signal + fleetSummary.stale}</p>
                <p className="text-[10px] text-rose-600">No Signal / Stale</p>
              </Card>

              <Card className="p-4 border border-emerald-200 shadow-sm rounded-xl bg-emerald-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Power size={16} className="text-emerald-600" />
                </div>
                <p className="text-xl font-bold text-emerald-700">{fleetSummary.engine_on}</p>
                <p className="text-[10px] text-emerald-600">Mesin ON</p>
              </Card>
            </div>
          )}

          {/* Fleet Filter */}
          <div className="max-w-7xl mx-auto mb-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 border-r border-slate-200">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Status:</span>
            </div>
            {[
              { key: 'ALL', label: 'Semua' },
              { key: 'DRIVING', label: 'On Road' },
              { key: 'IDLE', label: 'Idle' },
              { key: 'PARKING', label: 'Parking' },
              { key: 'NO_SIGNAL', label: 'No Signal' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setFleetFilter(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  fleetFilter === opt.key
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Fleet List */}
          <div className="max-w-7xl mx-auto space-y-3">
            {fleetLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">Memuat status armada...</p>
              </div>
            ) : getFilteredFleets().length === 0 ? (
              <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
                <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">Tidak ada armada ditemukan</p>
                <p className="text-xs text-slate-400">Belum ada data GPS dari armada.</p>
              </div>
            ) : (
              getFilteredFleets().map((fleet) => {
                const liveCfg = LIVE_STATUS_CONFIG[fleet.live_status] || LIVE_STATUS_CONFIG.NO_SIGNAL;
                const dbCfg = DB_STATUS_CONFIG[fleet.db_status] || DB_STATUS_CONFIG.available;
                const LiveIcon = liveCfg.icon;
                
                return (
                  <Card key={fleet.id} className="p-4 border border-slate-200 shadow-sm rounded-xl bg-white hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                      {/* Fleet Icon + Plate */}
                      <div className="flex items-center gap-3 md:w-48 shrink-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${liveCfg.bg}`}>
                          <LiveIcon size={18} className={liveCfg.color} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{fleet.plate_number}</p>
                          <p className="text-[10px] text-slate-400">{fleet.fleet_code}</p>
                        </div>
                      </div>

                      {/* GPS Status */}
                      <div className="flex items-center gap-2 md:w-36">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${liveCfg.bg} ${liveCfg.color}`}>
                          {liveCfg.label}
                        </span>
                        {fleet.speed > 0 && (
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5">
                            <Gauge size={10} /> {Math.round(fleet.speed)} km/h
                          </span>
                        )}
                      </div>

                      {/* Engine Status */}
                      <div className="flex items-center gap-1.5 md:w-24">
                        {fleet.engine_status === 'ON' ? (
                          <Power size={14} className="text-emerald-600" />
                        ) : fleet.engine_status === 'OFF' ? (
                          <PowerOff size={14} className="text-slate-400" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                        )}
                        <span className={`text-xs font-medium ${
                          fleet.engine_status === 'ON' ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          Mesin {fleet.engine_status}
                        </span>
                      </div>

                      {/* DB Status */}
                      <div className="md:w-28">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${dbCfg.bg} ${dbCfg.color}`}>
                          {dbCfg.label}
                        </span>
                      </div>

                      {/* Active JO */}
                      <div className="md:w-24">
                        {fleet.active_jo_count > 0 ? (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700">
                            {fleet.active_jo_count} JO
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </div>

                      {/* Last Seen + Address */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                          <Clock size={10} />
                          {formatLastSeen(fleet.last_seen)}
                        </div>
                        {fleet.last_address && (
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <MapPin size={10} className="shrink-0" />
                            {fleet.last_address}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ===== INSPECTIONS TAB ===== */}
      {activeTab === 'inspections' && (
        <>
          {/* Summary Cards */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Truck size={20} className="text-indigo-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{inspections.length}</p>
              <p className="text-xs text-slate-500 mt-1">Total Inspeksi Tercatat</p>
            </Card>

            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center animate-pulse">
                  <ShieldAlert size={20} className="text-rose-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-600">{groundedCount}</p>
              <p className="text-xs text-slate-500 mt-1">Armada Rusak (Belum Diperbaiki)</p>
            </Card>

            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <BadgeCheck size={20} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{avgScore.toFixed(1)} <span className="text-sm font-normal text-slate-500">/ 100</span></p>
              <p className="text-xs text-slate-500 mt-1">Rata-rata Skor Kelayakan</p>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="max-w-7xl mx-auto mb-4 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 border-r border-slate-200">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Filter:</span>
            </div>
            {[
              { key: 'ALL' as const, label: 'Semua Inspeksi' },
              { key: 'GROUNDED' as const, label: 'Butuh Perbaikan' },
              { key: 'LAYAK JALAN' as const, label: 'Layak Jalan' }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilterStatus(opt.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === opt.key 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Inspections List */}
          <div className="max-w-7xl mx-auto space-y-4">
            {loading ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">Memuat data inspeksi armada...</p>
              </div>
            ) : getFilteredInspections().length === 0 ? (
              <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-600">Tidak ada riwayat inspeksi</p>
                <p className="text-xs text-slate-400">Data inspeksi dari driver belum tersedia.</p>
              </div>
            ) : (
              getFilteredInspections().map((insp) => {
                const brokenParts = getBrokenParts(insp);
                const isGrounded = insp.status === 'GROUNDED';
                
                return (
                  <Card key={insp.id} className={`p-5 border transition-all ${isGrounded && !insp.is_resolved ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-white'}`}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      
                      {/* Left: Basic Info */}
                      <div className="flex items-start gap-4 md:w-1/3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isGrounded ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {isGrounded ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black text-slate-900">{insp.md_fleets?.plate_number || 'Unknown'}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isGrounded ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              Skor: {insp.total_score}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1">
                            Inspektor: <span className="font-bold">{insp.md_drivers?.name || 'Driver'}</span>
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Calendar size={12} />
                            {new Date(insp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Damage Details */}
                      <div className="md:w-1/3 border-t md:border-t-0 md:border-l border-slate-200 md:px-6 pt-4 md:pt-0">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status & Laporan Kerusakan</h4>
                        {brokenParts.length > 0 ? (
                          <ul className="space-y-1.5">
                            {brokenParts.map((part, idx) => (
                              <li key={idx} className="text-xs text-rose-600 font-medium flex items-start gap-1.5">
                                <span className="shrink-0 mt-0.5">•</span>
                                <span>{part}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Semua sistem berfungsi normal
                          </p>
                        )}
                        {insp.notes && (
                          <div className="mt-3 bg-slate-100 p-2.5 rounded-lg text-xs text-slate-600 italic">
                            &quot;{insp.notes}&quot;
                          </div>
                        )}
                      </div>

                      {/* Right: Resolution Status */}
                      <div className="md:w-1/3 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 md:pl-6 pt-4 md:pt-0">
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tindakan Perbaikan</h4>
                          
                          {insp.is_resolved ? (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-1">
                                <CheckCircle2 size={14} /> Telah Diperbaiki
                              </p>
                              <p className="text-[10px] text-emerald-600 mb-1">
                                {new Date(insp.resolved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-xs text-slate-700 mt-2 font-medium">&quot;{insp.resolved_notes}&quot;</p>
                            </div>
                          ) : isGrounded ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                              <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-1">
                                <Wrench size={14} /> Menunggu Perbaikan
                              </p>
                              <p className="text-[10px] text-amber-600">Armada saat ini berstatus Grounded dan tidak dapat digunakan.</p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic">Tidak memerlukan perbaikan khusus.</p>
                          )}
                        </div>

                        {isGrounded && !insp.is_resolved && (
                          <button
                            onClick={() => { setSelectedInspection(insp); setShowResolveModal(true); }}
                            className="mt-4 w-full bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Wrench size={14} /> Tandai Telah Diperbaiki
                          </button>
                        )}
                      </div>

                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedInspection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Wrench size={18} className="text-orange-500" />
                Laporan Perbaikan Armada
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-xs text-slate-500 font-medium mb-1">Plat Armada</p>
                <p className="text-lg font-black text-slate-900">{selectedInspection.md_fleets?.plate_number}</p>
              </div>

              <div className="mb-5 p-3 bg-rose-50 rounded-lg border border-rose-100">
                <p className="text-xs text-rose-700 font-bold mb-1">Daftar Kerusakan:</p>
                <ul className="text-xs text-rose-600 space-y-1">
                  {getBrokenParts(selectedInspection).map((p, i) => <li key={i}>• {p}</li>)}
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Catatan Teknisi / Mekanik</label>
                <textarea
                  rows={4}
                  placeholder="Deskripsikan apa saja yang telah diganti atau diperbaiki..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleResolveSubmit}
                  disabled={resolving}
                  className="flex-1 py-3 bg-orange-500 text-white font-bold text-sm rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {resolving ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Simpan</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
