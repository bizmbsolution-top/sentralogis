"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabaseClient";
import { useDriverAuth } from "@/lib/hooks/useDriverAuth";
import { useDriverGpsPing } from "@/lib/hooks/useDriverGpsPing";
import { useTheme } from "@/lib/hooks/useTheme";

// Modular Child Components
import { DriverPortalTab, DriverProfileData, TenantInfoData, JobOrderData, DeviceTelemetryState } from "./components/types";
import { DriverHeader } from "./components/DriverHeader";
import { DeviceSummary } from "./components/DeviceSummary";
import { ActiveJobCard } from "./components/ActiveJobCard";
import { QueuedJobsCard } from "./components/QueuedJobsCard";
import { EmptyJobState } from "./components/EmptyJobState";
import { HistoryTab } from "./components/HistoryTab";
import { ProfileTab } from "./components/ProfileTab";
import { DriverBottomNav } from "./components/DriverBottomNav";
import { JobDetailSheet } from "./components/JobDetailSheet";
import InfoPerangkat from "../components/InfoPerangkat";

function DriverPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, isAuthenticated, getAuthHeaders, logout } = useDriverAuth();
  const { isDark, toggle: toggleTheme } = useTheme();

  // Navigation & Modal States
  const [activeTab, setActiveTab] = useState<DriverPortalTab>("home");
  const [selectedJob, setSelectedJob] = useState<JobOrderData | null>(null);
  const [isInfoPerangkatOpen, setIsInfoPerangkatOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Core Data States
  const [driver, setDriver] = useState<DriverProfileData | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfoData | null>(null);
  const [activeJob, setActiveJob] = useState<JobOrderData | null>(null);
  const [queuedJobs, setQueuedJobs] = useState<JobOrderData[]>([]);
  const [completedJobs, setCompletedJobs] = useState<JobOrderData[]>([]);
  const [completedJobsMonth, setCompletedJobsMonth] = useState<number>(0);
  const [totalCompletedJobsCount, setTotalCompletedJobsCount] = useState<number>(0);
  const [isFeedLoading, setIsFeedLoading] = useState(false);

  // Real Hardware / Browser Telemetry State
  const [telemetry, setTelemetry] = useState<DeviceTelemetryState>({
    isNativeApp: false,
    isOnline: true,
    gpsStatus: null,
    gpsAccuracy: null,
    gpsSpeed: null,
    gpsBattery: null,
    gpsErrorMessage: null,
    gpsPingCount: 0,
    lastGpsSyncTime: null,
  });

  // 1. Initial Mount & Authentication Guard
  useEffect(() => {
    setIsMounted(true);
    const isNative =
      typeof window !== "undefined"
        ? Capacitor.isNativePlatform() ||
          navigator.userAgent.includes("SentraLogis_AndroidApp")
        : false;

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    setTelemetry((prev) => ({ ...prev, isNativeApp: isNative, isOnline }));

    const handleOnline = () => setTelemetry((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setTelemetry((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 2. Fetch Unified Driver Feed
  const fetchDriverFeed = useCallback(async () => {
    const activeDriverId = session?.driver_id || driver?.id;
    if (!activeDriverId) return;

    try {
      setIsFeedLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch(
        `/api/driver/feed?driver_id=${encodeURIComponent(activeDriverId)}`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Normalize driver identity with real human name
          if (data.driver) {
            const resolvedName =
              data.driver.name || session?.name || "ANTONIO";
            setDriver((prev) => ({
              ...prev,
              ...data.driver,
              name: resolvedName,
            }));
          }

          if (data.active_shift?.fleet?.tenant_id || data.driver?.tenant_id) {
            setTenantInfo({
              id: data.driver?.tenant_id,
              name: data.active_job?.tenant_name || "SENTRALOGIS",
            });
          }

          setActiveJob(data.active_job || null);
          setQueuedJobs(data.queued_jobs || []);
          setCompletedJobs(data.completed_jobs || []);
          setCompletedJobsMonth(data.total_completed_month || 0);
          setTotalCompletedJobsCount(data.completed_jobs?.length || 0);

          // [Sync Fix] Re-hydrate the open detail sheet with fresh feed data so
          // saved notes/photos/status appear immediately without closing it.
          setSelectedJob((prevSel) => {
            if (!prevSel) return prevSel;
            const allFresh = [
              ...(data.active_job ? [data.active_job] : []),
              ...(data.queued_jobs || []),
              ...(data.completed_jobs || []),
            ];
            return allFresh.find((j: any) => j.id === prevSel.id) ?? prevSel;
          });

          // Deep-link auto-select job if ?job=[token] is present
          const targetJobId = searchParams.get("job");
          if (targetJobId) {
            const matched =
              (data.active_job?.id === targetJobId ||
              data.active_job?.driver_link_token === targetJobId
                ? data.active_job
                : null) ||
              data.queued_jobs?.find(
                (j: any) =>
                  j.id === targetJobId || j.driver_link_token === targetJobId
              );
            if (matched) setSelectedJob(matched);
          }
        }
      }
    } catch (err) {
      console.error("[DriverPortal] Feed error:", err);
    } finally {
      setIsFeedLoading(false);
    }
  }, [session?.driver_id, session?.name, driver?.id, getAuthHeaders, searchParams]);

  useEffect(() => {
    if (session?.driver_id) {
      fetchDriverFeed();
    }
  }, [session?.driver_id, fetchDriverFeed]);

  // 3. Real-time PostgreSQL Changes on Assigned Job Orders
  useEffect(() => {
    const currentDriverId = session?.driver_id || driver?.id;
    if (!currentDriverId) return;

    const channel = supabase
      .channel(`driver-portal-realtime-${currentDriverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_orders",
          filter: `driver_id=eq.${currentDriverId}`,
        },
        (payload) => {
          fetchDriverFeed();
          if (payload.new && (payload.new as any).status) {
            const s = ((payload.new as any).status as string).toUpperCase();
            if (["ORDER DITERIMA", "ACCEPTED", "ASSIGNED"].includes(s)) {
              toast.success("Penugasan baru diterima! GPS tracking siap.");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.driver_id, driver?.id, fetchDriverFeed]);

  // 4. Root-Level Continuous GPS Telemetry Binding
  // Scoped to active job token, continuously active across Home, History, and Profile tabs!
  const gpsPingJob = useMemo(
    () => selectedJob ?? activeJob ?? (queuedJobs && queuedJobs.length > 0 ? queuedJobs[0] : null),
    [selectedJob, activeJob, queuedJobs]
  );
  const gpsPingToken = gpsPingJob?.driver_link_token || gpsPingJob?.id || null;

  useDriverGpsPing(
    gpsPingToken,
    gpsPingJob?.status,
    !!(session?.driver_id || driver?.id),
    useCallback(() => {
      fetchDriverFeed();
    }, [fetchDriverFeed]),
    gpsPingJob?.started_at || null,
    telemetry.isNativeApp,
    undefined,
    (state) => {
      setTelemetry((prev) => ({
        ...prev,
        gpsStatus: state.status || prev.gpsStatus,
        gpsAccuracy: state.accuracy !== undefined ? state.accuracy : prev.gpsAccuracy,
        gpsSpeed: state.speed !== undefined ? state.speed : prev.gpsSpeed,
        gpsBattery: state.battery !== undefined ? state.battery : prev.gpsBattery,
        gpsErrorMessage: state.errorMessage !== undefined ? state.errorMessage : prev.gpsErrorMessage,
        gpsPingCount: state.pingCount !== undefined ? state.pingCount : prev.gpsPingCount,
        lastGpsSyncTime: new Date().toLocaleTimeString("id-ID"),
      }));
    }
  );

  // Accept Queued Job
  const handleAcceptQueue = async (job: JobOrderData) => {
    try {
      const res = await fetch(`/api/jo/${job.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: "accepted" }),
      });
      if (!res.ok) throw new Error("Gagal menerima antrean");
      toast.success("Antrean berhasil diterima! Siap jalan otomatis.");
      fetchDriverFeed();
    } catch (err: any) {
      toast.error(err.message || "Gagal konfirmasi antrean");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Yakin ingin keluar dari akun supir?")) {
      logout();
      router.push("/driver/login");
    }
  };

  if (!isMounted) return null;

  return (
    <div
      className={`min-h-screen pb-28 font-sans transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <Toaster position="top-center" />

      {/* Header */}
      <DriverHeader
        driver={driver}
        tenantInfo={tenantInfo}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenInfoPerangkat={() => setIsInfoPerangkatOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="p-4 sm:p-5 max-w-lg mx-auto space-y-5 -mt-3 relative z-20">
        {activeTab === "home" && (
          <>
            {/* Device Quick Status */}
            <DeviceSummary
              telemetry={telemetry}
              isDark={isDark}
              onOpenDetail={() => setIsInfoPerangkatOpen(true)}
            />

            {/* Active Job Card */}
            {activeJob && (
              <ActiveJobCard
                job={activeJob}
                isDark={isDark}
                onOpenExecution={(j) => setSelectedJob(j)}
              />
            )}

            {/* Queued Job Card */}
            {queuedJobs.length > 0 && (
              <QueuedJobsCard
                queuedJobs={queuedJobs}
                isDark={isDark}
                onSelectJob={(j) => setSelectedJob(j)}
                onAcceptQueue={handleAcceptQueue}
              />
            )}

            {/* Empty State */}
            {!activeJob && queuedJobs.length === 0 && (
              <EmptyJobState isDark={isDark} />
            )}
          </>
        )}

        {activeTab === "history" && (
          <HistoryTab
            completedJobs={completedJobs}
            completedJobsMonth={completedJobsMonth}
            totalCompletedJobsCount={totalCompletedJobsCount}
            isDark={isDark}
          />
        )}

        {activeTab === "profile" && (
          <ProfileTab
            driver={driver}
            tenantInfo={tenantInfo}
            telemetry={telemetry}
            isDark={isDark}
            onOpenInfoPerangkat={() => setIsInfoPerangkatOpen(true)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Interactive Fullscreen Job Execution Sheet */}
      {selectedJob && (
        <JobDetailSheet
          job={selectedJob}
          isDark={isDark}
          getAuthHeaders={getAuthHeaders}
          onClose={() => setSelectedJob(null)}
          onRefreshFeed={fetchDriverFeed}
        />
      )}

      {/* Diagnostic Info Perangkat Modal */}
      <InfoPerangkat
        open={isInfoPerangkatOpen}
        onClose={() => setIsInfoPerangkatOpen(false)}
        driverId={driver?.id || session?.driver_id}
        driverName={driver?.name || session?.name}
        driverWhatsapp={driver?.whatsapp}
        tenantId={driver?.tenant_id}
        gpsStatus={telemetry.gpsStatus}
        gpsAccuracy={telemetry.gpsAccuracy}
        gpsSpeed={telemetry.gpsSpeed}
        gpsBattery={telemetry.gpsBattery}
        gpsErrorMessage={telemetry.gpsErrorMessage || undefined}
        gpsPingCount={telemetry.gpsPingCount}
        token={gpsPingToken}
        isDark={isDark}
      />

      {/* Bottom Navigation */}
      <DriverBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDark={isDark}
      />
    </div>
  );
}

export default function DriverPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-400">Memuat Portal Driver...</p>
        </div>
      }
    >
      <DriverPortalContent />
    </Suspense>
  );
}
