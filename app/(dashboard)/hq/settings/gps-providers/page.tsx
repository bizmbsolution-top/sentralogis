'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  Settings,
  Satellite,
  Truck,
  RefreshCw,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface GpsProviderConfig {
  id?: string;
  configured: boolean;
  provider_name?: string;
  api_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  vehicles: Array<{ nopol: string; fleet_id: string; status: string }>;
}

interface Fleet {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  easygo_vehicle_id: string;
  status: string;
}

export default function GPSProvidersPage() {
  const { profile, loading: loadingAuth } = useAuth();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncingVehicles, setSyncingVehicles] = useState(false);
  const [syncingGps, setSyncingGps] = useState(false);

  // Config state
  const [config, setConfig] = useState<GpsProviderConfig>({ configured: false });
  const [apiToken, setApiToken] = useState('');
  const [apiUrl, setApiUrl] = useState('https://vtsapi.easygo-gps.co.id');
  const [showToken, setShowToken] = useState(false);

  // Test result
  const [testResult, setTestResult] = useState<{
    success: boolean;
    vehicleCount: number;
    message: string;
  } | null>(null);

  // Sync result
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Fleet list
  const [fleetCount, setFleetCount] = useState(0);
  const [easygoFleetCount, setEasygoFleetCount] = useState(0);

  // Sync tenant info
  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/easygo/config?tenant_id=${tenantId}`);
      const data = await res.json();
      setConfig(data);

      if (data.configured) {
        setApiUrl(data.api_url || 'https://vtsapi.easygo-gps.co.id');
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch fleet stats
  const fetchFleetStats = useCallback(async () => {
    if (!tenantId) return;

    const { count: totalFleets } = await supabase
      .from('md_fleets')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const { count: easygoFleets } = await supabase
      .from('md_fleets')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .not('easygo_vehicle_id', 'is', null);

    setFleetCount(totalFleets || 0);
    setEasygoFleetCount(easygoFleets || 0);
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchConfig();
      fetchFleetStats();
    }
  }, [tenantId, fetchConfig, fetchFleetStats]);

  // Save config
  const handleSave = async () => {
    if (!tenantId) return;
    if (!apiToken) {
      toast.error('API Token wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/easygo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          api_token: apiToken,
          api_url: apiUrl,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Konfigurasi tersimpan');
        fetchConfig();
      } else {
        toast.error(data.error || 'Gagal menyimpan');
      }
    } catch (error) {
      toast.error('Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/easygo/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_token: apiToken, api_url: apiUrl }),
      });

      const result = await res.json();
      setTestResult(result);

      if (result.success) {
        toast.success(`Terhubung! ${result.vehicleCount} kendaraan ditemukan`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Gagal menguji koneksi');
      setTestResult({
        success: false,
        vehicleCount: 0,
        message: 'Network error',
      });
    } finally {
      setTesting(false);
    }
  };

  // Sync vehicles
  const handleSyncVehicles = async () => {
    if (!tenantId) return;
    setSyncingVehicles(true);
    setLastSyncResult(null);

    try {
      const res = await fetch('/api/easygo/sync-vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      });

      const result = await res.json();
      if (result.success) {
        setLastSyncResult(result);
        toast.success(
          `Sync selesai: ${result.created} baru, ${result.updated} update, ${result.skipped} skip`
        );
        fetchFleetStats();
      } else {
        toast.error(result.errors?.[0] || 'Sync gagal');
      }
    } catch (error) {
      toast.error('Gagal sync kendaraan');
    } finally {
      setSyncingVehicles(false);
    }
  };

  // Sync GPS
  const handleSyncGps = async () => {
    if (!tenantId) return;
    setSyncingGps(true);

    try {
      const res = await fetch('/api/easygo/sync-gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(`GPS sync: ${result.synced} posisi tersinkronisasi`);
      } else {
        toast.error(result.errors?.[0] || 'GPS sync gagal');
      }
    } catch (error) {
      toast.error('Gagal sync GPS');
    } finally {
      setSyncingGps(false);
    }
  };

  if (loadingAuth || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Satellite className="w-6 h-6 text-blue-500" />
            GPS Provider Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Konfigurasi integrasi dengan EasyGo GPS Provider
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Card */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              Konfigurasi EasyGo API
            </h2>

            <div className="space-y-4">
              {/* API URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API URL
                </label>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://vtsapi.easygo-gps.co.id"
                />
              </div>

              {/* API Token */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Masukkan token dari EasyGo"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {config.configured && (
                  <p className="text-xs text-green-600 mt-1">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Token sudah tersimpan
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleTest}
                  disabled={testing || !apiToken}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4" />
                  )}
                  Test Koneksi
                </button>

                <button
                  onClick={handleSave}
                  disabled={saving || !apiToken}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan Konfigurasi
                </button>
              </div>

              {/* Test Result */}
              {testResult && (
                <div
                  className={`p-4 rounded-lg ${
                    testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Stats Card */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-gray-500" />
              Status Kendaraan
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Kendaraan</span>
                <span className="text-xl font-bold text-gray-900">{fleetCount}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-600">EasyGo GPS</span>
                <span className="text-xl font-bold text-blue-600">{easygoFleetCount}</span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-green-600">Tanpa GPS</span>
                <span className="text-xl font-bold text-green-600">{fleetCount - easygoFleetCount}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Sync Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-gray-500" />
          Sinkronisasi Data
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sync Vehicles */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Sinkron Kendaraan</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ambil data kendaraan dari EasyGo dan sync ke database SentraLogis.
              Kendaraan baru akan dibuat dengan kode <code>EG-{`{nopol}`}</code>.
            </p>
            <button
              onClick={handleSyncVehicles}
              disabled={syncingVehicles || !config.configured}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 w-full justify-center"
            >
              {syncingVehicles ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync Kendaraan dari EasyGo
            </button>
          </div>

          {/* Sync GPS */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Sinkron GPS</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ambil posisi terkini kendaraan dari EasyGo GPS Hardware.
              Data GPS akan disimpan di dashboard tracking.
            </p>
            <button
              onClick={handleSyncGps}
              disabled={syncingGps || !config.configured || easygoFleetCount === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 w-full justify-center"
            >
              {syncingGps ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Satellite className="w-4 h-4" />
              )}
              Sync GPS Positions
            </button>
          </div>
        </div>

        {/* Last Sync Result */}
        {lastSyncResult && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Hasil Sync Terakhir</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600">Baru:</span>{' '}
                <span className="font-bold">{lastSyncResult.created}</span>
              </div>
              <div>
                <span className="text-blue-600">Update:</span>{' '}
                <span className="font-bold">{lastSyncResult.updated}</span>
              </div>
              <div>
                <span className="text-blue-600">Skip:</span>{' '}
                <span className="font-bold">{lastSyncResult.skipped}</span>
              </div>
            </div>
            {lastSyncResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-red-600 text-sm font-medium">Errors:</p>
                <ul className="text-xs text-red-500 mt-1 space-y-1">
                  {lastSyncResult.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Info */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Catatan Penting:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>GPS sync otomatis berjalan setiap 5 menit (setelah upgrade Vercel Pro)</li>
              <li>Kendaraan EasyGo menggunakan prefix <code>EG-</code> di fleet code</li>
              <li>STNK/KIR expiry perlu diupdate manual setelah sync</li>
              <li>Driver tetap dari database SentraLogis (md_drivers)</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
