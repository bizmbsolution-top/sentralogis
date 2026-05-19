'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  Phone, 
  AlertTriangle,
  Truck,
  MapPin,
  Clock,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle,
  Camera,
  Gauge,
  X,
  ChevronRight,
  ChevronLeft,
  Package,
  Navigation,
  Play,
  User,
  FileCheck,
  Home,
  Settings,
  CreditCard,
  Building,
  Star,
  Zap,
  Activity,
  ExternalLink
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function DriverPortal() {
  const [step, setStep] = useState<'auth' | 'dashboard' | 'profile' | 'inspection' | 'jobDetail' | 'performance'>('auth');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driver, setDriver] = useState<any>(null);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [fleets, setFleets] = useState<any[]>([]);
  const [selectedFleetId, setSelectedFleetId] = useState('');
  const [activeShift, setActiveShift] = useState<any>(null);
  const [fetchingFleets, setFetchingFleets] = useState(false);

  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [inspectionData, setInspectionData] = useState({
    rem_ok: false,
    lampu_ok: false,
    ban_ok: false,
    wiper_ok: false,
    kemudi_ok: false,
    rem_notes: '',
    lampu_notes: '',
    ban_notes: '',
    wiper_notes: '',
    kemudi_notes: '',
    odometer_value: '',
    notes: ''
  });
  const [inspectionPhotos, setInspectionPhotos] = useState<{
    odometer?: string;
    rem?: string;
    lampu?: string;
    ban?: string;
    wiper?: string;
    kemudi?: string;
  }>({});
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [lastInspection, setLastInspection] = useState<any>(null);
  const [totalKM, setTotalKM] = useState<number>(0);

  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);

  useEffect(() => {
    if (step === 'dashboard' && isAttendanceModalOpen) fetchFleets();
  }, [step, isAttendanceModalOpen]);

  useEffect(() => {
    if (step === 'dashboard' && driver?.id) {
      fetchJobOrders();
      fetchActiveShift();
      fetchLastInspection();
      fetchTotalKM();
    }
    if (step === 'performance' && driver?.id) {
      fetchPerformanceData();
    }
  }, [step, driver]);

  useEffect(() => {
    if (step === 'dashboard' && isAttendanceModalOpen) fetchFleets();
  }, [step, isAttendanceModalOpen]);

  const fetchTotalKM = async () => {
    if (!driver?.id) return;
    
    const { data: completedJobs } = await supabase
      .from('job_orders')
      .select('id')
      .eq('driver_id', driver.id)
      .eq('status', 'SELESAI');
    
    if (completedJobs && completedJobs.length > 0) {
      const jobIds = completedJobs.map(j => j.id);
      
      const { data: routes } = await supabase
        .from('job_routes')
        .select('distance_km')
        .in('job_order_id', jobIds);
      
      if (routes) {
        const total = routes.reduce((sum: number, route: any) => sum + (Number(route.distance_km) || 0), 0);
        setTotalKM(total);
      }
    }
  };

  const fetchPerformanceData = async () => {
    if (!driver?.id) return;
    setPerformanceLoading(true);
    
    try {
      const { data: completedJobs } = await supabase
        .from('job_orders')
        .select('*, job_routes(distance_km), wo_items(item_code, item_data)')
        .eq('driver_id', driver.id)
        .in('status', ['SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI'])
        .order('completed_at', { ascending: false })
        .limit(50);
      
      setCompletedJobs(completedJobs || []);
      
      if (completedJobs && completedJobs.length > 0) {
        let totalDistance = 0;
        let totalEarnings = 0;
        
        for (const job of completedJobs) {
          const routeDist = job.job_routes?.reduce((sum: number, r: any) => sum + (Number(r.distance_km) || 0), 0) || 0;
          totalDistance += routeDist;
          
          const driverShare = Number(job.driver_payment_amount || job.wo_items?.item_data?.deal_price || 0);
          totalEarnings += driverShare;
        }
        
        setTotalKM(totalDistance);
      }
    } catch (err) {
      console.error('Error fetching performance data:', err);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchActiveShift = async () => {
    const { data } = await supabase
      .from('driver_attendance')
      .select('*, md_fleets(plate_number)')
      .eq('driver_id', driver.id)
      .eq('status', 'CHECK_IN')
      .order('check_in', { ascending: false })
      .limit(1)
      .single();
    if (data) setActiveShift({ ...data, fleet: data.md_fleets });
  };

  const fetchJobOrders = async () => {
    const { data } = await supabase
      .from('job_orders')
      .select('*, md_fleets(plate_number), wo_items(item_code, item_data)')
      .eq('driver_id', driver.id)
      .not('status', 'in', '("completed","done","SELESAI","PEKERJAAN SELESAI","paid","PAID")')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setJobOrders(data);
  };

  const fetchLastInspection = async () => {
    const { data } = await supabase
      .from('fleet_inspections')
      .select('*')
      .eq('driver_id', driver.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (data) setLastInspection(data);
  };

  const fetchFleets = async () => {
    if (!driver?.entity_id) {
      toast.error('Driver belum memiliki entity terkait');
      setFleets([]);
      return;
    }
    
    setFetchingFleets(true);
    
    // Get fleets that belong to the same entity (Internal/OWN)
    // and are available
    const { data, error } = await supabase
      .from('md_fleets')
      .select('id, plate_number, brand, model, status, md_entities(name, is_vendor)')
      .eq('entity_id', driver.entity_id)
      .eq('status', 'available')
      .eq('is_active', true)
      .order('plate_number');
    
    if (error) {
      console.error('Error fetching fleets:', error);
      toast.error('Gagal mengambil data armada');
      setFleets([]);
    } else {
      // Filter to only show internal/own fleets (is_vendor = false)
      const internalFleets = (data || []).filter((f: any) => !f.md_entities?.is_vendor);
      setFleets(internalFleets);
    }
    
    setFetchingFleets(false);
  };

  const handleStartShift = async () => {
    if (!selectedFleetId) {
      toast.error('Pilih armada terlebih dahulu');
      return;
    }
    setLoading(true);
    try {
      const { data: attendance, error: attError } = await supabase
        .from('driver_attendance')
        .insert([{ driver_id: driver.id, fleet_id: selectedFleetId, tenant_id: driver.tenant_id, status: 'CHECK_IN' }])
        .select()
        .single();
      if (attError) throw attError;

      // Update driver to working status and increment absensi
      const { data: driverData } = await supabase.from('md_drivers').select('total_absensi').eq('id', driver.id).single();
      await supabase.from('md_drivers').update({ 
        status: 'on_duty',
        is_working: true,
        last_check_in: new Date().toISOString(),
        total_absensi: (driverData?.total_absensi || 0) + 1
      }).eq('id', driver.id);

      // Update fleet to on_road
      await supabase.from('md_fleets').update({ status: 'on_road' }).eq('id', selectedFleetId);
      setActiveShift({ ...attendance, fleet: fleets.find(f => f.id === selectedFleetId) });
      setIsAttendanceModalOpen(false);
      toast.success('Shift dimulai! Selamat bertugas.');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectionSubmit = async () => {
    if (!activeShift?.fleet_id) {
      toast.error('Pilih armada terlebih dahulu');
      return;
    }
    setInspectionLoading(true);
    try {
      const totalScore = 
        (inspectionData.rem_ok ? 20 : 0) +
        (inspectionData.lampu_ok ? 20 : 0) +
        (inspectionData.ban_ok ? 20 : 0) +
        (inspectionData.wiper_ok ? 20 : 0) +
        (inspectionData.kemudi_ok ? 20 : 0);
      const status = totalScore >= 60 ? 'LAYAK JALAN' : 'GROUNDED';

      const { data, error } = await supabase
        .from('fleet_inspections')
        .insert({
          driver_id: driver.id,
          fleet_id: activeShift.fleet_id,
          tenant_id: driver.tenant_id,
          odometer_value: inspectionData.odometer_value ? parseFloat(inspectionData.odometer_value) : null,
          odometer_photo_url: inspectionPhotos.odometer || null,
          rem_ok: inspectionData.rem_ok,
          rem_notes: inspectionData.rem_notes || null,
          lampu_ok: inspectionData.lampu_ok,
          lampu_notes: inspectionData.lampu_notes || null,
          ban_ok: inspectionData.ban_ok,
          ban_notes: inspectionData.ban_notes || null,
          wiper_ok: inspectionData.wiper_ok,
          wiper_notes: inspectionData.wiper_notes || null,
          kemudi_ok: inspectionData.kemudi_ok,
          kemudi_notes: inspectionData.kemudi_notes || null,
          total_score: totalScore,
          status: status,
          notes: inspectionData.notes || null
        })
        .select()
        .single();
      if (error) throw error;

      // Update fleet status based on inspection result
      // [AI] FIX: Don't set to 'available' if driver has active shift with jobs
      let fleetStatus: string;
      if (status === 'GROUNDED') {
        fleetStatus = 'maintenance';
      } else {
        // Check if driver has active jobs
        const { data: activeJobs } = await supabase
          .from('job_orders')
          .select('id')
          .eq('driver_id', driver.id)
          .in('status', ['assigned', 'DITERIMA', 'STARTED', 'LOADING', 'UNLOADING', 'ON_ROAD'])
          .limit(1);
        
        // If has active jobs, keep as 'on_road'; otherwise 'available'
        fleetStatus = (activeJobs && activeJobs.length > 0) ? 'on_road' : 'available';
      }
      await supabase.from('md_fleets').update({ status: fleetStatus }).eq('id', activeShift.fleet_id);

      // Update last_inspection_date for daily tracking
      await supabase.from('md_fleets').update({ last_inspection_date: new Date().toISOString().split('T')[0] }).eq('id', activeShift.fleet_id);
      await supabase.from('md_drivers').update({ last_inspection_date: new Date().toISOString().split('T')[0] }).eq('id', driver.id);

      // Update driver inspection stats
      const { data: driverData } = await supabase.from('md_drivers').select('total_inspections, avg_inspection_score').eq('id', driver.id).single();
      const newTotalInspections = (driverData?.total_inspections || 0) + 1;
      const newAvgScore = ((driverData?.avg_inspection_score || 0) * (newTotalInspections - 1) + totalScore) / newTotalInspections;

      await supabase.from('md_drivers').update({
        total_inspections: newTotalInspections,
        avg_inspection_score: newAvgScore
      }).eq('id', driver.id);

      setLastInspection(data);
      setIsInspectionModalOpen(false);
      toast.success(status === 'LAYAK JALAN' ? 'Armada LAYAK JALAN!' : 'Armada di-GROUNDED - Armada dinonaktifkan');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setInspectionLoading(false);
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
    setLoading(true);
    try {
      const { data: job } = await supabase.from('job_orders').select('*, md_fleets(plate_number)').eq('id', jobId).single();
      
      await supabase.from('job_orders').update({ status: newStatus }).eq('id', jobId);
      
      // If job completed, update fleet and driver status
      if (newStatus === 'SELESAI' && job) {
        // Update fleet to available
        if (job.fleet_id) {
          await supabase.from('md_fleets').update({ status: 'available' }).eq('id', job.fleet_id);
        }
        
        // Update driver stats and mark as not working
        const { data: driverData } = await supabase.from('md_drivers').select('total_jobs_completed, total_km_driven, total_absensi').eq('id', driver.id).single();
        
        const newJobsCompleted = (driverData?.total_jobs_completed || 0) + 1;
        const estimatedKM = 50; // placeholder
        
        await supabase.from('md_drivers').update({
          total_jobs_completed: newJobsCompleted,
          total_km_driven: (driverData?.total_km_driven || 0) + estimatedKM,
          is_working: false,
          status: 'available'
        }).eq('id', driver.id);
        
        // Clear active shift
        setActiveShift(null);
      }
      
      toast.success('Status diperbarui');
      fetchJobOrders();
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(key);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${key}.${fileExt}`;
      const filePath = `inspections/${driver.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('driver-portal').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('driver-portal').getPublicUrl(filePath);
      setInspectionPhotos(prev => ({ ...prev, [key]: urlData.publicUrl }));
      toast.success('Photo uploaded!');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 3) document.getElementById(`pin-${index + 1}`)?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinString = pin.join('');
    if (whatsapp.length < 10 || pinString.length < 4) {
      toast.error('Masukkan nomor WA dan PIN yang valid');
      return;
    }
    setLoading(true);
    try {
      let normalizedWA = whatsapp.trim();
      if (normalizedWA.startsWith('0')) normalizedWA = '62' + normalizedWA.slice(1);
      
      console.log('Login attempt:', { whatsapp, normalizedWA, pin: pinString });
      
      const { data: driverData, error } = await supabase
        .from('md_drivers')
        .select('*')
        .eq('whatsapp', normalizedWA)
        .eq('pin', pinString)
        .single();
      
      console.log('Driver data:', { driverData, error });
      
      if (error || !driverData) {
        // Try original format
        const { data: driverOriginal } = await supabase
          .from('md_drivers')
          .select('*')
          .eq('whatsapp', whatsapp.trim())
          .eq('pin', pinString)
          .single();
        
        if (!driverOriginal) {
          toast.error('Nomor WA atau PIN salah');
          setLoading(false);
          return;
        }
        
        // Check if driver has active job - if not, reset status
        if (driverOriginal.is_working) {
          const { data: activeJobs } = await supabase
            .from('job_orders')
            .select('id')
            .eq('driver_id', driverOriginal.id)
            .in('status', ['DITERIMA', 'STARTED', 'LOADING', 'UNLOADING'])
            .limit(1);
          
          if (!activeJobs || activeJobs.length === 0) {
            await supabase.from('md_drivers').update({
              is_working: false,
              status: 'available'
            }).eq('id', driverOriginal.id)
            .neq('status', 'unavailable');
            driverOriginal.is_working = false;
            if (driverOriginal.status !== 'unavailable') {
              driverOriginal.status = 'available';
            }
          }
        }
        
        setDriver(driverOriginal);
        setStep('dashboard');
        toast.success(`Selamat datang, ${driverOriginal.name}!`);
        setLoading(false);
        return;
      }
      
      // Check if driver has active job - if not, reset status
      if (driverData.is_working) {
        const { data: activeJobs } = await supabase
          .from('job_orders')
          .select('id')
          .eq('driver_id', driverData.id)
          .in('status', ['DITERIMA', 'STARTED', 'LOADING', 'UNLOADING'])
          .limit(1);
        
        if (!activeJobs || activeJobs.length === 0) {
          await supabase.from('md_drivers').update({
            is_working: false,
            status: 'available'
          }).eq('id', driverData.id)
          .neq('status', 'unavailable');
          driverData.is_working = false;
          if (driverData.status !== 'unavailable') {
            driverData.status = 'available';
          }
        }
      }
      
      setDriver(driverData);
      setStep('dashboard');
      toast.success(`Selamat datang, ${driverData.name}!`);
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('Terjadi kesalahan: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 flex flex-col items-center justify-center p-6 font-sans text-white">
        <Toaster position="top-center" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -right-20 w-80 h-80 bg-white/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-amber-400/20 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <div className="w-28 h-28 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl border border-white/30">
              <ShieldCheck size={52} className="text-white" />
            </div>
            <h1 className="text-5xl font-black tracking-tight">SentraLogis</h1>
            <p className="text-sm text-white/70 font-bold mt-3 uppercase tracking-widest">Driver Portal</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white/15 backdrop-blur-2xl p-8 rounded-3xl border border-white/20 shadow-2xl">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-base font-bold text-white/80 uppercase tracking-wide">Nomor WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/50" />
                  <input 
                    type="tel"
                    placeholder="0812 3456 7890"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-white/20 border border-white/30 rounded-2xl py-5 pl-14 pr-4 text-xl font-bold placeholder:text-white/40 focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition-all text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-white/80 uppercase tracking-wide">PIN 4 Digit</label>
                  <button type="button" onClick={() => setShowPin(!showPin)} className="text-white/60 hover:text-white flex items-center gap-2 text-sm">
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showPin ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                </div>
                <div className="flex justify-between gap-4">
                  {[0, 1, 2, 3].map((idx) => (
                    <input
                      key={idx}
                      id={`pin-${idx}`}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      value={pin[idx]}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-full aspect-square bg-white/20 border border-white/30 rounded-2xl text-center text-2xl font-black focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition-all text-white placeholder:text-white/30"
                      maxLength={1}
                    />
                  ))}
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-indigo-600 hover:bg-white/90 disabled:opacity-50 py-4 rounded-2xl font-bold text-lg mt-8 shadow-lg shadow-black/20 flex items-center justify-center gap-3 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><ArrowRight size={20} /> Masuk Portal</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Profile View
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 pb-28">
        <Toaster position="top-center" />
        
        <div className="bg-white/10 backdrop-blur-xl p-6 min-h-screen">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setStep('dashboard')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white">Profil Driver</h2>
            <div className="w-10" />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col items-center mb-6">
              {driver?.photo_url ? (
                <img src={driver.photo_url} alt={driver.name} className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center border-4 border-indigo-50">
                  <User size={48} className="text-indigo-400" />
                </div>
              )}
              <h3 className="text-2xl font-black text-slate-800 mt-4">{driver?.name}</h3>
              <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">{driver?.status}</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Phone size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Telepon</p>
                  <p className="text-base font-bold text-slate-800">{driver?.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CreditCard size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">SIM</p>
                  <p className="text-base font-bold text-slate-800">{driver?.sim_number || '-'} <span className="text-xs text-slate-500">({driver?.sim_class})</span></p>
                  <p className="text-xs text-slate-400">Exp: {driver?.sim_expiry ? new Date(driver.sim_expiry).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Star size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Trust Score</p>
                  <p className="text-2xl font-black text-amber-600">{driver?.trust_score || 50}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-indigo-600">{driver?.total_jobs_completed || 0}</p>
                  <p className="text-xs font-bold text-indigo-400 uppercase">Job Selesai</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-green-600">{driver?.total_absensi || 0}</p>
                  <p className="text-xs font-bold text-green-400 uppercase">Absensi</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-orange-600">{Math.round(driver?.avg_inspection_score || 0)}%</p>
                  <p className="text-xs font-bold text-orange-400 uppercase">Score</p>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-blue-600">{totalKM > 0 ? totalKM.toFixed(1) : Number(driver?.total_km_driven || 0).toFixed(1)}</p>
                  <p className="text-xs font-bold text-blue-400 uppercase">Kilometer</p>
                </div>
              </div>

              {driver?.bank_name && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Rekening Bank</p>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="font-bold text-slate-800">{driver.bank_name}</p>
                    <p className="text-sm text-slate-600">{driver.bank_account}</p>
                    <p className="text-xs text-slate-500">{driver.bank_account_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg p-3 flex justify-around items-center border-t border-white/20 shadow-2xl">
          <button onClick={() => setStep('dashboard')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
            <Home size={24} />
            <span className="text-xs font-bold">Home</span>
          </button>
          <button onClick={() => setStep('inspection')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
            <FileCheck size={24} />
            <span className="text-xs font-bold">Inspeksi</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-indigo-600">
            <User size={24} />
            <span className="text-xs font-bold">Profil</span>
          </button>
        </nav>
      </div>
    );
  }

  // Inspection History View
  if (step === 'inspection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 pb-28">
        <Toaster position="top-center" />
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setStep('dashboard')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white">Hasil Inspeksi</h2>
            <div className="w-10" />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl">
            {lastInspection ? (
              <div className="space-y-4">
                <div className={`rounded-2xl p-6 text-center ${lastInspection.status === 'LAYAK JALAN' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${lastInspection.status === 'LAYAK JALAN' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {lastInspection.status === 'LAYAK JALAN' ? <CheckCircle size={40} className="text-white" /> : <X size={40} className="text-white" />}
                  </div>
                  <p className={`text-2xl font-black mt-4 ${lastInspection.status === 'LAYAK JALAN' ? 'text-green-700' : 'text-red-700'}`}>{lastInspection.status}</p>
                  <p className="text-4xl font-black text-slate-800 mt-2">{lastInspection.total_score}<span className="text-lg font-bold text-slate-400">/100</span></p>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'rem_ok', label: 'REM' },
                    { key: 'lampu_ok', label: 'LAMPU' },
                    { key: 'ban_ok', label: 'BAN' },
                    { key: 'wiper_ok', label: 'WIPER' },
                    { key: 'kemudi_ok', label: 'KEMUDI' }
                  ].map(item => (
                    <div key={item.key} className="text-center">
                      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-lg font-bold ${lastInspection[item.key as keyof typeof lastInspection] ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {lastInspection[item.key as keyof typeof lastInspection] ? '✓' : '✕'}
                      </div>
                      <p className="text-xs font-bold text-slate-600 mt-2">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Clock size={14} />
                    <p className="text-sm font-bold">{lastInspection.created_at ? new Date(lastInspection.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileCheck size={40} className="text-slate-400" />
                </div>
                <p className="text-lg font-bold text-slate-600">Belum Ada Inspeksi</p>
                <p className="text-sm text-slate-400 mt-1">Lakukan inspeksi terlebih dahulu</p>
              </div>
            )}
          </div>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg p-3 flex justify-around items-center border-t border-white/20 shadow-2xl">
          <button onClick={() => setStep('dashboard')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
            <Home size={24} />
            <span className="text-xs font-bold">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-orange-600">
            <FileCheck size={24} />
            <span className="text-xs font-bold">Inspeksi</span>
          </button>
          <button onClick={() => setStep('profile')} className="flex flex-col items-center gap-1 p-2 text-slate-400">
            <User size={24} />
            <span className="text-xs font-bold">Profil</span>
          </button>
        </nav>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 font-sans text-slate-900 pb-28">
      <Toaster position="top-center" />
      
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white p-5 pb-16 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[80px]" />
        
        {/* Top Row: Driver Name + Logout */}
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Driver Portal</p>
            <h2 className="text-2xl font-black mt-1">{driver?.name}</h2>
          </div>
          <button onClick={() => setStep('auth')} className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all">
            <LogOut size={18} className="text-white" />
          </button>
        </div>

        {/* Attendance Status Card */}
        <div className="mt-4 bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeShift ? 'bg-green-400' : 'bg-slate-400'}`}>
                {activeShift ? <CheckCircle size={20} className="text-white" /> : <Clock size={20} className="text-white" />}
              </div>
              <div>
                <p className="text-lg font-bold">{activeShift ? 'ON DUTY' : 'UNAVAILABLE'}</p>
                {activeShift && (
                  <p className="text-sm font-medium text-white/80">{activeShift.fleet?.plate_number}</p>
                )}
              </div>
            </div>
            {activeShift && (
              <div className="text-right">
                <p className="text-xs font-medium text-white/60">Check-in</p>
                <p className="text-sm font-bold text-white/90">
                  {activeShift.check_in ? new Date(activeShift.check_in).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Inspection Status - Below Attendance */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={16} className="text-amber-300" />
              <p className="text-xs font-bold text-white/70 uppercase">Inspeksi</p>
            </div>
            <p className={`text-xl font-black ${lastInspection?.status === 'LAYAK JALAN' ? 'text-green-300' : lastInspection?.status === 'GROUNDED' ? 'text-red-300' : 'text-white/80'}`}>
              {lastInspection?.status || 'BELUM'
              }
            </p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Star size={16} className="text-amber-300" />
              <p className="text-xs font-bold text-white/70 uppercase">Skor</p>
            </div>
            <p className="text-xl font-black text-white">{lastInspection?.total_score || 0}<span className="text-sm font-medium text-white/60">/100</span></p>
          </div>
        </div>
      </header>

      <main className="p-5 space-y-6 -mt-4 relative z-20">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => !activeShift && setIsAttendanceModalOpen(true)}
            disabled={!!activeShift}
            className={`rounded-3xl p-6 shadow-xl transition-all active:scale-95 border-2 ${activeShift ? 'bg-slate-200 border-slate-300 opacity-60' : 'bg-white border-white hover:border-blue-200 hover:shadow-blue-200/50'}`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${activeShift ? 'bg-slate-300 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
              <Clock size={32} />
            </div>
            <p className="text-base font-bold text-slate-900">Start Shift</p>
            <p className="text-xs text-slate-500 mt-1">{activeShift ? 'Sedang aktif' : 'Mulai bekerja'}</p>
          </button>

          <button 
            onClick={() => activeShift && setIsInspectionModalOpen(true)}
            disabled={!activeShift}
            className={`rounded-3xl p-6 shadow-xl transition-all active:scale-95 border-2 ${!activeShift ? 'bg-slate-200 border-slate-300 opacity-60' : 'bg-white border-white hover:border-orange-200 hover:shadow-orange-200/50'}`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${!activeShift ? 'bg-slate-300 text-slate-500' : 'bg-orange-100 text-orange-600'}`}>
              <Truck size={32} />
            </div>
            <p className="text-base font-bold text-slate-900">Inspeksi</p>
            <p className="text-xs text-slate-500 mt-1">{!activeShift ? 'Shift dulu' : 'Periksa armada'}</p>
          </button>
        </div>

        {activeShift && lastInspection && (
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Ringkasan Inspeksi</h3>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${lastInspection.status === 'LAYAK JALAN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {lastInspection.status}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { key: 'rem_ok', label: 'REM' },
                { key: 'lampu_ok', label: 'LAMPU' },
                { key: 'ban_ok', label: 'BAN' },
                { key: 'wiper_ok', label: 'WIPER' },
                { key: 'kemudi_ok', label: 'KEMUDI' }
              ].map(item => (
                <div key={item.key} className="text-center">
                  <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-lg font-bold ${lastInspection[item.key as keyof typeof lastInspection] ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {lastInspection[item.key as keyof typeof lastInspection] ? '✓' : '✕'}
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-2">{item.label}</p>
                </div>
              ))}
            </div>
            {lastInspection.odometer_value && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">Odometer</span>
                <span className="text-base font-bold text-slate-900">{Number(lastInspection.odometer_value).toLocaleString('id-ID')} KM</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Job Aktif</h3>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
              {jobOrders.length} Job
            </span>
          </div>
          
          {jobOrders.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Package size={32} className="text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">Tidak ada job aktif</p>
              <p className="text-sm text-slate-500 mt-1">Mulai shift dan inspeksi untuk menerima job</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobOrders.map((jo) => (
                <div 
                  key={jo.id} 
                  onClick={() => { setSelectedJob(jo); setStep('jobDetail'); }}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-base font-bold text-slate-900">{jo.jo_number}</p>
                      <p className="text-sm text-slate-500">{jo.md_fleets?.plate_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        jo.status === 'ASSIGNED' || jo.status === 'assigned' ? 'bg-indigo-100 text-indigo-700' :
                        jo.status === 'DITERIMA' ? 'bg-blue-100 text-blue-700' :
                        jo.status === 'STARTED' ? 'bg-yellow-100 text-yellow-700' :
                        jo.status === 'LOADING' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {jo.status === 'assigned' ? 'ASSIGNED' : jo.status}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                  {jo.wo_items?.item_data && (
                    <div className="text-xs text-slate-500 mb-2">
                      {jo.wo_items.item_data.stops?.[0]?.location_name || ' Loading...'} → {jo.wo_items.item_data.stops?.[jo.wo_items.item_data.stops?.length - 1]?.location_name || '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Job Detail View - Separate Layer */}
      {step === 'jobDetail' && selectedJob && (
        <div className="p-5 space-y-4 animate-in slide-in-from-right duration-300">
          <button 
            onClick={() => { setStep('dashboard'); setSelectedJob(null); }}
            className="flex items-center gap-2 text-indigo-600 font-bold mb-4"
          >
            <ChevronLeft size={20} /> Kembali
          </button>
          
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-lg font-black text-indigo-900">{selectedJob.jo_number}</p>
                <p className="text-sm text-indigo-600">{selectedJob.md_fleets?.plate_number}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                selectedJob.status === 'ASSIGNED' || selectedJob.status === 'assigned' ? 'bg-indigo-600 text-white' :
                selectedJob.status === 'DITERIMA' ? 'bg-blue-600 text-white' :
                selectedJob.status === 'STARTED' ? 'bg-yellow-500 text-white' :
                selectedJob.status === 'LOADING' ? 'bg-purple-600 text-white' :
                selectedJob.status === 'UNLOADING' ? 'bg-orange-500 text-white' :
                'bg-green-600 text-white'
              }`}>
                {selectedJob.status}
              </span>
            </div>

            {selectedJob.wo_items?.item_data && (
              <>
                <div className="space-y-2 mb-4">
                  <div className="text-xs font-bold text-indigo-400 uppercase">Rute</div>
                  {(selectedJob.wo_items.item_data.stops || []).map((stop: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1 ${idx === 0 ? 'bg-blue-500' : 'bg-green-500'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{stop.location_name}</p>
                        <p className="text-xs text-slate-500">{stop.address}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-xl p-3">
                    <div className="text-xs text-slate-400 uppercase">Armada</div>
                    <div className="text-sm font-bold text-slate-800">{selectedJob.md_fleets?.plate_number || '-'}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3">
                    <div className="text-xs text-slate-400 uppercase">Truk</div>
                    <div className="text-sm font-bold text-slate-800">{selectedJob.wo_items.item_data.vehicle_type_name || '-'}</div>
                  </div>
                </div>

                {selectedJob.wo_items.item_data.deal_price && (
                  <div className="bg-emerald-50 rounded-xl p-3 mb-4 border border-emerald-100">
                    <div className="text-xs text-emerald-600 uppercase font-bold">Total Kontrak</div>
                    <div className="text-xl font-black text-emerald-700">
                      Rp {Number(selectedJob.wo_items.item_data.deal_price).toLocaleString('id-ID')}
                    </div>
                    {selectedJob.driver_share_percentage && (
                      <div className="text-xs text-emerald-600 mt-1">
                        Bagi Hasil: {selectedJob.driver_share_percentage}% = Rp {Math.round(Number(selectedJob.wo_items.item_data.deal_price) * Number(selectedJob.driver_share_percentage) / 100).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Status */}
                <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-bold mb-2">Status Pembayaran</div>
                  
                  {/* Advance */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-slate-600">Uang Jalan</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        selectedJob.advance_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedJob.advance_status === 'paid' ? 'LUNAS' : 'BELUM'}
                      </span>
                      {selectedJob.advance_amount > 0 && (
                        <span className="text-sm font-bold text-slate-800">
                          Rp {Number(selectedJob.advance_amount).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Final Payment */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-slate-600">Pelunasan</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        selectedJob.driver_payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedJob.driver_payment_status === 'paid' ? 'LUNAS' : 'BELUM'}
                      </span>
                      {selectedJob.driver_payment_amount > 0 && (
                        <span className="text-sm font-bold text-slate-800">
                          Rp {Number(selectedJob.driver_payment_amount).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase">Aksi Kerja</div>
            <div className="grid grid-cols-5 gap-2">
              <button 
                onClick={() => handleUpdateJobStatus(selectedJob.id, 'DITERIMA')} 
                disabled={selectedJob.status !== 'ASSIGNED' && selectedJob.status !== 'assigned'}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-indigo-100 text-indigo-700 disabled:opacity-30"
              >
                <span className="text-lg">✓</span>
                <span className="text-[10px] font-bold">Terima</span>
              </button>
              <button 
                onClick={() => handleUpdateJobStatus(selectedJob.id, 'STARTED')} 
                disabled={selectedJob.status !== 'DITERIMA'}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-100 text-blue-700 disabled:opacity-30"
              >
                <Truck size={20} />
                <span className="text-[10px] font-bold">Start</span>
              </button>
              <button 
                onClick={() => handleUpdateJobStatus(selectedJob.id, 'LOADING')} 
                disabled={selectedJob.status !== 'STARTED'}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-purple-100 text-purple-700 disabled:opacity-30"
              >
                <span className="text-lg">↓</span>
                <span className="text-[10px] font-bold">Loading</span>
              </button>
              <button 
                onClick={() => handleUpdateJobStatus(selectedJob.id, 'UNLOADING')} 
                disabled={selectedJob.status !== 'LOADING'}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-orange-100 text-orange-700 disabled:opacity-30"
              >
                <span className="text-lg">↑</span>
                <span className="text-[10px] font-bold">Unload</span>
              </button>
              <button 
                onClick={() => handleUpdateJobStatus(selectedJob.id, 'SELESAI')} 
                disabled={selectedJob.status !== 'UNLOADING'}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-100 text-green-700 disabled:opacity-30"
              >
                <CheckCircle size={20} />
                <span className="text-[10px] font-bold">Selesai</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance View */}
      {step === 'performance' && (
        <div className="p-5 space-y-6 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-black text-slate-900">Performance</h2>
            <button onClick={() => setStep('dashboard')} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm">
              <X size={20} />
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-white/70" />
                <p className="text-xs font-bold text-white/70 uppercase">Total KM</p>
              </div>
              <p className="text-3xl font-black">{totalKM > 0 ? totalKM.toFixed(0) : (driver?.total_km_driven || 0).toFixed(0)}</p>
              <p className="text-xs text-white/60 mt-1">Kilometer ditempuh</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-white/70" />
                <p className="text-xs font-bold text-white/70 uppercase">Job Selesai</p>
              </div>
              <p className="text-3xl font-black">{driver?.total_jobs_completed || completedJobs.length}</p>
              <p className="text-xs text-white/60 mt-1">Misi berhasil</p>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Star size={18} className="text-white/70" />
                <p className="text-xs font-bold text-white/70 uppercase">Review</p>
              </div>
              <p className="text-3xl font-black">{driver?.avg_review_score ? driver.avg_review_score.toFixed(1) : '-'}</p>
              <p className="text-xs text-white/60 mt-1">{driver?.total_reviews || 0} ulasan</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={18} className="text-white/70" />
                <p className="text-xs font-bold text-white/70 uppercase">Absensi</p>
              </div>
              <p className="text-3xl font-black">{driver?.total_absensi || 0}</p>
              <p className="text-xs text-white/60 mt-1">Hari kerja</p>
            </div>
          </div>

          {/* Completed Jobs History */}
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Riwayat Job</h3>
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                {completedJobs.length} Job
              </span>
            </div>
            
            {performanceLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading...</p>
              </div>
            ) : completedJobs.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Package size={32} className="text-slate-400" />
                </div>
                <p className="text-base font-semibold text-slate-700">Belum ada job selesai</p>
                <p className="text-sm text-slate-500 mt-1">Job yang selesai akan muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {completedJobs.map((job) => {
                  const jobDistance = job.job_routes?.reduce((sum: number, r: any) => sum + (Number(r.distance_km) || 0), 0) || 0;
                  return (
                    <div key={job.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{job.jo_number}</p>
                          <p className="text-xs text-slate-500">
                            {job.completed_at ? new Date(job.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">SELESAI</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{jobDistance > 0 ? jobDistance.toFixed(1) : '-'} km</span>
                        </div>
                        {job.driver_payment_amount > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-emerald-600 font-bold">Rp {Number(job.driver_payment_amount).toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg p-3 flex justify-around items-center border-t border-indigo-100 shadow-2xl">
        <button onClick={() => setStep('dashboard')} className={`flex flex-col items-center gap-1 p-2 ${step === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Home size={24} />
          <span className="text-xs font-bold">Home</span>
        </button>
        <button onClick={() => setStep('performance')} className={`flex flex-col items-center gap-1 p-2 ${step === 'performance' ? 'text-indigo-600' : 'text-slate-400'}`}>
          <Activity size={24} />
          <span className="text-xs font-bold">Performance</span>
        </button>
        <button onClick={() => setStep('inspection')} className={`flex flex-col items-center gap-1 p-2 ${step === 'inspection' ? 'text-orange-500' : 'text-slate-400'}`}>
          <FileCheck size={24} />
          <span className="text-xs font-bold">Inspeksi</span>
        </button>
        <button onClick={() => setStep('profile')} className={`flex flex-col items-center gap-1 p-2 ${step === 'profile' ? 'text-purple-500' : 'text-slate-400'}`}>
          <User size={24} />
          <span className="text-xs font-bold">Profil</span>
        </button>
      </nav>

      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Truck size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Inspeksi Armada</h3>
              <p className="text-sm text-slate-500 mt-1">Periksa kondisi sebelum beroperasi</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Odometer (KM)</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={inspectionData.odometer_value}
                    onChange={(e) => setInspectionData({...inspectionData, odometer_value: e.target.value})}
                    placeholder="125500"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-base font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <label className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer ${inspectionPhotos.odometer ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'odometer')} disabled={uploadingPhoto !== null} />
                    {uploadingPhoto === 'odometer' ? <Loader2 size={20} className="animate-spin" /> : inspectionPhotos.odometer ? <CheckCircle size={20} /> : <Camera size={20} />}
                  </label>
                </div>
              </div>

              {([
                { key: 'rem', label: 'REM' },
                { key: 'lampu', label: 'LAMPU' },
                { key: 'ban', label: 'BAN' },
                { key: 'wiper', label: 'WIPER' },
                { key: 'kemudi', label: 'KEMUDI' }
              ] as const).map((item) => {
                const okKey = `${item.key}_ok` as keyof typeof inspectionData;
                const notesKey = `${item.key}_notes` as keyof typeof inspectionData;
                return (
                  <div key={item.key} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <p className="text-base font-bold text-slate-800 mb-3">{item.label}</p>
                    <div className="flex gap-2 mb-3">
                      <button type="button" onClick={() => setInspectionData({...inspectionData, [okKey]: true})} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${inspectionData[okKey] ? 'bg-green-500 text-white' : 'bg-white border border-slate-300 text-slate-500'}`}>✓ Bagus</button>
                      <button type="button" onClick={() => setInspectionData({...inspectionData, [okKey]: false})} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${inspectionData[okKey] === false ? 'bg-red-500 text-white' : 'bg-white border border-slate-300 text-slate-500'}`}>✕ Masalah</button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Catatan..."
                        value={inspectionData[notesKey] as string}
                        onChange={(e) => setInspectionData({...inspectionData, [notesKey]: e.target.value})}
                        className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-sm font-medium"
                      />
                      <label className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer ${inspectionPhotos[item.key] ? 'bg-green-100 text-green-600' : 'bg-white border border-slate-200 text-slate-500'}`}>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, item.key)} disabled={uploadingPhoto !== null} />
                        {uploadingPhoto === item.key ? <Loader2 size={16} className="animate-spin" /> : inspectionPhotos[item.key] ? <CheckCircle size={16} /> : <Camera size={16} />}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setIsInspectionModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold text-base hover:bg-slate-200 transition-all">
                Batal
              </button>
              <button onClick={handleInspectionSubmit} disabled={inspectionLoading} className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2">
                {inspectionLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}