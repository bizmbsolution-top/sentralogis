'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  BarChart3, TrendingUp, Star, MapPin, Users, Award, 
  ChevronDown, ChevronRight, X, Loader2, Search, Filter,
  ArrowUpRight, ArrowDownRight, Eye, AlertTriangle,
  Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: string;
  has_native_app: boolean;
  last_app_open_at: string | null;
  total_km_driven: number;
  total_distance_km: number;
  total_jobs_completed: number;
  total_reviews: number;
  avg_review_score: number;
  photo_url: string;
  md_entities: { name: string };
}

interface DriverGpsQuality {
  driver_id: string;
  quality_score: number;
  avg_interval_sec: number | null;
  coverage_pct: number;
  last_gps_age_min: number;
  total_pings: number;
  gps_source: string | null;
}

interface PerfLog {
  id: string;
  driver_id: string;
  job_order_id: string;
  type: 'KM_LOG' | 'SAFETY_INCIDENT' | 'REVIEW';
  total_km: number;
  review_score: number;
  review_notes: string;
  created_at: string;
  job_orders: { jo_number: string; status: string };
}

export default function SBUDriverPerformancePage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'performance' | 'attendance'>('performance');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [perfLogs, setPerfLogs] = useState<PerfLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverLogs, setDriverLogs] = useState<PerfLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'km' | 'review' | 'jobs'>('km');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [selectedAttendanceDriver, setSelectedAttendanceDriver] = useState<any>(null);
  const [selectedDriverHistory, setSelectedDriverHistory] = useState<any[]>([]);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(false);
  // GPS quality state
  const [gpsQualityMap, setGpsQualityMap] = useState<Map<string, DriverGpsQuality>>(new Map());

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('md_drivers')
        .select('*, md_entities(name)')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);
      
      if (error) throw error;
      setDrivers(data || []);

      const driverIds = (data || []).map(d => d.id);
      if (driverIds.length > 0) {
        const { data: logs, error: logError } = await supabase
          .from('driver_performance_logs')
          .select('*, job_orders!driver_performance_logs_job_order_id_fkey(jo_number, status)')
          .in('driver_id', driverIds)
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (!logError) setPerfLogs(logs || []);
      } else {
        setPerfLogs([]);
      }

      // Fetch GPS quality data
      const { data: gpsData, error: gpsError } = await supabase
        .rpc('calc_tenant_gps_quality', { p_tenant_id: profile.tenant_id });
      
      if (!gpsError && gpsData) {
        const map = new Map<string, DriverGpsQuality>();
        (gpsData as DriverGpsQuality[]).forEach((item) => map.set(item.driver_id, item));
        setGpsQualityMap(map);
      }
    } catch (error: any) {
      toast.error('Gagal mengambil data performance');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadDriverLogs = async (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDetailModal(true);
    setLoadingLogs(true);

    try {
      const { data, error } = await supabase
        .from('driver_performance_logs')
        .select('*, job_orders!driver_performance_logs_job_order_id_fkey(jo_number, status)')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDriverLogs(data || []);
    } catch (error: any) {
      toast.error('Gagal mengambil log performance');
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchAttendanceData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setAttendanceLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: internalDrivers, error: drvErr } = await supabase
        .from('md_drivers')
        .select('id, name, phone, status, entity_id, is_working, md_entities!inner(name, is_vendor)')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .eq('md_entities.is_vendor', false)
        .not('entity_id', 'is', null);
      if (drvErr) throw drvErr;
      const driverIds = (internalDrivers || []).map(d => d.id);
      if (driverIds.length === 0) { setAttendanceData([]); setAttendanceLoading(false); return; }
      const [attRes, inspRes] = await Promise.all([
        supabase.from('driver_attendance')
          .select('id, driver_id, fleet_id, check_in, status, md_fleets(plate_number)')
          .in('driver_id', driverIds)
          .gte('check_in', today)
          .order('check_in', { ascending: false }),
        supabase.from('fleet_inspections')
          .select('id, driver_id, total_score, status, created_at, md_fleets(plate_number)')
          .in('driver_id', driverIds)
          .gte('created_at', today)
          .order('created_at', { ascending: false }),
      ]);
      const attMap: Record<string, any> = {};
      (attRes.data || []).forEach(a => { if (!attMap[a.driver_id]) attMap[a.driver_id] = a; });
      const inspMap: Record<string, any> = {};
      (inspRes.data || []).forEach(i => { if (!inspMap[i.driver_id]) inspMap[i.driver_id] = i; });
      const merged = (internalDrivers || []).map(d => ({
        ...d,
        attendance: attMap[d.id] || null,
        inspection: inspMap[d.id] || null,
      }));
      setAttendanceData(merged);
    } catch (err: any) {
      console.error('Fetch attendance error:', err);
    } finally {
      setAttendanceLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const loadDriverAttendanceHistory = async (driver: any) => {
    setSelectedAttendanceDriver(driver);
    setShowAttendanceModal(true);
    setAttendanceHistoryLoading(true);
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [attHist, inspHist] = await Promise.all([
        supabase.from('driver_attendance')
          .select('*, md_fleets(plate_number)')
          .eq('driver_id', driver.id)
          .gte('check_in', sevenDaysAgo)
          .order('check_in', { ascending: false }),
        supabase.from('fleet_inspections')
          .select('*, md_fleets(plate_number)')
          .eq('driver_id', driver.id)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false }),
      ]);
      const grouped: Record<string, any> = {};
      const allDates = new Set<string>();
      (attHist.data || []).forEach(a => { const d = a.check_in?.split('T')[0]; if (d) { allDates.add(d); if (!grouped[d]) grouped[d] = {}; grouped[d].attendance = a; } });
      (inspHist.data || []).forEach(i => { const d = i.created_at?.split('T')[0]; if (d) { allDates.add(d); if (!grouped[d]) grouped[d] = {}; grouped[d].inspection = i; } });
      const history = Array.from(allDates).sort().reverse().map(date => ({ date, ...grouped[date] }));
      setSelectedDriverHistory(history);
    } catch (err: any) {
      console.error('Load history error:', err);
    } finally {
      setAttendanceHistoryLoading(false);
    }
  };

  const getSortedDrivers = () => {
    const sorted = [...drivers].filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    switch (sortBy) {
      case 'km':
        sorted.sort((a, b) => (b.total_km_driven || 0) - (a.total_km_driven || 0));
        break;
      case 'review':
        sorted.sort((a, b) => (b.avg_review_score || 0) - (a.avg_review_score || 0));
        break;
      case 'jobs':
        sorted.sort((a, b) => (b.total_jobs_completed || 0) - (a.total_jobs_completed || 0));
        break;
    }

    return sorted;
  };

  const totalKM = drivers.reduce((sum, d) => sum + (d.total_km_driven || 0), 0);
  const avgReview = drivers.filter(d => d.total_reviews > 0).reduce((sum, d, _, arr) => 
    sum + (d.avg_review_score || 0) / arr.length, 0
  );
  const topDrivers = [...drivers].sort((a, b) => (b.total_km_driven || 0) - (a.total_km_driven || 0)).slice(0, 3);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Available</span>;
      case 'on_duty': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">On Duty</span>;
      case 'unavailable': return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">Unavailable</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">{status}</span>;
    }
  };

  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            size={12}
            className={i <= Math.round(score) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
          />
        ))}
        <span className="ml-1 text-xs font-medium text-slate-600">{score.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <BarChart3 size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Performance Analytics</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Driver Performance</h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="flex bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('performance')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'performance'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Performance
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'attendance'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Attendance
              </button>
            </div>

            <div className="relative group w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search driver..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'performance' && <>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <MapPin size={20} className="text-blue-600" />
            </div>
            <ArrowUpRight size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalKM.toLocaleString('id-ID', { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-slate-500">km</span></p>
          <p className="text-xs text-slate-500 mt-1">Total Distance All Drivers</p>
        </Card>

        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <Star size={20} className="text-amber-500" />
            </div>
            <span className="text-xs font-medium text-slate-500">{drivers.filter(d => d.total_reviews > 0).length} rated</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{avgReview.toFixed(1)} <span className="text-sm font-normal text-slate-500">/ 5.0</span></p>
          <p className="text-xs text-slate-500 mt-1">Average Review Score</p>
        </Card>

        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{drivers.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active Drivers</p>
        </Card>

        <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Award size={20} className="text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{topDrivers[0]?.name?.split(' ')[0] || '-'}</p>
          <p className="text-xs text-slate-500 mt-1">Top Driver ({(topDrivers[0]?.total_km_driven || 0).toLocaleString('id-ID')} km)</p>
        </Card>
      </div>

      {/* Sort Controls */}
      <div className="max-w-7xl mx-auto mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 border-r border-slate-200">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Sort by:</span>
        </div>
        {[
          { key: 'km' as const, label: 'Distance' },
          { key: 'review' as const, label: 'Review Score' },
          { key: 'jobs' as const, label: 'Jobs Completed' }
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sortBy === opt.key 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Driver List */}
      <div className="max-w-7xl mx-auto">
        <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Driver</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-center">App</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-center">GPS</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Distance (km)</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Jobs</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Reviews</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                      <p className="text-xs text-slate-400">Loading performance data...</p>
                    </td>
                  </tr>
                ) : getSortedDrivers().length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <p className="text-xs text-slate-400">No drivers found</p>
                    </td>
                  </tr>
                ) : (
                  getSortedDrivers().map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {d.photo_url ? (
                            <img src={d.photo_url} alt={d.name} className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                              {d.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900">{d.name}</div>
                            <div className="text-xs text-slate-400">{d.md_entities?.name || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(d.status)}</td>
                      <td className="px-4 py-3 text-center">
                        {d.has_native_app ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Installed</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">PWA</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const gps = gpsQualityMap.get(d.id);
                          if (!gps || gps.total_pings === 0) {
                            return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">No Data</span>;
                          }
                          const isStale = gps.last_gps_age_min > 60;
                          const quality = gps.quality_score;
                          let colorClass = 'bg-emerald-100 text-emerald-700';
                          if (quality < 50) colorClass = 'bg-amber-100 text-amber-700';
                          if (quality < 30) colorClass = 'bg-rose-100 text-rose-700';
                          return (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`px-2 py-0.5 ${colorClass} text-[10px] font-bold rounded-full`}>
                                {gps.gps_source === 'native_android' ? 'Native' : 'PWA'}
                              </span>
                              {isStale && <span className="text-[9px] text-rose-500 font-medium">Stale</span>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          {(d.total_km_driven || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">km</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-slate-700">{d.total_jobs_completed || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.total_reviews > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            {renderStars(d.avg_review_score || 0)}
                            <span className="text-xs text-slate-400 ml-1">({d.total_reviews})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No reviews</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => loadDriverLogs(d)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      </>}

      {/* ===== ATTENDANCE TAB ===== */}
      {activeTab === 'attendance' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{attendanceData.length}</p>
              <p className="text-xs text-slate-500 mt-1">Total Driver Internal</p>
            </Card>
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CheckCircle size={20} className="text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{attendanceData.filter(d => d.attendance).length}</p>
              <p className="text-xs text-slate-500 mt-1">Absen Hari Ini</p>
            </Card>
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Clock size={20} className="text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{attendanceData.filter(d => d.inspection).length}</p>
              <p className="text-xs text-slate-500 mt-1">Inspeksi Hari Ini</p>
            </Card>
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                  <XCircle size={20} className="text-rose-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {attendanceData.filter(d => d.inspection?.status === 'GROUNDED').length}
              </p>
              <p className="text-xs text-slate-500 mt-1">GROUNDED</p>
            </Card>
          </div>

          <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Driver</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Plat Truk</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Absen</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Inspeksi</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                        <p className="text-xs text-slate-400">Loading attendance data...</p>
                      </td>
                    </tr>
                  ) : attendanceData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <p className="text-xs text-slate-400">Tidak ada driver internal</p>
                      </td>
                    </tr>
                  ) : (
                    attendanceData.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase())).map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                              {d.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{d.name}</div>
                              <div className="text-xs text-slate-400">{d.md_entities?.name || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {d.status === 'on_duty' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">On Duty</span>
                          ) : d.status === 'on_road' ? (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">On Road</span>
                          ) : d.status === 'unavailable' ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">Unavailable</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Available</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-700">{d.attendance?.md_fleets?.plate_number || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          {d.attendance ? (
                            <div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.attendance.status === 'CHECK_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {d.attendance.status === 'CHECK_IN' ? 'CHECK IN' : 'CHECK OUT'}
                              </span>
                              <div className="text-[10px] font-medium text-slate-500 mt-1.5 ml-1">
                                {new Date(d.attendance.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Belum absen</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {d.inspection ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${d.inspection.status === 'LAYAK JALAN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {d.inspection.status === 'LAYAK JALAN' ? 'Layak' : 'Grounded'}
                              </span>
                              <span className="text-[10px] text-slate-400">({d.inspection.total_score})</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Belum inspeksi</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => loadDriverAttendanceHistory(d)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="Lihat Riwayat"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Attendance Detail Modal */}
      {showAttendanceModal && selectedAttendanceDriver && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                  {selectedAttendanceDriver.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedAttendanceDriver.name}</h2>
                  <p className="text-xs text-slate-500">{selectedAttendanceDriver.md_entities?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Riwayat 7 Hari Terakhir</h3>
              {attendanceHistoryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
              ) : selectedDriverHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">Belum ada riwayat absen atau inspeksi</p>
              ) : (
                <div className="space-y-3">
                  {selectedDriverHistory.map((day: any) => (
                    <div key={day.date} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-slate-900">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {day.date === new Date().toISOString().split('T')[0] && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Hari Ini</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Absen</p>
                          {day.attendance ? (
                            <div className="flex items-center gap-2">
                              {day.attendance.status === 'CHECK_IN' ? (
                                <CheckCircle size={14} className="text-emerald-500" />
                              ) : (
                                <XCircle size={14} className="text-rose-500" />
                              )}
                              <span className={`text-xs ${day.attendance.status === 'CHECK_IN' ? 'text-slate-700' : 'text-rose-600 font-medium'}`}>
                                {day.attendance.status === 'CHECK_IN' ? 'CHECK IN' : 'CHECK OUT'} ({new Date(day.attendance.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}) - {day.attendance.md_fleets?.plate_number || '-'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle size={14} className="text-slate-300" />
                              <span className="text-xs text-slate-400">Tidak absen</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Inspeksi</p>
                          {day.inspection ? (
                            <div className="flex items-center gap-2">
                              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${day.inspection.status === 'LAYAK JALAN' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              </div>
                              <span className={`text-xs font-medium ${day.inspection.status === 'LAYAK JALAN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {day.inspection.status} ({day.inspection.total_score})
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle size={14} className="text-slate-300" />
                              <span className="text-xs text-slate-400">Tidak inspeksi</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Performance Detail Modal */}
      {showDetailModal && selectedDriver && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                {selectedDriver.photo_url ? (
                  <img src={selectedDriver.photo_url} alt={selectedDriver.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600">
                    {selectedDriver.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedDriver.name}</h2>
                  <p className="text-xs text-slate-500">{selectedDriver.md_entities?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-100">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{(selectedDriver.total_km_driven || 0).toLocaleString('id-ID', { maximumFractionDigits: 1 })}</p>
                <p className="text-xs text-slate-500">Total KM</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900">{selectedDriver.total_jobs_completed || 0}</p>
                <p className="text-xs text-slate-500">Jobs Done</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-2xl font-bold text-slate-900">{selectedDriver.avg_review_score?.toFixed(1) || '-'}</p>
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                </div>
                <p className="text-xs text-slate-500">{selectedDriver.total_reviews || 0} reviews</p>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Performance History</h3>
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
              ) : driverLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No performance logs yet</p>
              ) : (
                <div className="space-y-3">
                  {driverLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        log.type === 'KM_LOG' ? 'bg-blue-100' : 
                        log.type === 'REVIEW' ? 'bg-amber-100' : 'bg-rose-100'
                      }`}>
                        {log.type === 'KM_LOG' ? <MapPin size={14} className="text-blue-600" /> :
                         log.type === 'REVIEW' ? <Star size={14} className="text-amber-500" /> :
                         <AlertTriangle size={14} className="text-rose-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {log.job_orders?.jo_number || 'Unknown Job'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">
                            {log.type === 'KM_LOG' ? `${log.total_km} km` : 
                             log.type === 'REVIEW' ? `${log.review_score}/5` : 'Incident'}
                          </span>
                        </div>
                        {log.review_notes && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{log.review_notes}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
