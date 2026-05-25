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
  X,
  ChevronRight,
  ChevronLeft,
  Package,
  User,
  FileCheck,
  Home,
  CreditCard,
  Building,
  Star,
  Activity,
  Sun,
  Moon,
  Coins,
  Calendar,
  AlertOctagon,
  Download,
  ClipboardList
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function DriverPortal() {
  const [step, setStep] = useState<'auth' | 'dashboard' | 'profile' | 'inspection' | 'jobDetail' | 'performance' | 'history'>('auth');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driver, setDriver] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Theme Management: light / dark mode
  // [AI] read and write theme from localStorage, optimized for safe night-driving
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // SOS States
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [sosCategory, setSosCategory] = useState<'Kecelakaan' | 'Sakit' | 'Mogok' | ''>('');
  const [sosDescription, setSosDescription] = useState('');
  const [sosLoading, setSosLoading] = useState(false);

  // Attendance & Fleet selection
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [fleets, setFleets] = useState<any[]>([]);
  const [selectedFleetId, setSelectedFleetId] = useState('');
  const [activeShift, setActiveShift] = useState<any>(null);
  const [fetchingFleets, setFetchingFleets] = useState(false);

  // Daily Inspection States
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

  // Performance Tab & Financial States
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [totalHak, setTotalHak] = useState<number>(0);
  const [totalAdvanceReceived, setTotalAdvanceReceived] = useState<number>(0);
  const [completedJobsMonth, setCompletedJobsMonth] = useState<number>(0);
  const [totalCompletedJobsCount, setTotalCompletedJobsCount] = useState<number>(0);
  const [inspectionsList, setInspectionsList] = useState<any[]>([]);

  // [AI] PWA Install States & Events
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const [installTab, setInstallTab] = useState<'android' | 'ios'>('android');


  // Theme Sync on Mount, SW Registration, & PWA Install Prompts
  // [AI] Setting up localStorage theme sync, service worker register and capturing beforeinstallprompt event
  useEffect(() => {
    const savedTheme = localStorage.getItem('sentralogis-driver-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setThemeMode(savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeMode(prefersDark ? 'dark' : 'light');
    }

    // Register Service Worker for PWA Add-to-Home-Screen support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('[PWA] Service Worker registered scope:', reg.scope))
        .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
    }

    // Capture standard PWA install prompt in browser
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect iOS/Apple user agent
    const userAgent = window.navigator.userAgent;
    const isApple = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isApple);
    setInstallTab(isApple ? 'ios' : 'android');


    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      toast.success('Aplikasi SentraLogis berhasil terpasang di HP Anda!');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // [AI] Always open visual guide modal so button is always responsive. Show automatic option if deferredPrompt is active!
  const handleInstallPWA = () => {
    if (isIOS) {
      setInstallTab('ios');
    } else {
      setInstallTab('android');
    }
    setShowIOSInstallGuide(true);
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to PWA install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      setShowIOSInstallGuide(false);
      toast.success('Pemasangan aplikasi sedang diproses...');
    } catch (err) {
      console.error('[PWA] Error launching native prompt:', err);
      toast.error('Gagal membuka pemasang otomatis. Silakan ikuti petunjuk manual di bawah.');
    }
  };



  const toggleTheme = () => {
    const nextTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextTheme);
    localStorage.setItem('sentralogis-driver-theme', nextTheme);
    toast.success(`Mode ${nextTheme === 'dark' ? 'Malam Aktif 🌙' : 'Siang Aktif ☀️'}`);
  };

  useEffect(() => {
    const savedSession = localStorage.getItem('sentralogis_driver_session');
    if (savedSession) {
      try {
        const d = JSON.parse(savedSession);
        if (d && d.id) {
          setDriver(d);
          setStep('dashboard');
        }
      } catch(e) {}
    }
    setMounted(true);
  }, []);

  const handleCheckOut = async () => {
    if (!activeShift) return;
    if (window.confirm("Yakin ingin Check-Out? Armada akan dikembalikan dan Anda akan berstatus OFF DUTY.")) {
      setLoading(true);
      try {
        await supabase.from('driver_attendance').update({ status: 'CHECK_OUT' }).eq('id', activeShift.id);
        await supabase.from('md_drivers').update({ is_working: false, status: 'available' }).eq('id', driver.id);
        if (activeShift.fleet_id) {
          await supabase.from('md_fleets').update({ status: 'available' }).eq('id', activeShift.fleet_id);
        }
        setActiveShift(null);
        setLastInspection(null);
        toast.success('Berhasil Check-Out. Terima kasih atas kerja keras Anda!');
      } catch (e: any) {
        toast.error('Gagal Check-Out: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (step === 'dashboard' && isAttendanceModalOpen) fetchFleets();
  }, [step, isAttendanceModalOpen]);

  useEffect(() => {
    if (step === 'dashboard' && driver?.id) {
      fetchActiveShift();
      fetchJobOrders();
      fetchInspections();
      fetchTotalKM();
    }
    if ((step === 'performance' || step === 'dashboard') && driver?.id) {
      fetchPerformanceData();
      fetchAttendanceHistory();
    }
  }, [step, driver]);

  const fetchTotalKM = async () => {
    if (!driver?.id) return;
    const { data: completedJobs } = await supabase
      .from('job_orders')
      .select('id')
      .eq('driver_id', driver.id)
      .eq('status', 'PEKERJAAN SELESAI');
    
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

  const fetchAttendanceHistory = async () => {
    if (!driver?.id) return;
    const { data } = await supabase
      .from('driver_attendance')
      .select('*, md_fleets(plate_number)')
      .eq('driver_id', driver.id)
      .order('check_in', { ascending: false })
      .limit(10);
    if (data) setAttendanceHistory(data);
  };

  const fetchPerformanceData = async () => {
    if (!driver?.id) return;
    setPerformanceLoading(true);
    try {
      const { data: completedJobs } = await supabase
        .from('job_orders')
        .select('*, job_routes(distance_km), wo_items(item_code, item_data)')
        .eq('driver_id', driver.id)
        .or('status.ilike.%SELESAI%,status.eq.COMPLETED,status.eq.DONE,status.eq.INVOICED,status.eq.PAID')
        .order('completed_at', { ascending: false })
        .limit(50);
        
      const { count } = await supabase
        .from('job_orders')
        .select('*', { count: 'exact', head: true })
        .eq('driver_id', driver.id)
        .or('status.ilike.%SELESAI%,status.eq.COMPLETED,status.eq.DONE,status.eq.INVOICED,status.eq.PAID');

      setCompletedJobs(completedJobs || []);
      setTotalCompletedJobsCount(count || 0);

      if (completedJobs && completedJobs.length > 0) {
        let totalDistance = 0;
        let sumEarnings = 0;
        let sumOutstanding = 0;
        let sumHak = 0;
        let sumAdvanceReceived = 0;
        
        for (const job of completedJobs) {
          const routeDist = job.job_routes?.reduce((sum: number, r: any) => sum + (Number(r.distance_km) || 0), 0) || 0;
          totalDistance += routeDist;
          
          const hakDriver = Number(job.advance_amount || 0);
          sumHak += hakDriver;

          const advancePaid = job.advance_status === 'paid' ? Number(job.advance_amount || 0) : 0;
          const pelunasanPaid = job.driver_payment_status === 'paid' ? Number(job.driver_payment_amount || 0) : 0;
          sumAdvanceReceived += advancePaid;
          sumEarnings += advancePaid + pelunasanPaid;

          if (job.driver_payment_status !== 'paid') {
            sumOutstanding += hakDriver - (job.advance_status === 'paid' ? Number(job.advance_amount || 0) : 0);
          }
        }
        
        setTotalKM(totalDistance);
        setTotalEarnings(sumEarnings);
        setTotalHak(sumHak);
        setTotalAdvanceReceived(sumAdvanceReceived);
        setOutstandingBalance(sumOutstanding);

        // [AI] Count completed jobs in current month for history badge
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const monthCount = completedJobs.filter((j: any) => {
          if (!j.completed_at) return false;
          const d = new Date(j.completed_at);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length;
        setCompletedJobsMonth(monthCount);
      }
    } catch (err) {
      console.error('Error fetching performance data:', err);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const fetchActiveShift = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('driver_attendance')
      .select('*, md_fleets(plate_number)')
      .eq('driver_id', driver.id)
      .eq('status', 'CHECK_IN')
      .gte('check_in', today)
      .order('check_in', { ascending: false })
      .limit(1)
      .single();
    if (data) setActiveShift({ ...data, fleet: data.md_fleets });
  };

  const fetchJobOrders = async () => {
    // [AI] Fetch recent jobs and filter active ones in JS to avoid PostgREST .not('in') syntax issues
    const { data, error } = await supabase
      .from('job_orders')
      .select('*, md_fleets(plate_number), wo_items(item_code, item_data)')
      .eq('driver_id', driver.id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error('Error fetching job orders:', error);
    } else if (data) {
      const completedStatuses = ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID'];
      const activeJobs = data.filter(jo => {
        const s = (jo.status || '').toUpperCase();
        return !completedStatuses.includes(s);
      });
      setJobOrders(activeJobs);
    }
  };

  const fetchInspections = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('fleet_inspections')
      .select('*, md_fleets(plate_number)')
      .eq('driver_id', driver.id)
      .gte('created_at', today)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data && data.length > 0) {
      setInspectionsList(data);
      setLastInspection(data[0]);
    } else {
      setInspectionsList([]);
      setLastInspection(null);
    }
  };

  const fetchFleets = async () => {
    if (!driver?.entity_id) {
      toast.error('Driver belum memiliki entity terkait');
      setFleets([]);
      return;
    }
    setFetchingFleets(true);
    const { data, error } = await supabase
      .from('md_fleets')
      .select('id, plate_number, brand, model, status, md_entities(name, is_vendor), md_fleet_types(type_name)')
      .eq('entity_id', driver.entity_id)
      .eq('status', 'available')
      .eq('is_active', true)
      .order('plate_number');
    
    if (error) {
      console.error('Error fetching fleets:', error);
      toast.error('Gagal mengambil data armada');
      setFleets([]);
    } else {
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

      const { data: driverData } = await supabase.from('md_drivers').select('total_absensi').eq('id', driver.id).single();
      await supabase.from('md_drivers').update({ 
        status: 'on_duty',
        is_working: true,
        last_check_in: new Date().toISOString(),
        total_absensi: (driverData?.total_absensi || 0) + 1
      }).eq('id', driver.id);

      await supabase.from('md_fleets').update({ status: 'on_duty' }).eq('id', selectedFleetId);
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

      let fleetStatus: string;
      if (status === 'GROUNDED') {
        fleetStatus = 'maintenance';
        // [AI] insert table notification for maintenance targeting 'sbu_ops_tr'
        await supabase.from('notifications').insert({
          tenant_id: driver.tenant_id,
          user_id: null,
          role: 'sbu_ops_tr',
          title: 'ARMADA RUSAK / GROUNDED',
          message: `Armada ${activeShift.fleet.plate_number} di-GROUNDED oleh supir ${driver.name}! Skor kelayakan: ${totalScore}/100. Pemicu: Rem:${inspectionData.rem_ok?'OK':'RUSAK'}, Lampu:${inspectionData.lampu_ok?'OK':'RUSAK'}, Ban:${inspectionData.ban_ok?'OK':'RUSAK'}`,
          link: '/sbu/trucking/fleet',
          is_read: false
        });
      } else {
        fleetStatus = 'on_duty';
      }
      await supabase.from('md_fleets').update({ status: fleetStatus }).eq('id', activeShift.fleet_id);

      await supabase.from('md_fleets').update({ last_inspection_date: new Date().toISOString().split('T')[0] }).eq('id', activeShift.fleet_id);
      await supabase.from('md_drivers').update({ last_inspection_date: new Date().toISOString().split('T')[0] }).eq('id', driver.id);

      const { data: driverData } = await supabase.from('md_drivers').select('total_inspections, avg_inspection_score').eq('id', driver.id).single();
      const newTotalInspections = (driverData?.total_inspections || 0) + 1;
      const newAvgScore = ((driverData?.avg_inspection_score || 0) * (newTotalInspections - 1) + totalScore) / newTotalInspections;

      await supabase.from('md_drivers').update({
        total_inspections: newTotalInspections,
        avg_inspection_score: newAvgScore
      }).eq('id', driver.id);

      setLastInspection(data);
      setIsInspectionModalOpen(false);
      
      if (status === 'GROUNDED') {
        toast.error('Kondisi buruk! Truk di-GROUNDED dan tim Ops telah diberi tahu.');
      } else {
        toast.success('Armada LAYAK JALAN! Selamat bertugas kembali.');
      }
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setInspectionLoading(false);
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: string) => {
    setLoading(true);
    try {
      const { data: job, error: jobError } = await supabase.from('job_orders').select('*, md_fleets(plate_number)').eq('id', jobId).single();
      if (jobError) throw new Error('Job tidak ditemukan');

      const updates: any = { status: newStatus };
      if (newStatus === 'DITERIMA' || newStatus === 'ACCEPTED') {
        updates.accepted_at = new Date().toISOString();
      }
      if (newStatus === 'STARTED' || newStatus === 'START JOURNEY') {
        updates.started_at = new Date().toISOString();
      }
      if (newStatus === 'SELESAI' || newStatus === 'COMPLETED' || newStatus === 'PEKERJAAN SELESAI') {
        updates.completed_at = new Date().toISOString();
        updates.status = 'PEKERJAAN SELESAI';
      }

      const { error: updateError } = await supabase.from('job_orders').update(updates).eq('id', jobId);
      if (updateError) throw updateError;
      
      const finalStatus = updates.status;
      if ((finalStatus === 'SELESAI' || finalStatus === 'COMPLETED' || finalStatus === 'PEKERJAAN SELESAI') && job) {
        if (job.fleet_id) {
          await supabase.from('md_fleets').update({ status: 'available' }).eq('id', job.fleet_id);
        }
        
        const { data: driverData } = await supabase.from('md_drivers').select('total_jobs_completed, total_km_driven, total_absensi').eq('id', driver.id).single();
        const newJobsCompleted = (driverData?.total_jobs_completed || 0) + 1;
        const estimatedKM = 50; // TODO: Calculate actual distance
        
        await supabase.from('md_drivers').update({
          total_jobs_completed: newJobsCompleted,
          total_km_driven: (driverData?.total_km_driven || 0) + estimatedKM
        }).eq('id', driver.id);

        // [AI] Insert performance log for this completed job
        await supabase.from('driver_performance_logs').insert({
          driver_id: driver.id,
          job_order_id: job.id,
          type: 'KM_LOG',
          total_km: estimatedKM,
          review_notes: 'Tugas diselesaikan melalui Driver Portal',
          tenant_id: driver.tenant_id
        });
        
        setSelectedJob(null);
        setStep('dashboard');
      } else {
        // Reload job details with new status
        const { data: reloadedJob } = await supabase.from('job_orders').select('*, md_fleets(plate_number), wo_items(item_code, item_data)').eq('id', jobId).single();
        setSelectedJob(reloadedJob);
      }
      
      toast.success('Status berhasil diperbarui!');
      fetchJobOrders();
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // SOS Confirmation Action
  const handleSOSSubmit = async () => {
    if (!sosCategory) {
      toast.error('Pilih kategori darurat terlebih dahulu');
      return;
    }
    setSosLoading(true);
    try {
      const descriptionText = `[SOS - ${sosCategory.toUpperCase()}] ${sosDescription || 'Butuh pertolongan segera.'}`;
      
      // 1. Insert SAFETY_INCIDENT to driver_performance_logs
      await supabase.from('driver_performance_logs').insert({
        driver_id: driver.id,
        type: 'SAFETY_INCIDENT',
        review_notes: descriptionText,
        incident_type: sosCategory,
        incident_description: sosDescription || 'Memicu tombol panik SOS',
        incident_date: new Date().toISOString()
      });

      // 2. Insert alert to sbu_ops_tr notification
      await supabase.from('notifications').insert({
        tenant_id: driver.tenant_id,
        user_id: null,
        role: 'sbu_ops_tr',
        title: `🚨 PANGGILAN DARURAT: ${sosCategory.toUpperCase()}`,
        message: `Driver ${driver.name} membunyikan SOS darurat! Tipe: ${sosCategory}. Keterangan: ${sosDescription || 'Segera evakuasi/hubungi!'}`,
        link: '/sbu/trucking/tracking',
        is_read: false
      });

      // 3. Construct WhatsApp template text
      const waText = `*🚨 DARURAT SOS SENTRALOGIS 🚨*\n\n` +
                     `*Nama Supir:* ${driver.name}\n` +
                     `*Nomor WA:* ${driver.whatsapp}\n` +
                     `*Kategori:* ${sosCategory}\n` +
                     `*Detail Kejadian:* ${sosDescription || 'Butuh tanggapan/bantuan segera!'}\n\n` +
                     `*Waktu:* ${new Date().toLocaleString('id-ID')}\n` +
                     `_Supir sedang menunggu evakuasi dari Tim HQ Dispatcher._`;
      
      const whatsappUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(waText)}`;
      window.open(whatsappUrl, '_blank');

      toast.success('Bantuan SOS telah dicatat dan dialihkan ke WhatsApp!');
      setIsSOSModalOpen(false);
      setSosCategory('');
      setSosDescription('');
    } catch (err: any) {
      toast.error('Gagal memicu SOS: ' + err.message);
    } finally {
      setSosLoading(false);
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
      toast.success('Foto berhasil diunggah!');
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
      
      const { data: driverData, error } = await supabase
        .from('md_drivers')
        .select('*')
        .eq('whatsapp', normalizedWA)
        .eq('pin', pinString)
        .single();
      
      if (error || !driverData) {
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
        localStorage.setItem('sentralogis_driver_session', JSON.stringify(driverOriginal));
        setStep('dashboard');
        toast.success(`Selamat datang, ${driverOriginal.name}!`);
        setLoading(false);
        return;
      }
      
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
      localStorage.setItem('sentralogis_driver_session', JSON.stringify(driverData));
      setStep('dashboard');
      toast.success(`Selamat datang, ${driverData.name}!`);
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('Terjadi kesalahan: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Helper to resolve Single Dynamic Button Verb and Color
  // [AI] Unified Indonesian verbs for ease of use by gaptek drivers
  const getJobActionButtonConfig = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'ASSIGNED' || s === 'PENDING' || s === 'NEED_ASSIGNMENT' || s === 'ACTIVE') {
      return {
        verb: 'TERIMA TUGAS INI',
        target: 'DITERIMA',
        color: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
      };
    }
    if (s === 'DITERIMA' || s === 'ACCEPTED' || s === 'ORDER DITERIMA') {
      return {
        verb: 'MULAI JALAN (START)',
        target: 'START JOURNEY',
        color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
      };
    }
    if (s === 'STARTED' || s === 'START JOURNEY' || s === 'DALAM PERJALANAN' || s === 'MENUJU ASAL' || s === 'ON JOURNEY') {
      return {
        verb: 'MULAI MUAT (LOADING)',
        target: 'LOADING',
        color: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
      };
    }
    if (s === 'LOADING' || s === 'PICKING_UP') {
      return {
        verb: 'MULAI BONGKAR (UNLOAD)',
        target: 'UNLOADING',
        color: 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30'
      };
    }
    if (s === 'UNLOADING' || s === 'DELIVERING' || s === 'TIBA DI TUJUAN') {
      return {
        verb: 'TUGAS SELESAI (SELESAI)',
        target: 'PEKERJAAN SELESAI',
        color: 'bg-green-600 hover:bg-green-700 shadow-green-600/30'
      };
    }
    return null;
  };

  const isDark = themeMode === 'dark';

  if (!mounted) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-blue-600'} flex items-center justify-center`}>
        <Loader2 className="animate-spin text-white w-10 h-10" />
      </div>
    );
  }

  if (step === 'auth') {
    return (
      <>
        <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white'} flex flex-col items-center justify-center p-6 font-sans relative transition-colors duration-300`}>
          <Toaster position="top-center" />
          
          {/* Download PWA App / Toggle Theme Row on Auth Page */}
          <div className="absolute top-6 right-6 flex items-center gap-3">
            {/* [AI] PWA Install button is always visible so gaptek drivers can click and learn how to install */}
            <button 
              type="button"
              onClick={handleInstallPWA} 
              className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 transition-all text-white shadow-lg shadow-amber-500/20 flex items-center justify-center animate-bounce border border-amber-400"
              title="Unduh Aplikasi SentraLogis"
            >
              <Download size={20} />
            </button>
            
            <button 
              type="button"
              onClick={toggleTheme} 
              className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all text-white flex items-center justify-center"
            >
              {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>
          </div>

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 -right-20 w-80 h-80 bg-white/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-amber-400/20 rounded-full blur-[100px]" />
          </div>

          <div className="w-full max-w-md relative z-10">
            <div className="text-center mb-10">
              <div className={`w-28 h-28 ${isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white/20 border-white/30'} backdrop-blur-xl rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xl border`}>
                <ShieldCheck size={52} className="text-white" />
              </div>
              <h1 className="text-5xl font-black tracking-tight">SentraLogis</h1>
              <p className="text-sm font-bold mt-3 uppercase tracking-widest opacity-80">Driver Portal</p>
            </div>

            <form onSubmit={handleLogin} className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/15 border-white/20'} backdrop-blur-2xl p-8 rounded-3xl border shadow-2xl space-y-6`}>
              <div className="space-y-3">
                <label className="text-base font-bold uppercase tracking-wide opacity-80">Nomor WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 opacity-50" />
                  <input 
                    type="tel"
                    placeholder="0812 3456 7890"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-indigo-500' : 'bg-white/20 border-white/30 text-white placeholder:text-white/40 focus:ring-white/50'} border rounded-2xl py-5 pl-14 pr-4 text-xl font-bold outline-none transition-all`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold uppercase tracking-wide opacity-80">PIN 4 Digit</label>
                  <button type="button" onClick={() => setShowPin(!showPin)} className="opacity-60 hover:opacity-100 flex items-center gap-2 text-sm">
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
                      className={`w-full aspect-square ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:ring-indigo-500' : 'bg-white/20 border-white/30 text-white focus:ring-white/50'} border rounded-2xl text-center text-2xl font-black outline-none transition-all`}
                      maxLength={1}
                    />
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className={`w-full ${isDark ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-indigo-600 hover:bg-white/90'} disabled:opacity-50 py-4 rounded-2xl font-bold text-lg mt-8 shadow-lg shadow-black/10 flex items-center justify-center gap-3 transition-all`}
              >
                {loading ? <Loader2 className="animate-spin" /> : <><ArrowRight size={20} /> Masuk Portal</>}
              </button>
            </form>
          </div>
        </div>

        {/* [AI] Render the unified installation guide modal here so it works on the login screen */}
        {showIOSInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white text-slate-800 border-slate-100'}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                  <Download className="text-amber-500 animate-bounce" size={20} />
                  Pasang Aplikasi Portal
                </h3>
                <button onClick={() => setShowIOSInstallGuide(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-850 hover:bg-slate-800' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  <X size={18} />
                </button>
              </div>

              {/* [AI] Premium Automatic Install Banner if browser prompt event is ready */}
              {deferredPrompt && (
                <div className={`mb-6 p-5 rounded-2xl text-center border transition-all ${
                  isDark ? 'bg-slate-950/60 border-slate-800 text-slate-200 shadow-inner' : 'bg-amber-50/50 border-amber-200/50 text-slate-700'
                }`}>
                  <p className="text-xs font-bold opacity-90 mb-3">HP Anda mendukung pemasangan otomatis:</p>
                  <button 
                    type="button"
                    onClick={handleNativeInstall}
                    className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 px-4 rounded-2xl text-sm flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-lg shadow-amber-500/20 border border-amber-400"
                  >
                    <Download size={18} className="animate-bounce" />
                    PASANG OTOMATIS SEKARANG
                  </button>
                </div>
              )}

              {/* Visual Tabs for OS selection */}
              <div className="flex border-b border-slate-200/50 dark:border-slate-800/80 mb-5 gap-2">
                <button
                  type="button"
                  onClick={() => setInstallTab('android')}
                  className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-all text-center border-b-2 ${
                    installTab === 'android'
                      ? 'text-amber-500 border-amber-500'
                      : 'text-slate-400 border-transparent hover:text-slate-500 dark:hover:text-slate-300'
                  }`}
                >
                  HP Android (Chrome)
                </button>
                <button
                  type="button"
                  onClick={() => setInstallTab('ios')}
                  className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-all text-center border-b-2 ${
                    installTab === 'ios'
                      ? 'text-amber-500 border-amber-500'
                      : 'text-slate-400 border-transparent hover:text-slate-500 dark:hover:text-slate-300'
                  }`}
                >
                  HP iPhone (Safari)
                </button>
              </div>
              
              {installTab === 'android' ? (
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="font-semibold opacity-80 text-xs">Supir pengguna HP Android dapat memasang portal di layar utama dengan mudah:</p>
                  
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">1</span>
                    <p>Buka portal ini di browser <strong>Google Chrome</strong> HP Anda.</p>
                  </div>
                  
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">2</span>
                    <p>Ketuk tombol <strong>titik tiga (⋮)</strong> di pojok kanan atas Chrome.</p>
                  </div>
                  
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">3</span>
                    <p>Cari dan ketuk pilihan <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</p>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">4</span>
                    <p>Ketuk **Instal** atau **Tambah** di layar. Aplikasi langsung terpasang di HP Android Anda!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm leading-relaxed">
                  <p className="font-semibold opacity-80 text-xs">Supir pengguna iPhone/iOS dapat memasang portal di layar utama dengan mudah:</p>
                  
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">1</span>
                    <p>Buka portal ini menggunakan browser <strong>Safari</strong> bawaan iPhone.</p>
                  </div>
                  
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">2</span>
                    <p>Ketuk tombol <strong>Share/Bagikan</strong> (ikon kotak dengan panah ke atas) di bagian tengah bawah Safari.</p>
                  </div>
                  
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">3</span>
                    <p>Gulir ke bawah dan ketuk pilihan <strong>"Tambahkan ke Layar Utama"</strong> (*Add to Home Screen*).</p>
                  </div>

                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">4</span>
                    <p>Ketuk **Tambah** di pojok kanan atas. Aplikasi langsung terpasang di layar utama iPhone Anda!</p>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowIOSInstallGuide(false)} 
                className="w-full bg-amber-500 text-white font-black py-3 rounded-2xl text-sm mt-6 hover:bg-amber-600 active:scale-98 transition-all shadow-lg shadow-amber-500/20"
              >
                Mengerti & Siap Pasang
              </button>
            </div>
          </div>
        )}
      </>
    );
  }


  // Profile View
  if (step === 'profile') {
    return (
      <div className={`min-h-screen pb-28 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'}`}>
        <Toaster position="top-center" />
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setStep('dashboard')} className={`w-10 h-10 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white/20 text-white'} rounded-full flex items-center justify-center border`}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white">Profil Driver</h2>
            <button onClick={toggleTheme} className={`p-2.5 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white/20 border-white/20 text-white'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className={`rounded-3xl p-6 shadow-xl ${isDark ? 'bg-slate-900 border border-slate-850' : 'bg-white text-slate-800'}`}>
            <div className="flex flex-col items-center mb-6">
              {driver?.photo_url ? (
                <img src={driver.photo_url} alt={driver.name} className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100 shadow-lg" />
              ) : (
                <div className={`w-24 h-24 rounded-full ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-indigo-50 border-indigo-100'} flex items-center justify-center border-4`}>
                  <User size={48} className="text-indigo-400" />
                </div>
              )}
              <h3 className="text-2xl font-black mt-4">{driver?.name}</h3>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold mt-1 uppercase tracking-widest ${driver?.is_working ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                {driver?.status || 'available'}
              </span>
            </div>

            <div className="space-y-4">
              <div className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Phone size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>WhatsApp</p>
                  <p className="text-base font-bold">{driver?.whatsapp || driver?.phone}</p>
                </div>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                  <CreditCard size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>SIM</p>
                  <p className="text-base font-bold">{driver?.sim_number || '-'} <span className="text-xs opacity-75">({driver?.sim_class})</span></p>
                  <p className="text-xs opacity-70">Exp: {driver?.sim_expiry ? new Date(driver.sim_expiry).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Star size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Skor Kepercayaan</p>
                  <p className="text-2xl font-black text-amber-500">{driver?.trust_score || 100}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className={`rounded-2xl p-4 text-center ${isDark ? 'bg-slate-950' : 'bg-blue-50 text-blue-900'}`}>
                  <p className="text-2xl font-black text-blue-500">{totalKM > 0 ? totalKM.toFixed(0) : Number(driver?.total_km_driven || 0).toFixed(0)}</p>
                  <p className={`text-[10px] font-black uppercase ${isDark ? 'text-slate-500' : 'text-blue-400'}`}>Total Kilometer Tempuh</p>
                </div>
              </div>

              {driver?.bank_name && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Rekening Bank</p>
                  <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                    <p className="font-bold">{driver.bank_name}</p>
                    <p className="text-sm font-semibold opacity-85">{driver.bank_account}</p>
                    <p className="text-xs opacity-75">{driver.bank_account_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className={`fixed bottom-0 left-0 right-0 p-3 flex justify-around items-center border-t backdrop-blur-lg z-30 ${isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-100 shadow-2xl'}`}>
          <button onClick={() => setStep('dashboard')} className="flex flex-col items-center gap-1 p-2">
            <Home size={24} />
            <span className="text-xs font-bold">Home</span>
          </button>
          <button onClick={() => { setStep('history'); fetchPerformanceData(); }} className="flex flex-col items-center gap-1 p-2 relative">
            <ClipboardList size={24} />
            <span className="text-xs font-bold">Histori</span>
          </button>
          <button onClick={() => setStep('inspection')} className="flex flex-col items-center gap-1 p-2">
            <FileCheck size={24} />
            <span className="text-xs font-bold">Inspeksi</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-indigo-500">
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
      <div className={`min-h-screen pb-28 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-gradient-to-br from-orange-500 via-red-500 to-pink-500'}`}>
        <Toaster position="top-center" />
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setStep('dashboard')} className={`w-10 h-10 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white/20 text-white'} rounded-full flex items-center justify-center border`}>
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white">Hasil Inspeksi</h2>
            <button onClick={toggleTheme} className={`p-2.5 rounded-full border ${isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-white/20 border-white/20 text-white'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className={`rounded-3xl p-6 shadow-xl ${isDark ? 'bg-slate-900 border border-slate-850' : 'bg-white text-slate-850'}`}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200/20">
              <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                <FileCheck size={18} className="text-indigo-500" />
                Daftar Riwayat Inspeksi
              </h3>
            </div>
            
            {inspectionsList.length === 0 ? (
              <div className="text-center py-8">
                <div className={`w-20 h-20 ${isDark ? 'bg-slate-950' : 'bg-slate-50'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <FileCheck size={40} className="text-slate-400" />
                </div>
                <p className="text-lg font-bold">Belum Ada Inspeksi</p>
                <p className="text-sm opacity-60 mt-1">Lakukan inspeksi truk terlebih dahulu</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {inspectionsList.map((insp) => (
                  <div key={insp.id} className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-150'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-black">{insp.md_fleets?.plate_number || '-'}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">
                          {insp.created_at ? new Date(insp.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${insp.status === 'LAYAK JALAN' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {insp.status === 'LAYAK JALAN' ? 'LAYAK JALAN ✓' : 'RUSAK ✕'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs opacity-75 border-t pt-2 border-slate-200/50">
                      <span className="font-semibold">Skor Kelayakan:</span>
                      <span className={`font-black ${insp.total_score >= 80 ? 'text-green-500' : 'text-red-500'}`}>{insp.total_score}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <nav className={`fixed bottom-0 left-0 right-0 p-3 flex justify-around items-center border-t backdrop-blur-lg z-30 ${isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-100 shadow-2xl'}`}>
          <button onClick={() => setStep('dashboard')} className="flex flex-col items-center gap-1 p-2">
            <Home size={24} />
            <span className="text-xs font-bold">Home</span>
          </button>
          <button onClick={() => { setStep('history'); fetchPerformanceData(); }} className="flex flex-col items-center gap-1 p-2 relative">
            <ClipboardList size={24} />
            <span className="text-xs font-bold">Histori</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-orange-500">
            <FileCheck size={24} />
            <span className="text-xs font-bold">Inspeksi</span>
          </button>
          <button onClick={() => setStep('profile')} className="flex flex-col items-center gap-1 p-2">
            <User size={24} />
            <span className="text-xs font-bold">Profil</span>
          </button>
        </nav>
      </div>
    );
  }

  // Dashboard & Worksheets
  return (
    <div className={`min-h-screen pb-28 font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Toaster position="top-center" />
      
      {/* Visual Premium Header */}
      <header className={`relative p-5 pb-16 rounded-b-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300 ${isDark ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border-b border-indigo-900/20' : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white'}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Top Row: Title + Theme Toggle + Panic SOS Button */}
        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-xs font-black uppercase tracking-widest opacity-70">Driver Portal</p>
            <h2 className="text-2xl font-black mt-0.5">{driver?.name || 'Supir SentraLogis'}</h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Download/Install PWA Button */}
            {/* [AI] PWA Install button is always visible in the header for driver convenience */}
            <button 
              onClick={handleInstallPWA} 
              className="w-10 h-10 bg-amber-500 border border-amber-400 text-white rounded-2xl flex items-center justify-center hover:bg-amber-600 transition-all shrink-0 animate-bounce shadow-lg shadow-amber-500/20"
              title="Unduh Aplikasi SentraLogis"
            >
              <Download size={18} />
            </button>


            {/* Mode Switcher */}
            <button onClick={toggleTheme} className="w-10 h-10 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* Logout */}
            <button onClick={() => {
              localStorage.removeItem('sentralogis_driver_session');
              setDriver(null);
              setStep('auth');
            }} className="w-10 h-10 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Attendance Status Widget */}
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/15 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${activeShift ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-slate-500/30 text-slate-300'}`}>
                {activeShift ? <CheckCircle size={24} /> : <Clock size={24} />}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-60">Status Driver</p>
                <p className="text-xl font-black mt-0.5">{activeShift ? 'AKTIF BEKERJA (ON DUTY)' : 'BELUM ABSEN (OFF DUTY)'}</p>
                {activeShift && (
                  <span className="inline-block mt-1 text-xs font-black bg-white/15 px-2.5 py-0.5 rounded-full">
                    🚛 {activeShift.fleet?.plate_number}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons: Moved SOS below Status Driver */}
          <button 
            onClick={() => setIsSOSModalOpen(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 bg-rose-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-500/20 hover:bg-rose-600 active:scale-[0.98] transition-all"
          >
            <AlertOctagon size={20} className="animate-pulse" />
            TOMBOL DARURAT (SOS)
          </button>
        </div>
      </header>

      {/* Main Container - Dashboard Body */}
      <main className="p-5 space-y-6 -mt-6 relative z-20">
        
        {/* Step-by-Step Alur Kerja Driver (3-Step Guide Dashboard) */}
        {/* [AI] Interactive visual workflow cards that display progress cleanly */}
        <div className={`rounded-3xl p-5 shadow-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} space-y-4`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-150">
            <h3 className="text-base font-black uppercase tracking-wider">3 Langkah Alur Kerja Supir</h3>
            <span className="text-[10px] font-black tracking-widest bg-indigo-500/10 text-indigo-500 px-2.5 py-0.5 rounded-full">WAJIB SETIAP HARI</span>
          </div>

          <div className="space-y-3">
            {/* Step 1: Absen Masuk */}
            <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              activeShift 
                ? 'bg-emerald-500/5 border-emerald-500/20' 
                : 'bg-indigo-500/5 border-indigo-500/20'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  activeShift ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                }`}>
                  1
                </div>
                <div>
                  <h4 className="text-sm font-black">Langkah 1: Absen Masuk</h4>
                  <p className="text-xs opacity-70">
                    {activeShift 
                      ? `Sudah Absen - Truk ${activeShift.fleet?.plate_number}` 
                      : 'Absen masuk untuk memilih truk Anda hari ini.'}
                  </p>
                </div>
              </div>
              
              {!activeShift ? (
                <button 
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
                >
                  Absen
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-black text-emerald-500 flex items-center gap-1">✓ Selesai</span>
                  <button 
                    onClick={handleCheckOut}
                    disabled={loading}
                    className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                  >
                    Check Out
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Cek Truk (Inspeksi) */}
            <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              !activeShift 
                ? 'opacity-40 bg-slate-100 border-slate-200' 
                : lastInspection 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : 'bg-orange-500/5 border-orange-500/20'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  !activeShift 
                    ? 'bg-slate-300 text-slate-500' 
                    : lastInspection 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-orange-500 text-white'
                }`}>
                  2
                </div>
                <div>
                  <h4 className="text-sm font-black">Langkah 2: Cek Kondisi Truk</h4>
                  <p className="text-xs opacity-70">
                    {!activeShift 
                      ? 'Harus absen masuk terlebih dahulu.' 
                      : lastInspection 
                        ? `Selesai - Status: ${lastInspection.status}` 
                        : 'Inspeksi ban, rem, lampu demi keamanan jalan.'}
                  </p>
                </div>
              </div>

              {activeShift && !lastInspection && (
                <button 
                  onClick={() => setIsInspectionModalOpen(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
                >
                  Periksa
                </button>
              )}
              {activeShift && lastInspection && (
                <div className="text-right shrink-0">
                  <span className={`block text-xs font-black ${lastInspection.status === 'LAYAK JALAN' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {lastInspection.status === 'LAYAK JALAN' ? '✓ Layak' : '✕ Rusak'}
                  </span>
                  <span className="text-[10px] opacity-60">Score: {lastInspection.total_score}</span>
                </div>
              )}
              {!activeShift && (
                <span className="text-xs opacity-50 font-bold">🔒 Terkunci</span>
              )}
            </div>

            {/* Step 3: Tugas Aktif */}
            <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              (!activeShift || !lastInspection) 
                ? 'opacity-40 bg-slate-100 border-slate-200' 
                : 'bg-blue-500/5 border-blue-500/20'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  (!activeShift || !lastInspection) 
                    ? 'bg-slate-300 text-slate-500' 
                    : 'bg-blue-600 text-white'
                }`}>
                  3
                </div>
                <div>
                  <h4 className="text-sm font-black">Langkah 3: Ambil Tugas Utama</h4>
                  <p className="text-xs opacity-70">
                    {(!activeShift || !lastInspection)
                      ? 'Lengkapi langkah 1 & 2 di atas.'
                      : jobOrders.length > 0 
                        ? `Ada ${jobOrders.length} tugas yang perlu dikerjakan!` 
                        : 'Menunggu tugas baru dari kantor.'}
                  </p>
                </div>
              </div>

              {activeShift && lastInspection ? (
                <span className="text-xs font-black text-indigo-500 flex items-center gap-1">Siap Kerja 🚛</span>
              ) : (
                <span className="text-xs opacity-50 font-bold">🔒 Terkunci</span>
              )}
            </div>
          </div>
        </div>

        {/* Inspeksi Summary Callout if Grounded */}
        {activeShift && lastInspection && lastInspection.status === 'GROUNDED' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-5 text-center space-y-2">
            <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/20 animate-bounce">
              <AlertTriangle size={24} />
            </div>
            <h4 className="text-base font-black text-red-500">ARMADA DINYATAKAN RUSAK / GROUNDED</h4>
            <p className="text-xs opacity-80 max-w-sm mx-auto">
              Skor kelayakan truk Anda sangat rendah ({lastInspection.total_score}/100). Tim pemeliharaan (Operations) telah diberi tahu. Mohon tunggu perbaikan atau hubungi kantor untuk ganti truk.
            </p>
          </div>
        )}

        {/* New Assignment Job Orders List */}
        <div className={`rounded-3xl p-5 shadow-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black uppercase tracking-wider">Tugas Baru Untuk Anda</h3>
            <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full text-xs font-black">
              {jobOrders.length} Baru
            </span>
          </div>
          
          {jobOrders.length === 0 ? (
            <div className="py-10 text-center">
              <div className={`w-16 h-16 ${isDark ? 'bg-slate-950' : 'bg-slate-50'} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner`}>
                <Package size={32} className="text-slate-400" />
              </div>
              <p className="text-base font-black">Belum Ada Tugas Baru</p>
              <p className="text-xs opacity-60 mt-1">Menunggu penugasan baru dari kantor. Pastikan Anda sudah absen dan inspeksi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobOrders.map((jo) => (
                <div 
                  key={jo.id} 
                  onClick={() => { setSelectedJob(jo); setStep('jobDetail'); }}
                  className={`rounded-2xl p-4 border cursor-pointer hover:scale-[1.01] active:scale-95 transition-all shadow-sm ${
                    isDark 
                      ? 'bg-slate-950 border-slate-850 hover:bg-slate-900' 
                      : 'bg-slate-50 border-slate-150 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-base font-black">{jo.jo_number}</p>
                      <p className="text-xs opacity-60 mt-0.5">Plat Truk: {jo.md_fleets?.plate_number || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-700">
                        BELUM DITERIMA
                      </span>
                      <ChevronRight size={16} className="opacity-40" />
                    </div>
                  </div>
                  {jo.wo_items?.item_data && (
                    <div className="text-xs opacity-75 font-semibold mt-2 border-t pt-2 border-slate-200/50">
                      🚚 {jo.wo_items.item_data.stops?.[0]?.location_name || 'Loading Point'} → {jo.wo_items.item_data.stops?.[jo.wo_items.item_data.stops?.length - 1]?.location_name || 'Unload Point'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Nav Bar */}
      <nav className={`fixed bottom-0 left-0 right-0 p-3 flex justify-around items-center border-t backdrop-blur-lg z-30 ${isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-100 shadow-2xl'}`}>
        <button onClick={() => setStep('dashboard')} className="flex flex-col items-center gap-1 p-2 text-indigo-500">
          <Home size={24} />
          <span className="text-xs font-bold">Home</span>
        </button>
        <button onClick={() => { setStep('history'); fetchPerformanceData(); }} className="flex flex-col items-center gap-1 p-2 relative">
          <ClipboardList size={24} />
          <span className="text-xs font-bold">Histori</span>
          {completedJobsMonth > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow">{completedJobsMonth}</span>
          )}
        </button>
        <button onClick={() => setStep('performance')} className="flex flex-col items-center gap-1 p-2">
          <Activity size={24} />
          <span className="text-xs font-bold">Keuangan</span>
        </button>
        <button onClick={() => setStep('inspection')} className="flex flex-col items-center gap-1 p-2">
          <FileCheck size={24} />
          <span className="text-xs font-bold">Inspeksi</span>
        </button>
        <button onClick={() => setStep('profile')} className="flex flex-col items-center gap-1 p-2">
          <User size={24} />
          <span className="text-xs font-bold">Profil</span>
        </button>
      </nav>

      {/* Job Detail Overlay Drawer */}
      {step === 'jobDetail' && selectedJob && (
        <div className={`fixed inset-0 z-40 overflow-y-auto p-4 flex justify-center items-end sm:items-center ${isDark ? 'bg-slate-950/85 backdrop-blur-md' : 'bg-slate-900/60 backdrop-blur-sm animate-in fade-in'}`}>
          <div className={`w-full max-w-xl rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}`}>
            
            {/* Header detail */}
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => { setStep('dashboard'); setSelectedJob(null); }}
                className="flex items-center gap-1.5 text-indigo-500 font-black text-sm"
              >
                <ChevronLeft size={20} /> KEMBALI
              </button>
              <h3 className="text-base font-black uppercase tracking-wider">Detail Penugasan</h3>
            </div>

            <div className={`rounded-3xl p-5 border ${isDark ? 'bg-slate-950 border-slate-850' : 'bg-indigo-50/50 border-indigo-100'} space-y-5 mb-6`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xl font-black text-indigo-500">{selectedJob.jo_number}</p>
                  <p className="text-xs opacity-60 mt-0.5">Plat Nomor Armada: {selectedJob.md_fleets?.plate_number}</p>
                </div>
                <span className="px-3 py-1.5 bg-indigo-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-md">
                  {selectedJob.status === 'assigned' ? 'BELUM DI-TERIMA' : selectedJob.status}
                </span>
              </div>

              {selectedJob.wo_items?.item_data && (
                <>
                  <div className="space-y-3.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rute Perjalanan</p>
                    <div className="space-y-4">
                      {(selectedJob.wo_items.item_data.stops || []).map((stop: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 relative">
                          {idx < (selectedJob.wo_items.item_data.stops?.length - 1) && (
                            <div className="absolute left-[7px] top-[14px] w-0.5 h-8 bg-slate-300" />
                          )}
                          <div className={`w-4 h-4 rounded-full mt-1 border-2 border-white shadow flex items-center justify-center text-[8px] font-black text-white shrink-0 ${
                            idx === 0 ? 'bg-blue-600' : 'bg-green-600'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black truncate">{stop.location_name}</p>
                            <p className="text-xs opacity-60 truncate mt-0.5">{stop.address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/40">
                    <div className={`rounded-2xl p-3 border ${isDark ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-100'}`}>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Muatan</p>
                      <p className="text-xs font-black mt-0.5 truncate">{selectedJob.wo_items.item_data.commodity || '-'}</p>
                    </div>
                    <div className={`rounded-2xl p-3 border ${isDark ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-100'}`}>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jenis Truk</p>
                      <p className="text-xs font-black mt-0.5 truncate">{selectedJob.wo_items.item_data.vehicle_type_name || '-'}</p>
                    </div>
                  </div>

                  {selectedJob.wo_items.item_data.deal_price && (
                    <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Total Hak Driver</p>
                      <div className="text-2xl font-black text-emerald-500 mt-1">
                        Rp {Number(selectedJob.advance_amount || 0).toLocaleString('id-ID')}
                      </div>
                      <p className="text-[10px] opacity-75 mt-1 font-semibold">
                        Kontrak: Rp {Number(selectedJob.wo_items.item_data.deal_price).toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}

                  {/* Payment Details info — hide after driver starts journey */}
                  {['ASSIGNED', 'PENDING', 'NEED_ASSIGNMENT', 'ACTIVE', 'DITERIMA', 'ACCEPTED', 'ORDER DITERIMA'].includes((selectedJob.status || '').toUpperCase()) && (
                  <div className={`rounded-2xl p-4 border space-y-2.5 ${isDark ? 'bg-slate-900 border-slate-850' : 'bg-slate-100 border-slate-200'}`}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rincian Pembayaran Uang Supir</p>
                    
                    <div className="flex justify-between items-center text-sm border-b pb-2 border-slate-250/20">
                      <span className="font-semibold opacity-85">Total Hak Driver</span>
                      <span className="font-black">Rp {Number(selectedJob.advance_amount || 0).toLocaleString('id-ID')}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold opacity-85">Uang Jalan (Advance)</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          selectedJob.advance_status === 'paid' ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {selectedJob.advance_status === 'paid' ? 'DITRANSFER' : 'PENDING'}
                        </span>
                        <span className="font-black">Rp {Number(selectedJob.advance_amount || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm border-t pt-2 border-slate-250/20">
                      <span className="font-semibold opacity-85">Tambahan / Pelunasan</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          selectedJob.driver_payment_status === 'paid' ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {selectedJob.driver_payment_status === 'paid' ? 'DITRANSFER' : 'PENDING'}
                        </span>
                        <span className="font-black">Rp {Number(selectedJob.driver_payment_amount || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                  )}
                </>
              )}
            </div>

            {/* Stepped Single Dynamic Action Button */}
            {/* [AI] Only ONE big action button is presented to the driver to keep operations simple and error-proof */}
            <div className="pt-2 border-t border-slate-200/40">
              {getJobActionButtonConfig(selectedJob.status) ? (() => {
                const btn = getJobActionButtonConfig(selectedJob.status)!;
                return (
                  <button
                    onClick={() => handleUpdateJobStatus(selectedJob.id, btn.target)}
                    disabled={loading}
                    className={`w-full py-4.5 rounded-2xl text-white font-black text-lg tracking-widest transition-all duration-350 active:scale-95 shadow-lg flex items-center justify-center gap-2.5 ${btn.color}`}
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Truck size={22} className="animate-bounce" />
                        {btn.verb}
                      </>
                    )}
                  </button>
                );
              })() : (
                <div className="p-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl text-center space-y-1.5">
                  <CheckCircle className="w-8 h-8 mx-auto" />
                  <p className="text-base font-black">TUGAS TELAH SELESAI</p>
                  <p className="text-xs opacity-80">Terima kasih atas kerja keras Anda! Tugas diarsipkan di tab Keuangan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SOS Darurat Modal */}
      {isSOSModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 flex justify-center items-end sm:items-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${isDark ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-white text-slate-900'}`}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/30">
                <AlertOctagon size={32} />
              </div>
              <h3 className="text-xl font-black text-rose-500">PANGGILAN DARURAT (SOS)</h3>
              <p className="text-xs opacity-75 mt-1">Pilih kejadian darurat yang sedang Anda alami di lapangan.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'Kecelakaan', icon: '🚨', label: 'Tabrakan' },
                  { id: 'Sakit', icon: '🤒', label: 'Sakit' },
                  { id: 'Mogok', icon: '🛠️', label: 'Mogok' }
                ] as const).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSosCategory(cat.id)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all text-sm font-black ${
                      sosCategory === cat.id 
                        ? 'border-rose-500 bg-rose-500/10 text-rose-500' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={3}
                  value={sosDescription}
                  onChange={(e) => setSosDescription(e.target.value)}
                  placeholder="Contoh: Ban pecah di KM 45, butuh derek..."
                  className={`w-full p-4.5 rounded-2xl border outline-none text-sm font-semibold transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-rose-500' 
                      : 'bg-slate-50 border-slate-250 focus:border-rose-500'
                  }`}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsSOSModalOpen(false); setSosCategory(''); setSosDescription(''); }}
                  className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSOSSubmit}
                  disabled={sosLoading || !sosCategory}
                  className="flex-[2] py-4 rounded-2xl bg-rose-600 text-white font-black text-sm hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {sosLoading ? <Loader2 className="animate-spin" /> : <><AlertOctagon size={16} /> Kirim SOS</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start Shift (Fleet Selection) Modal */}
      {isAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-900 text-slate-100 border border-slate-850' : 'bg-white text-slate-900'}`}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Clock size={28} />
              </div>
              <h3 className="text-xl font-black">Mulai Shift Kerja</h3>
              <p className="text-xs opacity-75 mt-1">Pilih plat armada internal yang akan Anda bawa hari ini.</p>
              <div className="mt-3 text-xs font-bold text-indigo-500 bg-indigo-500/10 py-1.5 px-3 rounded-full inline-block">
                 {new Date().toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 block mb-2">Armada Internal Tersedia</label>
                {fetchingFleets ? (
                  <div className="py-8 text-center">
                    <Loader2 className="animate-spin w-8 h-8 text-indigo-500 mx-auto mb-2" />
                    <p className="text-xs opacity-60">Mengambil data armada...</p>
                  </div>
                ) : fleets.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl p-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-black">Armada Kosong / Belum Siap</p>
                    <p className="text-xs opacity-60 mt-1">Hubungi HQ Ops untuk mengubah status armada menjadi "available" atau kaitkan dengan entitas Anda.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {fleets.map((fleet) => (
                      <button
                        key={fleet.id}
                        type="button"
                        onClick={() => setSelectedFleetId(fleet.id)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 text-left transition-all ${
                          selectedFleetId === fleet.id
                            ? 'border-indigo-600 bg-indigo-500/10'
                            : isDark ? 'border-slate-800 bg-slate-950 hover:border-slate-700' : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div>
                          <p className="font-black text-base">{fleet.plate_number}</p>
                          <p className="text-xs opacity-60 mt-0.5">{fleet.md_fleet_types?.type_name || fleet.model || '-'}</p>
                        </div>
                        {selectedFleetId === fleet.id && (
                          <CheckCircle className="w-5 h-5 text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setIsAttendanceModalOpen(false)} 
                className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Batal
              </button>
              <button 
                onClick={handleStartShift} 
                disabled={loading || !selectedFleetId} 
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> Mulai Shift</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fleet Inspection Modal */}
      {isInspectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-900 text-slate-100 border border-slate-850' : 'bg-white text-slate-900'}`}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileCheck size={28} />
              </div>
              <h3 className="text-xl font-black">Inspeksi Harian Armada</h3>
              <p className="text-xs opacity-75 mt-1">Periksa kondisi kelaikan jalan demi keselamatan Anda di jalan.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Odometer Sekarang (KM)</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={inspectionData.odometer_value}
                    onChange={(e) => setInspectionData({...inspectionData, odometer_value: e.target.value})}
                    placeholder="125500"
                    className={`flex-1 border rounded-2xl py-3.5 px-4 text-base font-black outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                  <label className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed shrink-0 ${
                    inspectionPhotos.odometer ? 'bg-green-500/20 border-green-500 text-green-500' : isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'odometer')} disabled={uploadingPhoto !== null} />
                    {uploadingPhoto === 'odometer' ? <Loader2 size={20} className="animate-spin" /> : inspectionPhotos.odometer ? <CheckCircle size={20} /> : <Camera size={20} />}
                  </label>
                </div>
              </div>

              {([
                { key: 'rem', label: 'Kondisi Pengereman (Rem)' },
                { key: 'lampu', label: 'Kondisi Lampu Utama & Sein' },
                { key: 'ban', label: 'Kondisi Ban (Ketebalan & Angin)' },
                { key: 'wiper', label: 'Kondisi Wiper Kaca Depan' },
                { key: 'kemudi', label: 'Kondisi Stir / Sistem Kemudi' }
              ] as const).map((item) => {
                const okKey = `${item.key}_ok` as keyof typeof inspectionData;
                const notesKey = `${item.key}_notes` as keyof typeof inspectionData;
                return (
                  <div key={item.key} className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'}`}>
                    <p className="text-sm font-black mb-3">{item.label}</p>
                    <div className="flex gap-2 mb-3">
                      <button 
                        type="button" 
                        onClick={() => setInspectionData({...inspectionData, [okKey]: true})} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                          inspectionData[okKey] 
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                            : isDark ? 'bg-slate-900 border border-slate-800 text-slate-400' : 'bg-white border border-slate-350 text-slate-500'
                        }`}
                      >
                        ✓ LAYAK / BAGUS
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setInspectionData({...inspectionData, [okKey]: false})} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                          inspectionData[okKey] === false 
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                            : isDark ? 'bg-slate-900 border border-slate-800 text-slate-400' : 'bg-white border border-slate-355 text-slate-500'
                        }`}
                      >
                        ✕ BERMASALAH / RUSAK
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Detail keluhan/catatan..."
                        value={inspectionData[notesKey] as string}
                        onChange={(e) => setInspectionData({...inspectionData, [notesKey]: e.target.value})}
                        className={`flex-1 border rounded-xl py-2.5 px-3 text-xs font-semibold outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
                        }`}
                      />
                      <label className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer border border-dashed shrink-0 ${
                        inspectionPhotos[item.key] ? 'bg-green-500/20 border-green-500 text-green-500' : isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
                      }`}>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, item.key)} disabled={uploadingPhoto !== null} />
                        {uploadingPhoto === item.key ? <Loader2 size={16} className="animate-spin" /> : inspectionPhotos[item.key] ? <CheckCircle size={16} /> : <Camera size={16} />}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button 
                onClick={() => setIsInspectionModalOpen(false)} 
                className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'
                }`}
              >
                Batal
              </button>
              <button 
                onClick={handleInspectionSubmit} 
                disabled={inspectionLoading} 
                className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl font-black text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {inspectionLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} /> Simpan Hasil</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History (Histori JO Selesai) Tab Panel Layer */}
      {step === 'history' && (
        <div className={`fixed inset-0 z-30 overflow-y-auto pb-28 p-5 space-y-6 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-xl font-black uppercase tracking-wider">Histori Tugas Selesai</h2>
            <button onClick={() => setStep('dashboard')} className={`w-10 h-10 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white shadow-sm border border-slate-100'} rounded-full flex items-center justify-center`}>
              <X size={20} />
            </button>
          </div>

          {/* Monthly Summary Card */}
          <div className={`rounded-3xl p-5 shadow-xl border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/10' : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur shadow-md rounded-2xl flex items-center justify-center">
                <ClipboardList size={24} className="text-emerald-300" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">JO Selesai Bulan Ini</p>
                <h4 className="text-4xl font-black mt-0.5">{completedJobsMonth}</h4>
              </div>
            </div>
            <p className="text-xs opacity-75 font-semibold border-t border-white/10 pt-3">
              Total keseluruhan: {totalCompletedJobsCount} JO selesai sepanjang karier Anda.
            </p>
          </div>

          {/* Completed Jobs List */}
          <div className={`rounded-3xl p-5 shadow-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200/20">
              <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-500" />
                Daftar Tugas Selesai
              </h3>
              <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-black">
                {completedJobs.length} Total
              </span>
            </div>

            {performanceLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
                <p className="text-xs opacity-60">Mengambil data histori...</p>
              </div>
            ) : completedJobs.length === 0 ? (
              <div className="py-8 text-center">
                <div className={`w-16 h-16 ${isDark ? 'bg-slate-950' : 'bg-slate-50'} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner`}>
                  <ClipboardList size={32} className="text-slate-400" />
                </div>
                <p className="text-base font-black">Belum Ada Tugas Selesai</p>
                <p className="text-xs opacity-60 mt-1">Setelah menyelesaikan tugas, riwayat akan muncul di sini.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {completedJobs.map((job) => {
                  const jobDistance = job.job_routes?.reduce((sum: number, r: any) => sum + (Number(r.distance_km) || 0), 0) || 0;
                  return (
                    <div key={job.id} className={`rounded-2xl p-4 border ${isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-150'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-black">{job.jo_number}</p>
                          <p className="text-[10px] opacity-60 mt-0.5">
                            Selesai: {job.completed_at ? new Date(job.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-[9px] font-black">SELESAI ✓</span>
                      </div>
                      {job.wo_items?.item_data && (
                        <div className="text-xs opacity-70 font-semibold mb-2">
                          🚚 {job.wo_items.item_data.stops?.[0]?.location_name || '-'} → {job.wo_items.item_data.stops?.[job.wo_items.item_data.stops?.length - 1]?.location_name || '-'}
                        </div>
                      )}
                      <div className="text-[10px] font-semibold opacity-70 border-t pt-2 border-slate-200/50 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Total Hak: Rp {Number((job.base_price || 0) * (job.driver_share_percentage || 0) / 100).toLocaleString('id-ID')}</span>
                          <span>🛣️ {jobDistance.toFixed(0)} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Advance: {job.advance_status === 'paid' ? `Rp ${Number(job.advance_amount || 0).toLocaleString('id-ID')} ✓` : 'Pending'}</span>
                          <span>Sisa: Rp {Number(Math.max(0, (job.base_price || 0) * (job.driver_share_percentage || 0) / 100 - (job.advance_amount || 0) - (job.driver_payment_amount || 0))).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance & Finance Tab Panel Layer */}
      {step === 'performance' && (
        <div className={`fixed inset-0 z-30 overflow-y-auto pb-28 p-5 space-y-6 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
          <div className="flex items-center justify-between mt-2">
            <h2 className="text-xl font-black uppercase tracking-wider">Dasbor Kinerja & Keuangan</h2>
            <button onClick={() => setStep('dashboard')} className={`w-10 h-10 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white shadow-sm border border-slate-100'} rounded-full flex items-center justify-center`}>
              <X size={20} />
            </button>
          </div>

          {/* Interactive Financial Summary Widget */}
          <div className="space-y-4">

            <div className={`rounded-3xl p-5 shadow-xl border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border-blue-500/10' : 'bg-gradient-to-br from-blue-700 to-indigo-800 text-white'}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur shadow-md rounded-2xl flex items-center justify-center">
                  <Activity size={24} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Hak Driver Keseluruhan</p>
                  <h4 className="text-3xl font-black mt-0.5">Rp {totalHak.toLocaleString('id-ID')}</h4>
                </div>
              </div>
              <p className="text-xs opacity-75 mt-1 font-semibold leading-relaxed border-t border-white/10 pt-3">
                *Total hak bagi hasil (base_price × share%) dari seluruh JO yang sudah Anda selesaikan.
              </p>
            </div>

            <div className={`rounded-3xl p-5 shadow-xl border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 border-teal-500/10' : 'bg-gradient-to-br from-teal-600 to-cyan-700 text-white'}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur shadow-md rounded-2xl flex items-center justify-center">
                  <Coins size={24} className="text-teal-300" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Uang Jalan (Advance) Diterima</p>
                  <h4 className="text-3xl font-black mt-0.5">Rp {totalAdvanceReceived.toLocaleString('id-ID')}</h4>
                </div>
              </div>
              <p className="text-xs opacity-75 mt-1 font-semibold leading-relaxed border-t border-white/10 pt-3">
                *Total uang jalan/advance yang sudah ditransfer ke rekening Anda.
              </p>
            </div>

            <div className={`rounded-3xl p-5 shadow-xl border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/10' : 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white'}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur shadow-md rounded-2xl flex items-center justify-center">
                  <Coins size={24} className="text-emerald-300" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Pelunasan Diterima</p>
                  <h4 className="text-3xl font-black mt-0.5">Rp {(totalEarnings - totalAdvanceReceived).toLocaleString('id-ID')}</h4>
                </div>
              </div>
              <p className="text-xs opacity-75 mt-1 font-semibold leading-relaxed border-t border-white/10 pt-3">
                *Total pelunasan bagi hasil yang sudah ditransfer ke rekening Anda.
              </p>
            </div>

            <div className={`rounded-3xl p-5 shadow-xl border relative overflow-hidden ${isDark ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/10' : 'bg-gradient-to-br from-rose-600 to-pink-700 text-white'}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur shadow-md rounded-2xl flex items-center justify-center">
                  <Coins size={24} className="text-yellow-300" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">Outstanding Piutang Supir</p>
                  <h4 className="text-3xl font-black mt-0.5">Rp {outstandingBalance.toLocaleString('id-ID')}</h4>
                </div>
              </div>
              <p className="text-xs opacity-75 mt-1 font-semibold leading-relaxed border-t border-white/10 pt-3">
                *Total sisa bagi hasil yang belum dicairkan oleh perusahaan ke rekening Anda untuk job yang sudah Anda selesaikan.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* iOS & Android PWA Installation Guide Modal */}
      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white text-slate-800 border-slate-100'}`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
                <Download className="text-amber-500 animate-bounce" size={20} />
                Pasang Aplikasi Portal
              </h3>
              <button onClick={() => setShowIOSInstallGuide(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-850 hover:bg-slate-800' : 'bg-slate-100 hover:bg-slate-200'}`}>
                <X size={18} />
              </button>
            </div>

            {/* [AI] Premium Automatic Install Banner if browser prompt event is ready */}
            {deferredPrompt && (
              <div className={`mb-6 p-5 rounded-2xl text-center border transition-all ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-200 shadow-inner' : 'bg-amber-50/50 border-amber-200/50 text-slate-700'
              }`}>
                <p className="text-xs font-bold opacity-90 mb-3">HP Anda mendukung pemasangan otomatis:</p>
                <button 
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black py-4 px-4 rounded-2xl text-sm flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-lg shadow-amber-500/20 border border-amber-400"
                >
                  <Download size={18} className="animate-bounce" />
                  PASANG OTOMATIS SEKARANG
                </button>
              </div>
            )}

            {/* Visual Tabs for OS selection */}
            <div className="flex border-b border-slate-200/50 dark:border-slate-800/80 mb-5 gap-2">
              <button
                type="button"
                onClick={() => setInstallTab('android')}
                className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-all text-center border-b-2 ${
                  installTab === 'android'
                    ? 'text-amber-500 border-amber-500'
                    : 'text-slate-400 border-transparent hover:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                HP Android (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setInstallTab('ios')}
                className={`flex-1 pb-3 text-xs font-black uppercase tracking-wider transition-all text-center border-b-2 ${
                  installTab === 'ios'
                    ? 'text-amber-500 border-amber-500'
                    : 'text-slate-400 border-transparent hover:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                HP iPhone (Safari)
              </button>
            </div>
            
            {installTab === 'android' ? (
              <div className="space-y-4 text-sm leading-relaxed">
                <p className="font-semibold opacity-80 text-xs">Supir pengguna HP Android dapat memasang portal di layar utama dengan mudah:</p>
                
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">1</span>
                  <p>Buka portal ini di browser <strong>Google Chrome</strong> HP Anda.</p>
                </div>
                
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">2</span>
                  <p>Ketuk tombol <strong>titik tiga (⋮)</strong> di pojok kanan atas Chrome.</p>
                </div>
                
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">3</span>
                  <p>Cari dan ketuk pilihan <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</p>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">4</span>
                  <p>Ketuk **Instal** atau **Tambah** di layar. Aplikasi langsung terpasang di HP Android Anda!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm leading-relaxed">
                <p className="font-semibold opacity-80 text-xs">Supir pengguna iPhone/iOS dapat memasang portal di layar utama dengan mudah:</p>
                
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">1</span>
                  <p>Buka portal ini menggunakan browser <strong>Safari</strong> bawaan iPhone.</p>
                </div>
                
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">2</span>
                  <p>Ketuk tombol <strong>Share/Bagikan</strong> (ikon kotak dengan panah ke atas) di bagian tengah bawah Safari.</p>
                </div>
                
                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">3</span>
                  <p>Gulir ke bawah dan ketuk pilihan <strong>"Tambahkan ke Layar Utama"</strong> (*Add to Home Screen*).</p>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black shrink-0">4</span>
                  <p>Ketuk **Tambah** di pojok kanan atas. Aplikasi langsung terpasang di layar utama iPhone Anda!</p>
                </div>
              </div>
            )}

            <button 
              onClick={() => setShowIOSInstallGuide(false)} 
              className="w-full bg-amber-500 text-white font-black py-3 rounded-2xl text-sm mt-6 hover:bg-amber-600 active:scale-98 transition-all shadow-lg shadow-amber-500/20"
            >
              Mengerti & Siap Pasang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}