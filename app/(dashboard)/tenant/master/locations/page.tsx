'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Search, MapPin, Loader2, Map as MapIcon, Filter, Eye } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Location {
  id: string;
  location_code: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  address_notes?: string;
  tenant_id: string;
}

export default function TenantLocationsPage() {
  const { profile, loading: loadingAuth } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('md_locations')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('name', { ascending: true });
    setLocations(data || []);
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (profile?.tenant_id) fetchData();
    else if (!loadingAuth) setLoading(false);
  }, [profile?.tenant_id, fetchData, loadingAuth]);

  const filtered = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    loc.location_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapIcon size={24} />
            Locations Directory
            <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-md ml-2 uppercase tracking-wider">Read Only</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Daftar seluruh titik lokasi operasional tenant.</p>
        </div>
      </div>

      <Card className="p-4 border-slate-200 shadow-none">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search location..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 font-semibold text-slate-700">Code</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-4 font-semibold text-slate-700">City</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Province</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 className="animate-spin mx-auto mb-2 text-slate-400" /></td></tr>
              ) : filtered.map(loc => (
                <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-mono text-xs font-bold text-slate-500">{loc.location_code}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">{loc.name}</td>
                  <td className="px-4 py-4 text-slate-600">{loc.city}</td>
                  <td className="px-4 py-4 text-slate-600">{loc.province}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => setSelectedLocation(loc)} className="p-1.5 text-slate-400 hover:text-slate-900"><Eye size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-6 shadow-2xl border-none">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedLocation.name}</h3>
                <p className="text-sm font-mono text-slate-400 mt-1">{selectedLocation.location_code}</p>
              </div>
              <button onClick={() => setSelectedLocation(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="text-slate-400 shrink-0" size={20} />
                <div>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedLocation.address}</p>
                  <p className="text-sm text-slate-500 mt-1">{selectedLocation.city}, {selectedLocation.province} {selectedLocation.postal_code}</p>
                </div>
              </div>
              {selectedLocation.address_notes && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-1">Directions</p>
                  <p className="text-xs text-blue-700 italic">{selectedLocation.address_notes}</p>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedLocation(null)} className="w-full mt-8 py-2.5 bg-slate-100 text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Close</button>
          </Card>
        </div>
      )}
    </div>
  );
}
