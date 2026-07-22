'use client';

import { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  Check,
  Navigation as NavIcon,
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
  ClipboardList,
  Expand,
  Lock,
  Send,
  FolderGit2,
  FileText
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { GoogleMap, MarkerF, PolylineF, DirectionsRenderer } from '@react-google-maps/api';
import { useDriverGpsPing } from '@/lib/hooks/useDriverGpsPing';

export default function DriverPortal() {
  const { isLoaded } = useGoogleMaps();
  const [step, setStep] = useState<'auth' | 'dashboard' | 'profile' | 'inspection' | 'jobDetail' | 'performance' | 'history'>('auth');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [driver, setDriver] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  // Theme Management: light / dark mode
  // [AI] read and write theme from localStorage, optimized for safe night-driving
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  // SOS States
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [sosCategory, setSosCategory] = useState<string>('');
  const [sosDescription, setSosDescription] = useState<string>('');
  const [sosLoading, setSosLoading] = useState(false);
  const [stopNotes, setStopNotes] = useState<{ [key: string]: string }>({});
  const [timelinePhotos, setTimelinePhotos] = useState<{ [key: string]: File | null }>({});
  const [timelinePhotoPreviews, setTimelinePhotoPreviews] = useState<{ [key: string]: string | null }>({});
  const [timelineLoading, setTimelineLoading] = useState<{ [key: string]: boolean }>({});

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

  // [AI] New States for Smart Geofencing & Panic Button SOS
  const [geofenceBanner, setGeofenceBanner] = useState<{ arrived_stop: string | null; distance_m: number | null } | null>(null);
  const [panicModalOpen, setPanicModalOpen] = useState(false);
  const [panicType, setPanicType] = useState<'swap_fleet' | 'swap_driver' | 'general'>('swap_fleet');
  const [panicReason, setPanicReason] = useState('');
  const [panicHasCargo, setPanicHasCargo] = useState<boolean>(true);
  const [panicSending, setPanicSending] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

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
          if (d.tenant_id) fetchTenantInfo(d.tenant_id);
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
    if ((step === 'dashboard' || step === 'profile') && driver?.id) {
      fetchActiveShift();
      fetchJobOrders();
      fetchInspections();
      fetchTotalKM();
    }
    if ((step === 'performance' || step === 'dashboard' || step === 'profile') && driver?.id) {
      fetchPerformanceData();
      fetchAttendanceHistory();
    }
  }, [step, driver]);

  const gpsPingJob = useMemo(
    () => selectedJob ?? jobOrders.find(jo => jo.driver_response === 'accepted') ?? null,
    [selectedJob, jobOrders],
  );
  const gpsPingToken = gpsPingJob?.driver_link_token || gpsPingJob?.id || null;
  useDriverGpsPing(gpsPingToken, gpsPingJob?.status, step !== 'auth' && !!driver?.id, (evt) => {
    if (evt.geofence_triggered) {
      setGeofenceBanner({ arrived_stop: evt.arrived_stop, distance_m: evt.distance_m });
      if (selectedJob) fetchJobDetails(selectedJob.id);
      fetchJobOrders();
    }
  });

  const fetchTotalKM = async () => {
    if (!driver?.id) return;
    const { data: allJobs } = await supabase
      .from('job_orders')
      .select('id, status')
      .eq('driver_id', driver.id)
      .limit(50);
    
    const doneStatuses = ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID', 'AWAITING_AUDIT', 'READY_FOR_BILLING', 'VERIFIED'];
    const doneJobs = (allJobs || []).filter(jo => {
      const s = (jo.status || '').toUpperCase();
      return doneStatuses.includes(s);
    });
    
    if (doneJobs.length > 0) {
      const jobIds = doneJobs.map(j => j.id);
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
      .select('*')
      .eq('driver_id', driver.id)
      .order('check_in', { ascending: false })
      .limit(10);
    if (data) {
      const fleetIds = data.map(a => a.fleet_id).filter(Boolean);
      if (fleetIds.length > 0) {
        const { data: fleets } = await supabase.from('md_fleets').select('id, plate_number').in('id', fleetIds);
        const fleetMap = new Map((fleets || []).map(f => [f.id, f]));
        data.forEach(a => { a.md_fleets = fleetMap.get(a.fleet_id) || null; });
      }
      setAttendanceHistory(data);
    }
  };

  const fetchPerformanceData = async () => {
    if (!driver?.id) return;
    setPerformanceLoading(true);
    try {
      const { data: allJobs } = await supabase
        .from('job_orders')
        .select('*')
        .eq('driver_id', driver.id)
        .order('completed_at', { ascending: false, nulls: 'last' })
        .limit(50);
      
      const completedStatuses = ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID', 'AWAITING_AUDIT', 'READY_FOR_BILLING', 'VERIFIED'];
      const completedJobs = (allJobs || []).filter(jo => {
        const s = (jo.status || '').toUpperCase();
        return completedStatuses.includes(s);
      });

      // [AI] Fetch wo_items, job_routes separately to avoid join 400 errors
      let enrichedJobs = completedJobs || [];
      const woItemIds = completedJobs.map(j => j.wo_item_id).filter(Boolean);
      const joIds = completedJobs.map(j => j.id).filter(Boolean);
      const allJoIds = (allJobs || []).map(j => j.id).filter(Boolean);
      const [woRes, routesRes, paymentsRes] = await Promise.all([
        woItemIds.length > 0
          ? supabase.from('wo_items').select('id, item_code, item_data').in('id', woItemIds)
          : Promise.resolve({ data: [], error: null }),
        joIds.length > 0
          ? supabase.from('job_routes').select('job_order_id, distance_km').in('job_order_id', joIds)
          : Promise.resolve({ data: [], error: null }),
        allJoIds.length > 0
          ? supabase.from('job_order_payments').select('*').in('job_order_id', allJoIds)
          : Promise.resolve({ data: [], error: null })
      ]);
      
      const woMap = new Map((woRes.data || []).map(w => [w.id, w]));
      const paymentsMap = new Map();
      (paymentsRes.data || []).forEach(p => {
        if (!paymentsMap.has(p.job_order_id)) paymentsMap.set(p.job_order_id, []);
        paymentsMap.get(p.job_order_id).push(p);
      });
      const routesMap = new Map();
      (routesRes.data || []).forEach(r => {
        if (!routesMap.has(r.job_order_id)) routesMap.set(r.job_order_id, []);
        routesMap.get(r.job_order_id).push(r);
      });
      
      enrichedJobs = completedJobs.map(j => {
        const pMap = paymentsMap.get(j.id) || [];
        const advancePayments = pMap.filter((p: any) => p.payment_type === 'advance_driver').reduce((s: number, p: any) => s + Number(p.amount), 0);
        const pelunasanPayments = pMap.filter((p: any) => p.payment_type === 'pelunasan_driver').reduce((s: number, p: any) => s + Number(p.amount), 0);
        const legacyAdv = (j.advance_status === 'paid' || j.advance_status === 'completed') ? Number(j.advance_amount || 0) : 0;
        const legacyPel = (j.driver_payment_status === 'paid' || j.driver_payment_status === 'completed') ? Math.max(Number(j.driver_payment_amount || 0), advancePayments > 0 ? advancePayments : legacyAdv) : 0;
        
        const advPaid = advancePayments > 0 ? advancePayments : legacyAdv;
        const pelPaid = pelunasanPayments > 0 ? pelunasanPayments : (legacyPel > advPaid ? legacyPel - advPaid : 0);
        
        const sp = Number(j.driver_share_percentage || 0);
        const bp = Number(j.base_price || 0);
        const ch = (sp > 0 && bp > 0) ? (bp * (sp / 100)) : 0;
        const hd = Number(j.driver_revenue_share) || ch || Number(j.driver_payment_amount) || Number(j.advance_amount) || 0;
        
        return {
          ...j,
          wo_items: woMap.get(j.wo_item_id) || null,
          job_routes: routesMap.get(j.id) || [],
          _finances: {
             hak: hd,
             advancePaid: advPaid,
             pelunasanPaid: pelPaid,
             totalPaid: advPaid + pelPaid,
             sisa: Math.max(0, hd - (advPaid + pelPaid))
          }
        };
      });
      
      setCompletedJobs(enrichedJobs);
      setTotalCompletedJobsCount(enrichedJobs.length);

      if (allJobs && allJobs.length > 0) {
        let totalDistance = 0;
        let sumEarnings = 0;
        let sumOutstanding = 0;
        let sumHak = 0;
        let sumAdvanceReceived = 0;
        
        // Distance only from completed
        for (const job of enrichedJobs) {
          const routeDist = job.job_routes?.reduce((sum: number, r: any) => sum + (Number(r.distance_km) || 0), 0) || 0;
          totalDistance += routeDist;
        }
        
        // Finances from all jobs that are either completed OR have payments
        for (const job of allJobs) {
          const pMap = paymentsMap.get(job.id) || [];
          const advancePayments = pMap.filter((p: any) => p.payment_type === 'advance_driver').reduce((s: number, p: any) => s + Number(p.amount), 0);
          const pelunasanPayments = pMap.filter((p: any) => p.payment_type === 'pelunasan_driver').reduce((s: number, p: any) => s + Number(p.amount), 0);
          const legacyAdv = (job.advance_status === 'paid' || job.advance_status === 'completed') ? Number(job.advance_amount || 0) : 0;
          const legacyPel = (job.driver_payment_status === 'paid' || job.driver_payment_status === 'completed') ? Math.max(Number(job.driver_payment_amount || 0), advancePayments > 0 ? advancePayments : legacyAdv) : 0;
          
          const advPaid = advancePayments > 0 ? advancePayments : legacyAdv;
          const pelPaid = pelunasanPayments > 0 ? pelunasanPayments : (legacyPel > advPaid ? legacyPel - advPaid : 0);
          
          const sp = Number(job.driver_share_percentage || 0);
          const bp = Number(job.base_price || 0);
          const ch = (sp > 0 && bp > 0) ? (bp * (sp / 100)) : 0;
          const hd = Number(job.driver_revenue_share) || ch || Number(job.driver_payment_amount) || Number(job.advance_amount) || 0;
          
          const isCompleted = completedStatuses.includes((job.status || '').toUpperCase());
          
          if (isCompleted || advPaid > 0 || pelPaid > 0) {
             sumHak += hd;
             sumAdvanceReceived += advPaid;
             sumEarnings += (advPaid + pelPaid);
             sumOutstanding += Math.max(0, hd - (advPaid + pelPaid));
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
        const monthCount = enrichedJobs.filter((j: any) => {
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
    const { data, error } = await supabase
      .from('driver_attendance')
      .select('*')
      .eq('driver_id', driver.id)
      .eq('status', 'CHECK_IN')
      .gte('check_in', today)
      .order('check_in', { ascending: false })
      .limit(1)
      .single();
    if (data && !error) {
      if (data.fleet_id) {
        const { data: fleet } = await supabase.from('md_fleets').select('id, plate_number').eq('id', data.fleet_id).single();
        if (fleet) data.md_fleets = fleet;
      }
      setActiveShift({ ...data, fleet: data.md_fleets });
    }
  };

  const fetchJobOrders = async () => {
    // [AI] Fetch active job orders, filter out completed in JS
    // Note: All joins done separately to avoid PostgREST 400 errors
    const { data, error } = await supabase
      .from('job_orders')
      .select('*')
      .eq('driver_id', driver.id)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error('[AI] Error fetching job orders:', JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint }));
      setJobOrders([]);
      return;
    }
    
    if (!data || data.length === 0) {
      setJobOrders([]);
      return;
    }
    
    // [AI] Fetch related data separately to avoid join 400 errors
    const woItemIds = data.map(jo => jo.wo_item_id).filter(Boolean);
    const joIds = data.map(jo => jo.id);
    const fleetIds = data.map(jo => jo.fleet_id).filter(Boolean);
    
    const [woRes, routesRes, fleetsRes, trackingRes] = await Promise.all([
      woItemIds.length > 0
        ? supabase.from('wo_items').select('id, item_code, item_data, wo_id').in('id', woItemIds)
        : Promise.resolve({ data: [], error: null }),
      joIds.length > 0
        ? supabase.from('job_routes').select('*').in('job_order_id', joIds).order('sequence', { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      fleetIds.length > 0
        ? supabase.from('md_fleets').select('id, plate_number').in('id', fleetIds)
        : Promise.resolve({ data: [], error: null }),
      joIds.length > 0
        ? supabase.from('job_tracking').select('*').in('job_order_id', joIds).order('created_at', { ascending: true })
        : Promise.resolve({ data: [], error: null })
    ]);

    const woItemData = woRes.data || [];
    const woIds = woItemData.map((w: any) => w.wo_id).filter(Boolean);
    
    const woDataRes = { data: [] as any[] };
    if (woIds.length > 0) {
      const { data } = await supabase.from('work_orders').select('id, wo_number').in('id', woIds);
      woDataRes.data = data || [];
    }
    
    const woMap = new Map((woItemData).map(w => [w.id, w]));
    const woDetailsMap = new Map((woDataRes.data).map((w: any) => [w.id, w]));
    const fleetMap = new Map((fleetsRes.data || []).map(f => [f.id, f]));
    
    const dataWithJoins = data.map(jo => ({
      ...jo,
      wo_items: woMap.get(jo.wo_item_id) || null,
      work_order: jo.wo_item_id ? woDetailsMap.get(woMap.get(jo.wo_item_id)?.wo_id) : null,
      md_fleets: fleetMap.get(jo.fleet_id) || null,
      job_routes: (routesRes.data || []).filter(r => r.job_order_id === jo.id).sort((a, b) => a.sequence - b.sequence),
      tracking_logs: (trackingRes.data || []).filter(t => t.job_order_id === jo.id)
    }));
    
    const completedStatuses = ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID', 'AWAITING_AUDIT', 'READY_FOR_BILLING', 'VERIFIED'];
    const activeJobs = dataWithJoins.filter(jo => {
      const s = (jo.status || '').toUpperCase();
      return !completedStatuses.includes(s);
    });
    setJobOrders(activeJobs);
  };

  const reloadJobWithFleet = async (jobId: string) => {
    const { data: job } = await supabase.from('job_orders').select('*').eq('id', jobId).single();
    if (job && job.fleet_id) {
      const { data: fleet } = await supabase.from('md_fleets').select('id, plate_number').eq('id', job.fleet_id).single();
      if (fleet) job.md_fleets = fleet;
    }
    if (job) {
      const { data: tracking } = await supabase.from('job_tracking').select('*').eq('job_order_id', job.id).order('created_at', { ascending: true });
      job.tracking_logs = tracking || [];
    }
    return job;
  };

  const fetchInspections = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('fleet_inspections')
      .select('*')
      .eq('driver_id', driver.id)
      .gte('created_at', today)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data && data.length > 0) {
      const fleetIds = data.map(i => i.fleet_id).filter(Boolean);
      if (fleetIds.length > 0) {
        const { data: fleets } = await supabase.from('md_fleets').select('id, plate_number').in('id', fleetIds);
        const fleetMap = new Map((fleets || []).map(f => [f.id, f]));
        data.forEach(i => { i.md_fleets = fleetMap.get(i.fleet_id) || null; });
      }
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
      let apiStatus = newStatus;
      if (newStatus === 'DITERIMA') apiStatus = 'accepted';
      if (newStatus === 'START JOURNEY' || newStatus === 'IN_PROGRESS') apiStatus = 'in_progress';
      if (newStatus === 'PEKERJAAN SELESAI' || newStatus === 'SELESAI') apiStatus = 'completed';

      let lat = null, lng = null;
      try {
          const pos = await new Promise<any>((resolve, reject) => {
              if (!navigator.geolocation) return reject('No geolocation');
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
      } catch (e) {
          console.warn('Geolocation failed', e);
      }

      // [AI] Call API to keep Intelligency tracking identical to vendor logic
      const response = await fetch(`/api/jo/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatus, lat, lng })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal memperbarui status');
      }

      // Optimistically update selectedJob state to reflect the new status immediately
      if (selectedJob && selectedJob.id === jobId) {
        if (newStatus === 'DITERIMA') {
          selectedJob.driver_response = 'accepted';
        }
        if (newStatus === 'START JOURNEY') {
          selectedJob.status = 'IN_PROGRESS';
        }
        if (newStatus === 'PEKERJAAN SELESAI' || newStatus === 'SELESAI') {
          selectedJob.status = 'COMPLETED';
        }
        // Force re‑render
        setSelectedJob({ ...selectedJob });
      }

      // [AI] Fleet & driver updates now handled by API (admin client)
      if (apiStatus === 'completed') {
        setSelectedJob(null);
        setStep('dashboard');
      } else {
        const reloadedJob = await reloadJobWithFleet(jobId);
        
        if (reloadedJob) {
            const woId = reloadedJob.wo_item_id;
            if (woId) {
              const { data: wo } = await supabase.from('wo_items').select('id, item_code, item_data').eq('id', woId).maybeSingle();
              reloadedJob.wo_items = wo;
            }
            
            const { data: existingRoutes } = await supabase.from('job_routes').select('*').eq('job_order_id', reloadedJob.id).order('sequence', { ascending: true });
            let finalRoutes = existingRoutes || [];
            
            if (finalRoutes.length === 0 && reloadedJob?.wo_items?.item_data?.stops) {
                const stops = reloadedJob.wo_items.item_data.stops;
                const routePayloads = stops.map((stop: any, idx: number) => ({
                  job_order_id: reloadedJob.id,
                  sequence: idx + 1,
                  stop_type: stop.stop_type || (idx === 0 ? 'PICKUP' : 'DROPOFF'),
                  source_type: 'MD_LOCATION',
                  source_id: 'LEGACY',
                  location_name: stop.location_name || '-',
                  address: stop.address || '-',
                  status: 'pending'
                }));
                const { data: newRoutes } = await supabase.from('job_routes').insert(routePayloads).select('*').order('sequence', { ascending: true });
                if (newRoutes) finalRoutes = newRoutes;
            }
            
            reloadedJob.routes = finalRoutes.sort((a: any, b: any) => a.sequence - b.sequence);
            setSelectedJob(reloadedJob);
        }
      }
      
      toast.success('Status berhasil diperbarui!');
      fetchJobOrders();
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRouteStatus = async (routeId: string, routeStatus: string) => {
    setLoading(true);
    try {
      // [AI] Frontend sequential validation: pastikan stop sebelumnya sudah completed
      if (selectedJobRoutes?.length > 0) {
        const currentIndex = selectedJobRoutes.findIndex((r: any) => r.id === routeId);
        if (currentIndex > 0) {
          const prevRoute = selectedJobRoutes[currentIndex - 1];
          if (prevRoute?.status !== 'completed') {
            throw new Error(`Selesaikan stop sebelumnya (${prevRoute?.location_name || '-'}) terlebih dahulu`);
          }
        }
      }

      let lat = null, lng = null;
      try {
          const pos = await new Promise<any>((resolve, reject) => {
              if (!navigator.geolocation) return reject('No geolocation');
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
      } catch (e) {
          console.warn('Geolocation failed', e);
      }

      const response = await fetch(`/api/jo/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_id: routeId, route_status: routeStatus, lat, lng })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal memperbarui rute');
      }
      
      toast.success(`Berhasil: ${routeStatus.toUpperCase()}`);
      
      // Reload job
      const reloadedJob = await reloadJobWithFleet(selectedJob.id);
      if (reloadedJob) {
          const woId = reloadedJob.wo_item_id;
          if (woId) {
            const { data: wo } = await supabase.from('wo_items').select('id, item_code, item_data').eq('id', woId).maybeSingle();
            reloadedJob.wo_items = wo;
          }
          const { data: routes } = await supabase.from('job_routes').select('*').eq('job_order_id', reloadedJob.id).order('sequence', { ascending: true });
          reloadedJob.routes = (routes || []).sort((a: any, b: any) => a.sequence - b.sequence);
          setSelectedJob(reloadedJob);
      }
      fetchJobOrders();
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const [photoLoading, setPhotoLoading] = useState<string | null>(null);
  const handleRoutePhotoUpload = async (routeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(routeId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch(`/api/jo/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          route_id: routeId, 
          pod_photo_base64: base64,
          pod_photo_name: file.name
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal simpan foto');
      }
      
      toast.success('Foto berhasil diunggah');
      const reloadedJob = await reloadJobWithFleet(selectedJob.id);
      if (reloadedJob) {
          const woId = reloadedJob.wo_item_id;
          if (woId) {
            const { data: wo } = await supabase.from('wo_items').select('id, item_code, item_data').eq('id', woId).maybeSingle();
            reloadedJob.wo_items = wo;
          }
          const { data: routes } = await supabase.from('job_routes').select('*').eq('job_order_id', reloadedJob.id).order('sequence', { ascending: true });
          reloadedJob.routes = (routes || []).sort((a: any, b: any) => a.sequence - b.sequence);
          setSelectedJob(reloadedJob);
      }
    } catch (err: any) {
      toast.error('Error foto: ' + err.message);
    } finally {
      setPhotoLoading(null);
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

  // COMPRESS IMAGE HELPER
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality JPEG
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // SEND TIMELINE EVENT
  const sendTimelineEvent = async (routeId: string) => {
    const notes = stopNotes[routeId] || '';
    const photo = timelinePhotos[routeId];
    
    if (!notes && !photo) {
      alert('Silakan isi catatan atau pilih foto terlebih dahulu.');
      return;
    }

    setTimelineLoading({...timelineLoading, [routeId]: true});
    try {
      let lat = 0, lng = 0;
      try {
          const position: GeolocationPosition = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: true });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
      } catch (e) {
          console.warn('Geolocation failed', e);
      }

      let base64Photo = null;
      let photoName = null;
      
      if (photo) {
        base64Photo = await compressImage(photo);
        photoName = photo.name;
      }

      const response = await fetch(`/api/jo/${selectedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add_timeline_event',
          route_id: routeId, 
          lat, lng, 
          route_notes: notes,
          pod_photo_base64: base64Photo,
          pod_photo_name: photoName
        })
      });

      if (!response.ok) {
        const d = await response.json();
        throw new Error(d.error || 'Gagal mengirim laporan');
      }

      // Clear inputs
      setStopNotes({...stopNotes, [routeId]: ''});
      setTimelinePhotos({...timelinePhotos, [routeId]: null});
      setTimelinePhotoPreviews({...timelinePhotoPreviews, [routeId]: null});
      toast.success('Laporan berhasil dikirim');
      
      // Refresh job data to fetch the new tracking logs
      const reloadedJob = await reloadJobWithFleet(selectedJob.id);
      if (reloadedJob) {
        const { data: routes } = await supabase.from('job_routes').select('*').eq('job_order_id', reloadedJob.id).order('sequence', { ascending: true });
        reloadedJob.routes = (routes || []).sort((a: any, b: any) => a.sequence - b.sequence);
        setSelectedJob(reloadedJob);
      }
    } catch (err: any) {
      console.error('Timeline Event Error:', err);
      toast.error(err.message);
    } finally {
      setTimelineLoading({...timelineLoading, [routeId]: false});
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

  const fetchTenantInfo = async (tenantId: string) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('name, logo_url')
      .eq('id', tenantId)
      .maybeSingle();
    if (data && !error) setTenantInfo(data);
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
          const { data: allRecentJobs } = await supabase
            .from('job_orders')
            .select('id, status')
            .eq('driver_id', driverOriginal.id)
            .limit(10);
          
    const completedStatuses = ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID', 'AWAITING_AUDIT', 'READY_FOR_BILLING', 'VERIFIED'];
          const activeJobs = (allRecentJobs || []).filter(jo => {
            const s = (jo.status || '').toUpperCase();
            return !completedStatuses.includes(s);
          });
          
          if (activeJobs.length === 0) {
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
        if (driverOriginal.tenant_id) fetchTenantInfo(driverOriginal.tenant_id);
        localStorage.setItem('sentralogis_driver_session', JSON.stringify(driverOriginal));
        setStep('dashboard');
        toast.success(`Selamat datang, ${driverOriginal.name}!`);
        setLoading(false);
        return;
      }
      
      if (driverData.is_working) {
        const { data: allRecentJobs } = await supabase
          .from('job_orders')
          .select('id, status')
          .eq('driver_id', driverData.id)
          .limit(10);
        
        const completedStatuses = ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID', 'READY_FOR_BILLING', 'VERIFIED'];
        const activeJobs = (allRecentJobs || []).filter(jo => {
          const s = (jo.status || '').toUpperCase();
          return !completedStatuses.includes(s);
        });
        
        if (activeJobs.length === 0) {
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
      if (driverData.tenant_id) fetchTenantInfo(driverData.tenant_id);
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

  const getJobActionButtonConfig = (status: string) => {
    const s = (status || '').toUpperCase().trim();
    if (['ASSIGNED', 'PENDING', 'NEED_ASSIGNMENT', 'ACTIVE', 'HANDOVER_PENDING'].includes(s)) {
      return {
        verb: 'TERIMA TUGAS INI',
        target: 'DITERIMA',
        color: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
      };
    }
    if (['DITERIMA', 'ACCEPTED', 'ORDER DITERIMA', 'MENUNGGU BERANGKAT', 'MENUNGGU MULAI / START'].includes(s)) {
      return {
        verb: 'MULAI JALAN (START)',
        target: 'START JOURNEY',
        color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
      };
    }
    if (['STARTED', 'START JOURNEY', 'DALAM PERJALANAN', 'IN PROGRESS', 'IN_PROGRESS', 'LOADING', 'UNLOADING', 'MENUNGGU SELESAI'].includes(s) || s.startsWith('MENUJU') || s.startsWith('TIBA')) {
      return {
        verb: 'PERJALANAN AKTIF',
        target: 'IN_PROGRESS',
        color: 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
      };
    }
    if (['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'VERIFIED', 'READY_FOR_BILLING'].includes(s)) {
      return {
        verb: 'TUGAS SELESAI',
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
          
          {/* Back to Portal Hub Button */}
          <div className="absolute top-6 left-6 z-50 pt-safe-area-top">
            <a href="/" className={`flex items-center gap-2 transition-colors px-4 py-2.5 rounded-full backdrop-blur-md border shadow-lg active:scale-95 ${isDark ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800' : 'bg-white/20 hover:bg-white/30 text-white border-white/30'}`}>
              <ChevronLeft className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Kembali ke Portal Hub</span>
            </a>
          </div>

          <div className="absolute top-6 right-6 flex items-center gap-3">
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
            <div className="text-center mb-8 space-y-2">
              <div className="mb-4 flex justify-center">
                <img src="/logo2sentralogis.png" alt="Sentralogis" className="h-16 w-auto drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Welcome to Trucking Portal</h1>
              <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Enter your registered WhatsApp & PIN to start mission console</p>
            </div>

            <form onSubmit={handleLogin} className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} backdrop-blur-2xl p-8 rounded-3xl border shadow-2xl space-y-6`}>
              <div className="space-y-3">
                <label className={`text-base font-bold uppercase tracking-wide ${isDark ? 'opacity-80 text-white' : 'text-slate-700'}`}>Nomor WhatsApp</label>
                <div className="relative">
                  <Phone className={`absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 ${isDark ? 'opacity-50' : 'text-slate-400'}`} />
                  <input 
                    type="tel"
                    placeholder="0812 3456 7890"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-blue-500'} border rounded-2xl py-5 pl-14 pr-4 text-xl font-bold outline-none transition-all`}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className={`text-sm font-bold uppercase tracking-wide ${isDark ? 'opacity-80 text-white' : 'text-slate-700'}`}>PIN 4 Digit</label>
                  <button type="button" onClick={() => setShowPin(!showPin)} className={`flex items-center gap-2 text-sm ${isDark ? 'opacity-60 hover:opacity-100' : 'text-slate-500 hover:text-slate-700'}`}>
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
                      className={`w-full aspect-square ${isDark ? 'bg-slate-950 border-slate-800 text-white focus:ring-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-blue-500'} border rounded-2xl text-center text-2xl font-black outline-none transition-all`}
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

  // [AI] Calculate progress & Milestones for Selected Job (aligned with vendor page)
  const selectedJobRoutes = (selectedJob?.routes || selectedJob?.job_routes || []).slice().sort((a: any, b: any) => a.sequence - b.sequence);
  const totalStops = selectedJobRoutes.length;
  const completedStops = selectedJobRoutes.filter((r: any) => {
    const s = (r.status || '').toLowerCase();
    return s === 'completed' || s === 'arrived' || !!r.actual_arrival;
  }).length;
  
  const mapMarkers = (selectedJobRoutes || []).map((stop: any) => {
    const lat = stop.latitude ? Number(stop.latitude) : null;
    const lng = stop.longitude ? Number(stop.longitude) : null;
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, sequence: stop.sequence, label: stop.location_name };
    }
    return null;
  }).filter(Boolean) as { lat: number; lng: number; sequence: number; label: string }[];

  const polylinePath = mapMarkers.map(m => ({ lat: m.lat, lng: m.lng }));
  const mapCenter = mapMarkers.length > 0 ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : { lat: -6.2, lng: 106.816666 };
  
  useEffect(() => {
    if (!isLoaded || mapMarkers.length < 2 || typeof google === 'undefined') return;

    const directionsService = new google.maps.DirectionsService();
    const origin = { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng };
    const destination = { lat: mapMarkers[mapMarkers.length - 1].lat, lng: mapMarkers[mapMarkers.length - 1].lng };
    const waypoints = mapMarkers.slice(1, -1).map(s => ({
      location: { lat: s.lat, lng: s.lng },
      stopover: true
    }));

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
        }
      }
    );
  }, [isLoaded, JSON.stringify(polylinePath)]);
  
  const milestones = selectedJob ? [
    { id: 'start', label: 'TERIMA', status: selectedJob.accepted_at ? 'completed' : 'pending' },
    { id: 'depart', label: 'BERANGKAT', status: (selectedJob.started_at || (selectedJob.status || '').toUpperCase() === 'DALAM PERJALANAN' || (selectedJob.status || '').toUpperCase().startsWith('MENUJU')) ? 'completed' : (selectedJob.accepted_at || (selectedJob.status || '').toUpperCase() === 'MENUNGGU MULAI / START' || (selectedJob.status || '').toUpperCase() === 'ORDER DITERIMA' ? 'current' : 'pending') },
    ...selectedJobRoutes.map((s: any) => ({
      id: s.id,
      label: s.location_name,
      status: s.status === 'completed' ? 'completed' : (s.status === 'arrived' || (selectedJob.status || '').toUpperCase().includes(s.location_name.toUpperCase()) ? 'current' : 'pending')
    })),
    { id: 'finish', label: 'SELESAI', status: (selectedJob.completed_at || ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID'].includes((selectedJob.status || '').toUpperCase())) ? 'completed' : 'pending' }
  ] : [];

  const progress = (() => {
    if (!milestones.length) return 0;
    const total = milestones.length;
    const reached = milestones.filter(m => m.status === 'completed').length;
    const current = milestones.findIndex(m => m.status === 'current');
    
    let base = (reached / total) * 100;
    if (current !== -1) {
      base = (current / total) * 100 + (1 / total * 50); // halfway to current
    }
    return Math.min(base, 100);
  })();

  // Dashboard & Worksheets
  return (
    <div className={`min-h-screen pb-28 font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Toaster position="top-center" />
      
      {/* Visual Premium Header */}
      <header className={`relative p-4 pb-14 rounded-b-[2.5rem] shadow-2xl overflow-hidden transition-all duration-300 ${isDark ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white border-b border-indigo-900/20' : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white'}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Top Row: Tenant Brand + Title + Theme Toggle + Panic SOS Button */}
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5">
            {tenantInfo?.logo_url ? (
              <img
                src={tenantInfo.logo_url}
                alt={tenantInfo.name}
                className="w-9 h-9 rounded-xl object-contain bg-white/20 backdrop-blur-md p-1 border border-white/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Building size={18} className="opacity-70" />
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                {tenantInfo?.name || 'SENTRALOGIS'} — Driver Portal
              </p>
              <h2 className="text-xl font-bold mt-0">{driver?.name || 'Supir'}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Download/Install PWA Button */}
            {/* [AI] PWA Install button is always visible in the header for driver convenience */}
            <button 
              onClick={handleInstallPWA} 
              className="w-9 h-9 bg-amber-500 border border-amber-400 text-white rounded-xl flex items-center justify-center hover:bg-amber-600 transition-all shrink-0 animate-bounce shadow-lg shadow-amber-500/20"
              title="Unduh Aplikasi SentraLogis"
            >
              <Download size={16} />
            </button>

            {/* Mode Switcher */}
            <button onClick={toggleTheme} className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
              {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>

            {/* Logout */}
            <button onClick={() => {
              localStorage.removeItem('sentralogis_driver_session');
              setDriver(null);
              setStep('auth');
            }} className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all shrink-0">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Attendance Status Widget */}
        <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${activeShift ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-slate-500/30 text-slate-300'}`}>
                {activeShift ? <CheckCircle size={20} /> : <Clock size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Status Driver</p>
                <p className="text-base font-bold mt-0">{activeShift ? 'AKTIF BEKERJA (ON DUTY)' : 'BELUM ABSEN (OFF DUTY)'}</p>
                {activeShift && (
                  <span className="inline-block mt-1 text-[10px] font-black bg-white/15 px-2 py-0.5 rounded-full">
                    🚛 {activeShift.fleet?.plate_number}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons: Moved SOS below Status Driver */}
          <button 
            onClick={() => setIsSOSModalOpen(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/20 hover:bg-rose-600 active:scale-[0.98] transition-all"
          >
            <AlertOctagon size={18} className="animate-pulse" />
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

        {/* Visual premium separation of jobs */}
        {(() => {
          const activeJob = jobOrders.find(jo => jo.driver_response === 'accepted');
          const newJobs = jobOrders.filter(jo => jo.driver_response !== 'accepted');
          
          return (
            <>
              {/* Tugas Aktif Saat Ini Widget */}
              {activeJob && (
                <div className="relative rounded-3xl p-6 bg-slate-900 border-2 border-indigo-500/30 text-white shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 shadow-lg">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" /> TUGAS AKTIF SAAT INI
                        </span>
                        <h3 className="text-xl font-black mt-2 leading-none tracking-tight">{activeJob.jo_number}</h3>
                        <p className="text-xs text-slate-400 mt-1.5 uppercase font-bold tracking-tight">Plat Truk: {activeJob.md_fleets?.plate_number || '-'}</p>
                      </div>
                      <div className="bg-white/10 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] italic">
                        {(() => {
                          const s = (activeJob.status || '').toUpperCase();
                          if (s === 'ACCEPTED' || s === 'DITERIMA') return 'ORDER DITERIMA';
                          if (s === 'IN_PROGRESS' || s === 'DALAM PERJALANAN') return 'DALAM PERJALANAN';
                          if (s === 'COMPLETED' || s === 'PEKERJAAN SELESAI') return 'PEKERJAAN SELESAI';
                          return s.replace('_', ' ');
                        })()}
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-2">Shipper / Pelanggan</h4>
                      <p className="text-base font-black uppercase italic leading-none">{activeJob.wo_items?.item_data?.shipper_name || 'SENTRALOGIS'}</p>
                      {activeJob.wo_items?.item_data && (
                        <div className="text-xs text-slate-300 font-semibold mt-3 pt-3 border-t border-white/5">
                          🚚 {activeJob.wo_items.item_data.stops?.[0]?.location_name || 'Loading Point'} → {activeJob.wo_items.item_data.stops?.[activeJob.wo_items.item_data.stops?.length - 1]?.location_name || 'Unload Point'}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => { setSelectedJob(activeJob); setStep('jobDetail'); }}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group"
                    >
                      UPDATE PERJALANAN <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* New Assignment Job Orders List */}
              <div className={`rounded-3xl p-5 shadow-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black uppercase tracking-wider">Penugasan Baru</h3>
                  <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full text-xs font-black">
                    {newJobs.length} Baru
                  </span>
                </div>
                
                {newJobs.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className={`w-16 h-16 ${isDark ? 'bg-slate-950' : 'bg-slate-50'} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner`}>
                      <Package size={32} className="text-slate-400" />
                    </div>
                    <p className="text-base font-black">Belum Ada Tugas Baru</p>
                    <p className="text-xs opacity-60 mt-1">Menunggu penugasan baru dari kantor. Pastikan Anda sudah absen dan inspeksi.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {newJobs.map((jo) => (
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
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              jo.driver_response === 'rejected'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {jo.driver_response === 'rejected' ? 'DITOLAK' : 'BARU / ASSIGNED'}
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
            </>
          );
        })()}
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

      {/* Job Detail Overlay - Full screen view aligned with /jo/[token]/page.tsx */}
      {step === 'jobDetail' && selectedJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f8fafc] text-slate-800 font-sans pb-32">
          {/* Header */}
          <div className="bg-white border-b border-slate-100 px-6 pt-6 pb-6 shadow-sm sticky top-0 z-30 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setStep('dashboard'); setSelectedJob(null); }}
                className="flex items-center gap-1.5 text-blue-600 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                <ChevronLeft size={20} /> KEMBALI
              </button>
              <span className="text-slate-300">|</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Detail Penugasan</h3>
            </div>
            {/* Download/Install PWA button */}
            <button 
              onClick={handleInstallPWA} 
              className="p-2 bg-amber-500 text-white rounded-xl flex items-center justify-center hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20 active:scale-95"
              title="Unduh Aplikasi"
            >
              <Download size={16} />
            </button>
          </div>

          <main className="max-w-xl mx-auto px-6 pt-6 space-y-6">
            {/* [AI] Smart Geofence Auto-Arrival Banner */}
            {geofenceBanner && (
              <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-2xl border-4 border-emerald-300 animate-in fade-in slide-in-from-top-4 duration-500 relative">
                <button 
                  onClick={() => setGeofenceBanner(null)} 
                  className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 bg-black/20 rounded-full"
                  title="Tutup Banner"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg text-xl animate-bounce">
                    📍
                  </div>
                  <div className="pr-6">
                    <h3 className="text-base font-black tracking-tight uppercase leading-tight mb-1">
                      TIBA DI {geofenceBanner.arrived_stop || 'LOKASI TUJUAN'}
                    </h3>
                    <p className="text-xs font-bold text-emerald-100 leading-relaxed">
                      Terverifikasi otomatis via Geofence (Radius {geofenceBanner.distance_m || '< 500'}m). HP bergetar & status rute telah diperbarui!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Advance Payment Notification */}
            {(selectedJob.advance_status === 'paid' || selectedJob.advance_status === 'completed') && (
              <div className="mb-6 bg-emerald-600 text-white p-5 rounded-[2rem] shadow-xl shadow-emerald-600/20 flex items-center gap-5 animate-in slide-in-from-top-4 duration-700">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Check size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-1">DANA OPERASIONAL CAIR</p>
                  <h3 className="text-lg font-black tracking-tight leading-none">
                    Uang jalan Rp. {new Intl.NumberFormat('id-ID').format(selectedJob.advance_amount || 0)} telah ditransfer.
                  </h3>
                  <p className="text-[9px] font-bold text-emerald-100/60 uppercase mt-1">Silakan memulai perjalanan Anda.</p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-black text-blue-900 uppercase tracking-tight">JO: {selectedJob.jo_number}</p>
              <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] italic">
                {(() => {
                  const s = (selectedJob.status || '').toUpperCase();
                  if (s === 'ACCEPTED' || s === 'DITERIMA') return 'ORDER DITERIMA';
                  if (s === 'IN_PROGRESS' || s === 'DALAM PERJALANAN') return 'DALAM PERJALANAN';
                  if (s === 'COMPLETED' || s === 'PEKERJAAN SELESAI') return 'PEKERJAAN SELESAI';
                  return s.replace('_', ' ');
                })()}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/50 shadow-inner mb-4">
              <h1 className="text-2xl font-black text-slate-800 leading-tight mb-2 tracking-tighter uppercase italic">
                {selectedJob.wo_items?.item_data?.shipper_name || 'SENTRALOGIS'}
              </h1>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-rose-600" />
                <span className="text-sm text-rose-600 font-black tracking-tight">
                  {formatDate(selectedJob.wo_items?.item_data?.execution_date || selectedJob.created_at)}
                </span>
                {selectedJob.wo_items?.item_data?.execution_time && (
                  <>
                    <span className="text-slate-300 mx-1">|</span>
                    <Clock size={16} className="text-rose-600" />
                    <span className="text-sm text-rose-600 font-black tracking-tight">
                      {selectedJob.wo_items.item_data.execution_time}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Driver & Fleet Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                  <Phone size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Driver</p>
                  <p className="text-xs font-black text-slate-800 truncate uppercase italic">{driver?.name || '-'}</p>
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                  <Truck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{selectedJob.wo_items?.item_data?.vehicle_type_name || 'Fleet'}</p>
                  <p className="text-xs font-black text-slate-800 truncate uppercase italic">{selectedJob.md_fleets?.plate_number || '-'}</p>
                </div>
              </div>
            </div>

            {/* Dokumen Pengantar / Manifest dari Kantor (Khusus Supir) */}
            <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <FolderGit2 size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">DOKUMEN PENGANTAR & MANIFEST</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Surat Jalan, Manifest & Instruksi Kerja</p>
                </div>
              </div>

              {selectedJob.assignment_documents && selectedJob.assignment_documents.length > 0 ? (
                <div className="space-y-3 pt-1">
                  {selectedJob.assignment_documents.map((doc: any, idx: number) => (
                    <div key={doc.id || idx} className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                          {doc.name?.endsWith('.pdf') || doc.file_type?.includes('pdf') ? (
                            <FileText size={20} className="text-red-500" />
                          ) : (
                            <ImageIcon size={20} className="text-blue-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[8px] uppercase tracking-wider mb-1">
                            {(doc.type || 'SURAT_JALAN').replace(/_/g, ' ')}
                          </span>
                          <p className="text-xs font-bold text-slate-800 truncate" title={doc.name}>
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">{doc.file_size || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                        >
                          <Eye size={14} /> BUKA
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-blue-200 rounded-2xl p-4 text-center bg-blue-50/30">
                  <p className="text-xs font-bold text-slate-500 mb-1">Belum ada dokumen digital yang dilampirkan admin.</p>
                  <p className="text-[10px] text-slate-400">Surat Jalan fisik / manifest akan diserahkan oleh dispatcher sebelum armada berangkat.</p>
                </div>
              )}
            </div>

            {/* Journey Pipeline - HANYA TAMPIL JIKA BELUM SELESAI */}
            {totalStops > 0 && !['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID', 'ready_for_billing', 'verified'].includes((selectedJob.status || '').toUpperCase()) && (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                   <Activity size={12} className="text-indigo-600" /> JOURNEY PIPELINE
                </h2>
                <div className="relative px-2">
                  {/* Line background */}
                  <div className="absolute top-4 left-4 right-4 h-[2px] bg-slate-100 rounded-full" />
                  {/* Line progress */}
                  <div 
                    className="absolute top-4 left-4 h-[2px] bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: progress > 0 ? `calc(${progress}% - 32px)` : '0px' }}
                  />
                  
                  <div className="relative flex justify-between">
                    {milestones.map((m, idx) => (
                      <div key={m.id} className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black z-10 transition-all duration-500 shadow-sm ${
                          m.status === 'completed' ? 'bg-emerald-500 text-white' : 
                          m.status === 'current' ? 'bg-blue-600 text-white animate-pulse' : 
                          'bg-white border-2 border-slate-100 text-slate-300'
                        }`}>
                          {idx + 1}
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 mt-2 text-center max-w-[60px] truncate uppercase tracking-tighter">
                          {m.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Google Map ("Peta Petunjuk") */}
            {isLoaded && mapMarkers.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm overflow-hidden">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                   <NavIcon size={12} className="text-indigo-600 animate-pulse" /> PETA PETUNJUK RUTE
                </h2>
                <div className="h-64 rounded-xl overflow-hidden border border-slate-100 relative">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={11}
                    options={{
                      disableDefaultUI: false,
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false,
                    }}
                  >
                    {mapMarkers.map((marker) => (
                      <MarkerF
                        key={marker.sequence}
                        position={{ lat: marker.lat, lng: marker.lng }}
                        label={{
                          text: String(marker.sequence),
                          color: '#ffffff',
                          fontWeight: 'black',
                        }}
                      />
                    ))}
                    {directionsResponse ? (
                      <DirectionsRenderer
                        directions={directionsResponse}
                        options={{
                          suppressMarkers: true,
                          polylineOptions: {
                            strokeColor: '#3b82f6',
                            strokeOpacity: 0.9,
                            strokeWeight: 5,
                          }
                        }}
                      />
                    ) : (
                      polylinePath.length > 1 && (
                        <PolylineF
                          path={polylinePath}
                          options={{
                            strokeColor: '#3b82f6',
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                          }}
                        />
                      )
                    )}
                  </GoogleMap>
                </div>
              </div>
            )}

            {/* [AI] Blocked Page When Job Order is Completed */}
            {['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID', 'READY_FOR_BILLING', 'VERIFIED'].includes((selectedJob.status || '').toUpperCase()) ? (
              <div className="bg-rose-50 border-4 border-rose-500 rounded-[2.5rem] p-8 sm:p-12 text-center shadow-2xl my-8 relative overflow-hidden animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-rose-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl shadow-lg shadow-rose-500/30 animate-bounce">
                  🏁
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-rose-700 uppercase tracking-tight mb-3">
                  PEKERJAAN TELAH SELESAI
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
                  Tugas pengiriman ini telah ditutup dan disahkan selesai. Seluruh akses tindakan supir pada halaman ini telah dikunci/diblokir oleh sistem.
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl border border-rose-200 text-rose-600 font-black text-xs uppercase tracking-widest shadow-sm">
                  <CheckCircle2 size={16} className="text-emerald-500" /> STATUS: {selectedJob.status?.toUpperCase()}
                </div>
              </div>
            ) : (
              <>
            {/* Action Section - HANYA TAMPIL JIKA BELUM SELESAI */}
            {!['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID', 'ready_for_billing', 'verified'].includes((selectedJob.status || '').toUpperCase()) && (
              <div className="space-y-4">
                {/* Phase 1: Confirmation (Accept/Reject) */}
                {selectedJob.driver_response !== 'accepted' && (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleUpdateJobStatus(selectedJob.id, 'DITERIMA')}
                      disabled={loading}
                      className="h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> TERIMA</>}
                    </button>
                    <button
                      onClick={async () => {
                        const confirmReject = window.confirm('Apakah Anda yakin ingin MENOLAK tugas ini?');
                        if (!confirmReject) return;
                        const note = window.prompt('Alasan penolakan (opsional):');
                        
                        setLoading(true);
                        try {
                          let lat = null, lng = null;
                          try {
                              const pos = await new Promise<any>((resolve, reject) => {
                                  if (!navigator.geolocation) return reject('No geolocation');
                                  navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                              });
                              lat = pos.coords.latitude;
                              lng = pos.coords.longitude;
                          } catch (e) {}

                          const response = await fetch(`/api/jo/${selectedJob.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'rejected', rejection_note: note, lat, lng })
                          });
                          
                          if (!response.ok) {
                            const result = await response.json();
                            throw new Error(result.error || 'Gagal menolak tugas');
                          }
                          
                          toast.success('Tugas telah ditolak');
                          setSelectedJob(null);
                          setStep('dashboard');
                          fetchJobOrders();
                        } catch (err: any) {
                          toast.error('Error: ' + err.message);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all shadow-rose-600/20"
                    >
                      <X size={20} /> TOLAK
                    </button>
                  </div>
                )}

                {/* Phase 2: Start Journey */}
                {selectedJob.driver_response === 'accepted' && ['assigned', 'accepted', 'DITERIMA', 'ORDER DITERIMA', 'MENUNGGU BERANGKAT', 'MENUNGGU MULAI / START'].includes(selectedJob.status) && (
                  <button
                    onClick={() => handleUpdateJobStatus(selectedJob.id, 'START JOURNEY')}
                    disabled={loading}
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Truck size={22} /> 
                        BERANGKAT MENUJU {selectedJobRoutes[0]?.location_name?.toUpperCase() || 'LOKASI'}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Rute Perjalanan List */}
            {totalStops > 0 && (
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                   <MapPin size={12} /> RUTE PERJALANAN
                </h2>
                {selectedJobRoutes.map((stop: any) => (
                  <div key={stop.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${
                     stop.status === 'completed' ? 'border-emerald-100 opacity-75' : 
                     stop.status === 'arrived' ? 'border-blue-200 ring-2 ring-blue-50' : 
                     'border-slate-100'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          stop.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                          stop.status === 'arrived' ? 'bg-blue-50 text-blue-600' : 
                          'bg-slate-50 text-slate-400'
                        }`}>
                          {stop.sequence}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                              stop.stop_type === 'PICKUP' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {stop.stop_type}
                            </span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-base mt-1 uppercase tracking-tight leading-none truncate">{stop.location_name}</h3>
                          <p className="text-[11px] font-medium text-slate-400 leading-relaxed mt-1 break-words">{stop.address}</p>
                          {stop.notes && (
                            <p className="text-[11px] font-semibold text-slate-500 italic mt-1 bg-yellow-50 p-1.5 rounded border border-yellow-100 dark:bg-yellow-900/20 dark:border-yellow-900/50 dark:text-yellow-200">
                              "{stop.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm border border-blue-100"
                          title="Buka Navigasi"
                        >
                          <NavIcon size={18} fill="currentColor" className="opacity-80" />
                        </a>

                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="hidden"
                            id={`photo-${stop.id}`}
                            onChange={(e) => handleRoutePhotoUpload(stop.id, e)}
                          />
                          <label 
                            htmlFor={`photo-${stop.id}`}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm border cursor-pointer ${
                              stop.pod_photo_url ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                            }`}
                          >
                            {photoLoading === stop.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : stop.pod_photo_url ? (
                              <Check size={18} />
                            ) : (
                              <Camera size={18} />
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Photo POD Preview Thumbnail */}
                    {stop.pod_photo_url && (
                      <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-2">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Foto Bukti POD</span>
                         <div 
                           onClick={() => setSelectedPhotoPreview(stop.pod_photo_url!)}
                           className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200/80 cursor-pointer active:scale-95 transition-all group shadow-sm bg-slate-100"
                         >
                           <img src={stop.pod_photo_url} alt="POD Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                           <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                             <Expand size={16} />
                           </div>
                         </div>
                      </div>
                    )}

                    {/* Arrival/Departure info */}
                    {(stop.actual_arrival || stop.actual_departure) && (
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
                         <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Tiba</p>
                            <p className="text-xs font-black text-slate-700">{formatTime(stop.actual_arrival)}</p>
                         </div>
                         <div className="text-center">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Berangkat</p>
                            <p className="text-xs font-black text-slate-700">{formatTime(stop.actual_departure)}</p>
                         </div>
                      </div>
                    )}

                    {/* TIMELINE / LIVE UPDATES CHAT BOX */}
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity size={14} className="text-blue-500" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Updates / Timeline</h4>
                      </div>
                      
                      {/* List of historical logs for this stop */}
                      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {(selectedJob.tracking_logs || [])
                          .filter((log: any) => log.job_route_id === stop.id || log.notes?.includes(stop.id))
                          .map((log: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60 flex flex-col gap-2 relative">
                              <div className="absolute top-3 right-3 text-[9px] font-bold text-slate-400">
                                {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 pr-10 leading-relaxed">
                                {log.notes?.replace(/\[ROUTE:[0-9a-fA-F-]{36}\] /g, '').replace(/Route ID: [0-9a-fA-F-]{36}( \| Catatan: )?(\(Photo Attached\) )?/g, '').trim() || 'Pembaruan Status'}
                              </p>
                              {log.photo_url && (
                                <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedPhotoPreview(log.photo_url); }}>
                                  <img src={log.photo_url} alt="Update" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          ))}
                        
                        {(selectedJob.tracking_logs || []).filter((log: any) => log.job_route_id === stop.id || log.notes?.includes(stop.id)).length === 0 && (
                          <div className="text-center py-4 text-[10px] font-medium text-slate-400 italic bg-slate-50/50 dark:bg-slate-900/20 rounded-xl">
                            Belum ada laporan untuk lokasi ini.
                          </div>
                        )}
                      </div>

                      {/* Timeline Input Area */}
                      {(['IN_PROGRESS', 'DALAM PERJALANAN', 'STARTED', 'START JOURNEY', 'LOADING', 'UNLOADING', 'MENUNGGU SELESAI'].includes((selectedJob.status || '').toUpperCase()) || (selectedJob.status || '').toUpperCase().startsWith('MENUJU') || (selectedJob.status || '').toUpperCase().startsWith('TIBA')) && (
                        <div className="flex flex-col gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 transition-all">
                          {timelinePhotoPreviews[stop.id] && (
                            <div className="p-2 relative w-fit">
                              <img src={timelinePhotoPreviews[stop.id]!} alt="Preview" className="h-16 rounded-lg object-cover border border-slate-200" />
                              <button 
                                onClick={() => {
                                  setTimelinePhotos({...timelinePhotos, [stop.id]: null});
                                  setTimelinePhotoPreviews({...timelinePhotoPreviews, [stop.id]: null});
                                }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-2 px-1">
                            <label className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl cursor-pointer transition-colors">
                              <Camera size={18} />
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setTimelinePhotos({...timelinePhotos, [stop.id]: file});
                                    setTimelinePhotoPreviews({...timelinePhotoPreviews, [stop.id]: URL.createObjectURL(file)});
                                  }
                                }}
                              />
                            </label>
                            <input
                              type="text"
                              placeholder="Ketik laporan / kendala antrian..."
                              value={stopNotes[stop.id] || ''}
                              onChange={(e) => setStopNotes({...stopNotes, [stop.id]: e.target.value})}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') sendTimelineEvent(stop.id);
                              }}
                              className="flex-1 bg-transparent text-xs font-semibold py-3 px-1 outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400/60"
                            />
                            <button
                              onClick={() => sendTimelineEvent(stop.id)}
                              disabled={timelineLoading[stop.id]}
                              className="p-2.5 mr-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-md transition-all active:scale-95"
                            >
                              {timelineLoading[stop.id] ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Geofence Otomatis per Rute */}
                    {(['IN_PROGRESS', 'DALAM PERJALANAN', 'STARTED', 'START JOURNEY', 'LOADING', 'UNLOADING', 'MENUNGGU SELESAI'].includes((selectedJob.status || '').toUpperCase()) || (selectedJob.status || '').toUpperCase().startsWith('MENUJU') || (selectedJob.status || '').toUpperCase().startsWith('TIBA')) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status Kedatangan:</span>
                        {stop.status === 'completed' ? (
                          <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Selesai ({stop.stop_type})
                          </span>
                        ) : stop.status === 'arrived' ? (
                          <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                            <MapPin size={13} /> Tiba di Titik (Geofence Terverifikasi)
                          </span>
                        ) : (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                            Menunggu Tiba Otomatis via Satelit (&lt; 500m)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Final Job Completion Actions */}
            {(['IN_PROGRESS', 'DALAM PERJALANAN', 'STARTED', 'START JOURNEY', 'LOADING', 'UNLOADING', 'MENUNGGU SELESAI'].includes((selectedJob.status || '').toUpperCase()) || (selectedJob.status || '').toUpperCase().startsWith('MENUJU') || (selectedJob.status || '').toUpperCase().startsWith('TIBA')) && (
              <div className="pt-6 pb-12 border-t border-slate-200 mt-8">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/30 relative overflow-hidden">
                   <div className="relative z-10 text-slate-100">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                            <CheckCircle size={20} className="text-emerald-400" />
                         </div>
                         <div>
                            <h4 className="text-white font-black text-sm uppercase tracking-widest">Konfirmasi Selesai</h4>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-tight">Pastikan semua dokumen & foto POD sudah diunggah</p>
                         </div>
                      </div>

                      {completedStops < totalStops && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
                           <AlertTriangle size={18} className="text-amber-400 shrink-0" />
                           <p className="text-[10px] font-bold text-amber-200 uppercase leading-tight">
                              Masih ada {totalStops - completedStops} lokasi yang belum ditandai selesai. Lanjutkan?
                           </p>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (completedStops < totalStops && totalStops > 0) {
                            const unvisited = totalStops - completedStops;
                            if (!window.confirm(`⚠️ PERINGATAN: Masih ada ${unvisited} titik lokasi rute yang belum ditandai selesai/terverifikasi oleh satelit.\n\nApakah Anda YAKIN tetap ingin menyelesaikan pekerjaan ini sekarang?`)) {
                              return;
                            }
                          } else {
                            if (!window.confirm('Apakah Anda yakin ingin menyelesaikan seluruh pekerjaan dan menutup job ini?')) {
                              return;
                            }
                          }

                          handleUpdateJobStatus(selectedJob.id, 'PEKERJAAN SELESAI');
                        }}
                        disabled={loading}
                        className="w-full h-16 bg-white text-slate-900 hover:bg-slate-50 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group"
                      >
                        {loading ? (
                           <Loader2 className="animate-spin" />
                        ) : (
                           <>PEKERJAAN SELESAI <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                        )}
                      </button>
                   </div>
                   <Activity className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12" />
                </div>
              </div>
            )}
            </>
            )}
          </main>
        </div>
      )}

      {/* 🖼️ PHOTO OVERLAY LIGHTBOX MODAL */}
      {selectedPhotoPreview && (
        <div 
          className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" 
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div className="relative max-w-4xl w-full h-full max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
             <button 
               className="absolute -top-12 right-0 text-white hover:text-slate-300 flex items-center gap-2 font-black uppercase text-xs tracking-widest"
               onClick={() => setSelectedPhotoPreview(null)}
             >
                Close <X className="w-6 h-6" />
             </button>
             <div className="relative w-full h-full bg-white rounded-3xl overflow-hidden shadow-2xl">
                <img src={selectedPhotoPreview} alt="Evidence Full" className="w-full h-full object-contain" />
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
                          <span>Total Hak: Rp {Number(job._finances?.hak || 0).toLocaleString('id-ID')}</span>
                          <span>🛣️ {jobDistance.toFixed(0)} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Advance: {job._finances?.advancePaid > 0 ? `Rp ${Number(job._finances.advancePaid).toLocaleString('id-ID')} ✓` : 'Pending'}</span>
                          <span>Sisa: Rp {Number(job._finances?.sisa || 0).toLocaleString('id-ID')}</span>
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

      {/* [AI] Floating Panic Button SOS (Tampil Jika Ada Pekerjaan Aktif) */}
      {gpsPingJob && (gpsPingJob.status === 'in_progress' || gpsPingJob.status === 'DALAM PERJALANAN' || (gpsPingJob.status || '').startsWith('MENUJU') || (gpsPingJob.status || '').startsWith('TIBA')) && step !== 'auth' && (
        <button
          onClick={() => setPanicModalOpen(true)}
          className="fixed bottom-24 right-6 z-50 w-16 h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex flex-col items-center justify-center shadow-2xl shadow-rose-600/50 border-4 border-rose-300 active:scale-90 transition-all animate-pulse"
          title="Tombol Darurat SOS"
        >
          <span className="text-xl leading-none">🚨</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">SOS</span>
        </button>
      )}

      {/* [AI] Panic Button SOS Modal - Structured Auto Questions */}
      {panicModalOpen && gpsPingJob && (
        <div 
          className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto"
          onClick={() => !panicSending && setPanicModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-rose-500 relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl animate-bounce">
              🚨
            </div>
            <h3 className="text-lg font-black text-center text-slate-900 uppercase tracking-tight mb-1">Pusat Sinyal Darurat SOS</h3>
            <p className="text-[11px] text-center font-bold text-slate-500 mb-5 leading-relaxed">
              Jawab pertanyaan cepat di bawah. Koordinat GPS &amp; status muatan langsung terkirim ke Head Ops Trucking HQ!
            </p>

            {/* Step 1: Request Category */}
            <div className="space-y-2 mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Apa yang Anda Butuhkan?</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'swap_fleet', label: 'Ganti Armada', icon: '🚛' },
                  { id: 'swap_driver', label: 'Ganti Supir', icon: '🧑‍✈️' },
                  { id: 'general', label: 'Darurat Lain', icon: '🚨' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPanicType(item.id as any);
                      if (!panicReason) {
                        setPanicReason(
                          item.id === 'swap_fleet' ? 'Mesin mogok / radiator bocor tidak bisa jalan' :
                          item.id === 'swap_driver' ? 'Sakit demam / kecapekan tidak kuat lanjut nyetir' :
                          'Kendala keamanan / hadangan di perjalanan'
                        );
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all ${
                      panicType === item.id
                        ? 'bg-rose-50 border-rose-500 text-rose-700 font-black shadow-sm ring-2 ring-rose-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600 font-bold hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] uppercase tracking-tight leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Auto Question Free Text */}
            <div className="mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                2. {panicType === 'swap_fleet' ? 'Kenapa Minta Ganti Armada?' : panicType === 'swap_driver' ? 'Kenapa Minta Ganti Supir?' : 'Keterangan Situasi Darurat:'}
              </label>
              <textarea
                value={panicReason}
                onChange={(e) => setPanicReason(e.target.value)}
                placeholder="Tulis alasan singkat (misal: Sakit demam tidak sanggup / Truk patah as)..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            {/* Step 3: Cargo Status Check */}
            <div className="mb-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                3. Apakah Ada Muatan di Dalam Truk Sekarang?
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPanicHasCargo(true)}
                  className={`py-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                    panicHasCargo
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ⚠️ YA, ADA MUATAN
                </button>
                <button
                  type="button"
                  onClick={() => setPanicHasCargo(false)}
                  className={`py-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                    !panicHasCargo
                      ? 'bg-slate-800 text-white border-slate-900 shadow-md ring-2 ring-slate-400'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ✖️ TIDAK / KOSONG
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPanicModalOpen(false)}
                disabled={panicSending}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={panicSending}
                onClick={async () => {
                  setPanicSending(true);
                  try {
                    const pos: GeolocationPosition | null = await new Promise((resolve) => {
                      if (!navigator.geolocation) return resolve(null);
                      navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 });
                    });
                    const tokenToUse = gpsPingJob.driver_link_token || gpsPingJob.id;
                    const res = await fetch(`/api/jo/${tokenToUse}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'panic_button',
                        panic_type: panicType,
                        reason: panicReason || (panicType === 'swap_fleet' ? 'Minta Ganti Armada' : panicType === 'swap_driver' ? 'Minta Ganti Supir' : 'Darurat SOS'),
                        has_cargo: panicHasCargo,
                        lat: pos?.coords?.latitude,
                        lng: pos?.coords?.longitude
                      })
                    });
                    if (!res.ok) throw new Error('Gagal mengirim sinyal darurat');
                    toast.error('🚨 SINYAL DARURAT TERKIRIM KE HEAD OPS HQ!', { duration: 8000 });
                    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
                    setPanicModalOpen(false);
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setPanicSending(false);
                  }
                }}
                className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95"
              >
                {panicSending ? <Loader2 size={16} className="animate-spin" /> : 'KIRIM SOS NOW'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
