'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  X, MapPin, Truck, ChevronRight, 
  Search, Loader2, Warehouse, Building2,
  DollarSign, Clock, Navigation2, Plus, Hash,
  Trash2, GripVertical, AlertCircle, User,
  Activity, Fuel, Timer
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import ContactFormModal from '@/components/master/ContactFormModal';
import LocationAutocomplete from '@/components/hq/LocationAutocomplete';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';

interface RouteStop {
  id: string;
  sequence: number;
  stop_type: 'PICKUP' | 'DROPOFF';
  source_type: 'MD_LOCATION' | 'MD_CONTACT_ADDRESS' | 'GOOGLE_MAPS';
  source_id: string;
  location_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  contact_name: string;
  contact_phone: string;
}

interface AddTruckingItemModalProps {
  onClose: () => void;
  onAdd: (item: any) => void;
  initialData?: any;
  defaultExecutionDate?: string;
  defaultExecutionTime?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: -6.2088,
  lng: 106.8456,
};

export default function AddTruckingItemModal({ onClose, onAdd, initialData, defaultExecutionDate, defaultExecutionTime }: AddTruckingItemModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [masterLocations, setMasterLocations] = useState<any[]>([]);
  const [contactAddresses, setContactAddresses] = useState<any[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: ['places'],
  });

  const [formData, setFormData] = useState({
    vehicle_type_id: '',
    unit_count: 1,
    deal_price: 0,
    execution_date: defaultExecutionDate || new Date().toISOString().split('T')[0],
    execution_time: defaultExecutionTime || '08:00',
    notes: '',
  });

  const [stops, setStops] = useState<RouteStop[]>([
    {
      id: Math.random().toString(36).substr(2, 9),
      sequence: 1,
      stop_type: 'PICKUP',
      source_type: 'MD_LOCATION',
      source_id: '',
      location_name: '',
      address: '',
      latitude: null,
      longitude: null,
      contact_name: '',
      contact_phone: ''
    },
    {
      id: Math.random().toString(36).substr(2, 9),
      sequence: 2,
      stop_type: 'DROPOFF',
      source_type: 'MD_LOCATION',
      source_id: '',
      location_name: '',
      address: '',
      latitude: null,
      longitude: null,
      contact_name: '',
      contact_phone: ''
    }
  ]);

  // Directions logic
  useEffect(() => {
    const fetchDirections = async () => {
      if (!isLoaded) return;
      
      const validStops = stops.filter(s => s.latitude !== null && s.longitude !== null);
      if (validStops.length < 2) {
        setDirectionsResponse(null);
        return;
      }

      const directionsService = new google.maps.DirectionsService();
      
      const origin = { lat: Number(validStops[0].latitude), lng: Number(validStops[0].longitude) };
      const destination = { lat: Number(validStops[validStops.length - 1].latitude), lng: Number(validStops[validStops.length - 1].longitude) };
      const waypoints = validStops.slice(1, -1).map(s => ({
        location: { lat: Number(s.latitude), lng: Number(s.longitude) },
        stopover: true,
      }));

      try {
        const result = await directionsService.route({
          origin,
          destination,
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        });
        setDirectionsResponse(result);
      } catch (err) {
        console.error('Directions Error:', err);
      }
    };

    fetchDirections();
  }, [stops, isLoaded]);

  // Estimation Logic
  const routeStats = useMemo(() => {
    if (!directionsResponse) return null;
    
    let totalMeters = 0;
    let totalSecondsCar = 0;
    
    directionsResponse.routes[0].legs.forEach(leg => {
      totalMeters += leg.distance?.value || 0;
      totalSecondsCar += leg.duration?.value || 0;
    });

    const selectedVehicle = vehicleTypes.find(v => v.id === formData.vehicle_type_id);
    const timeMultiplier = selectedVehicle?.time_multiplier || 1.0;
    const fuelCons = selectedVehicle?.fuel_consumption || 1.0;

    const totalDistanceKm = totalMeters / 1000;
    const totalSecondsTruck = totalSecondsCar * timeMultiplier;
    
    // Format duration
    const hours = Math.floor(totalSecondsTruck / 3600);
    const minutes = Math.round((totalSecondsTruck % 3600) / 60);
    const durationStr = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;

    return {
      distanceKm: totalDistanceKm.toFixed(1),
      durationStr,
      fuelUsage: (totalDistanceKm / fuelCons).toFixed(1),
      rawSecondsTruck: totalSecondsTruck
    };
  }, [directionsResponse, formData.vehicle_type_id, vehicleTypes]);

  // Pre-fill if editing
  useEffect(() => {
    if (initialData?.item_data) {
      const { stops: initialStops, ...rest } = initialData.item_data;
      setFormData(rest);
      if (initialStops) setStops(initialStops);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id) return;
      setLoading(true);
      try {
        const [locRes, vehRes, entityRes] = await Promise.all([
          supabase.from('md_locations').select('*').eq('tenant_id', profile.tenant_id).eq('is_active', true),
          supabase.from('md_fleet_types').select('id, type_name, time_multiplier, fuel_consumption').or(`tenant_id.eq.${profile.tenant_id},tenant_id.is.null`),
          supabase.from('md_entities')
            .select('id, name, phone, md_entity_addresses(*)')
            .eq('tenant_id', profile.tenant_id)
        ]);
        
        const allAddresses: any[] = [];
        entityRes.data?.forEach(entity => {
          entity.md_entity_addresses?.forEach((addr: any) => {
            allAddresses.push({
              ...addr,
              md_entities: { name: entity.name, phone: entity.phone }
            });
          });
        });

        setMasterLocations(locRes.data || []);
        setVehicleTypes(vehRes.data || []);
        setContactAddresses(allAddresses);
      } catch (err) {
        console.error('[AddTruckingItem] Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.tenant_id]);

  const addStop = () => {
    const newStop: RouteStop = {
      id: Math.random().toString(36).substr(2, 9),
      sequence: stops.length + 1,
      stop_type: 'DROPOFF',
      source_type: 'MD_LOCATION',
      source_id: '',
      location_name: '',
      address: '',
      latitude: null,
      longitude: null,
      contact_name: '',
      contact_phone: ''
    };
    setStops([...stops, newStop]);
  };

  const removeStop = (id: string) => {
    const newStops = stops.filter(s => s.id !== id);
    newStops.forEach((s, i) => { s.sequence = i + 1; });
    setStops(newStops);
  };

  const updateStop = (id: string, updates: Partial<RouteStop>) => {
    setStops(prevStops => prevStops.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleAdd = () => {
    const vehicleType = vehicleTypes.find(v => v.id === formData.vehicle_type_id);
    const estRevenue = formData.unit_count * formData.deal_price;

    onAdd({
      sbu_type: 'TRUCKING',
      item_data: {
        ...formData,
        vehicle_type_name: vehicleType?.type_name,
        stops,
        est_revenue: estRevenue,
        est_distance_km: routeStats?.distanceKm,
        est_duration: routeStats?.durationStr,
        est_fuel_usage: routeStats?.fuelUsage,
        shipper_name: stops.find(s => s.stop_type === 'PICKUP')?.location_name,
        recipient_name: stops.find(s => s.stop_type === 'DROPOFF')?.location_name,
        shipper_address: stops.find(s => s.stop_type === 'PICKUP')?.address,
        recipient_address: stops.find(s => s.stop_type === 'DROPOFF')?.address,
      }
    });
  };

  const formatIDR = (val: number) => val.toLocaleString('id-ID');

  const handlePriceChange = (val: string) => {
    const numericValue = parseInt(val.replace(/\./g, '')) || 0;
    setFormData({ ...formData, deal_price: numericValue });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto shadow-2xl border-none !rounded-[2.5rem] p-0">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Navigation2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">Multi-Stop Route Configuration</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">SBU Trucking Advanced Logistics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Panel: Inputs */}
          <div className="lg:col-span-7 p-8 space-y-10 border-r border-slate-100 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Truck size={14} className="text-blue-500" /> Vehicle Requirement *
                </label>
                <select 
                  value={formData.vehicle_type_id}
                  onChange={(e) => setFormData({...formData, vehicle_type_id: e.target.value})}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
                >
                  <option value="">Select Vehicle Type</option>
                  {vehicleTypes.map(v => <option key={v.id} value={v.id}>{v.type_name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} className="text-rose-500" /> Schedule Execution *
                 </label>
                 <div className="flex gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-[1.5rem]">
                    <input type="date" value={formData.execution_date} onChange={(e) => setFormData({...formData, execution_date: e.target.value})} className="flex-1 bg-transparent text-slate-900 font-black text-xs outline-none" />
                    <input type="time" value={formData.execution_time} onChange={(e) => setFormData({...formData, execution_time: e.target.value})} className="w-20 bg-transparent text-slate-900 font-black text-xs outline-none" />
                 </div>
              </div>
            </div>

            {/* Route Estimation Pills */}
            {routeStats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                    <Activity size={12} /> Distance
                  </div>
                  <div className="text-xl font-black text-blue-900 italic">{routeStats.distanceKm} <span className="text-xs font-bold uppercase">KM</span></div>
                </div>
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[9px] font-black text-rose-600 uppercase tracking-widest">
                    <Timer size={12} /> Truck Duration
                  </div>
                  <div className="text-xl font-black text-rose-900 italic">{routeStats.durationStr}</div>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                    <Fuel size={12} /> Est. Fuel
                  </div>
                  <div className="text-xl font-black text-emerald-900 italic">{routeStats.fuelUsage} <span className="text-xs font-bold uppercase">L</span></div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] italic">Routing Manifest</h3>
                <button onClick={addStop} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
                  <Plus size={14} /> Add Stop
                </button>
              </div>

              <div className="space-y-4">
                {stops.map((stop, index) => (
                  <Card key={stop.id} className="p-6 border-slate-200 shadow-none !rounded-[2rem] bg-slate-50/50 hover:border-blue-200 transition-all group">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black italic">
                            #{stop.sequence}
                          </div>
                          <select
                            value={stop.stop_type}
                            onChange={(e) => updateStop(stop.id, { stop_type: e.target.value as any })}
                            className="bg-transparent text-xs font-black uppercase tracking-widest text-slate-900 outline-none"
                          >
                            <option value="PICKUP">🚚 PICKUP (ORIGIN)</option>
                            <option value="DROPOFF">📦 DROPOFF (DESTINATION)</option>
                          </select>
                        </div>
                        {stops.length > 2 && (
                          <button onClick={() => removeStop(stop.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 p-1 bg-white/50 rounded-xl border border-slate-100 w-fit">
                        <button 
                          onClick={() => updateStop(stop.id, { source_type: 'MD_LOCATION' })}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${stop.source_type === 'MD_LOCATION' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Public Location
                        </button>
                        <button 
                          onClick={() => updateStop(stop.id, { source_type: 'MD_CONTACT_ADDRESS' })}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${stop.source_type === 'MD_CONTACT_ADDRESS' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Customer Location
                        </button>
                        <button 
                          onClick={() => updateStop(stop.id, { source_type: 'GOOGLE_MAPS' })}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${stop.source_type === 'GOOGLE_MAPS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Google Maps
                        </button>
                      </div>

                      {stop.source_type === 'MD_LOCATION' && (
                        <select
                          value={stop.source_id}
                          onChange={(e) => {
                            const loc = masterLocations.find(l => l.id === e.target.value);
                            if (loc) {
                              updateStop(stop.id, {
                                source_id: loc.id,
                                location_name: loc.name,
                                address: loc.address,
                                latitude: loc.latitude,
                                longitude: loc.longitude
                              });
                            }
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
                        >
                          <option value="">Select Public Location...</option>
                          {masterLocations.map(l => <option key={l.id} value={l.id}>{l.name} - {l.city}</option>)}
                        </select>
                      )}

                      {stop.source_type === 'MD_CONTACT_ADDRESS' && (
                        <select
                          value={stop.source_id}
                          onChange={(e) => {
                            const addr = contactAddresses.find(a => a.id === e.target.value);
                            if (addr) {
                              updateStop(stop.id, {
                                source_id: addr.id,
                                location_name: `${addr.md_entities.name} - ${addr.address_name || 'Warehouse'}`,
                                address: addr.address,
                                latitude: addr.latitude,
                                longitude: addr.longitude,
                                contact_name: addr.contact_person || '',
                                contact_phone: addr.contact_phone || ''
                              });
                            }
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
                        >
                          <option value="">Select Customer Location...</option>
                          {contactAddresses.map(a => (
                            <option key={a.id} value={a.id}>
                              [{a.md_entities.name}] {a.address_name} - {a.city}
                            </option>
                          ))}
                        </select>
                      )}

                      {stop.source_type === 'GOOGLE_MAPS' && (
                        <LocationAutocomplete 
                          defaultValue={stop.address}
                          onSelect={(place) => {
                            updateStop(stop.id, {
                              source_id: place.place_id,
                              location_name: place.address.split(',')[0],
                              address: place.address,
                              latitude: place.latitude,
                              longitude: place.longitude
                            });
                          }}
                        />
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Name</label>
                          <div className="relative">
                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input 
                              type="text" 
                              placeholder="e.g. Bp. Ahmad" 
                              value={stop.contact_name}
                              onChange={(e) => updateStop(stop.id, { contact_name: e.target.value })}
                              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-blue-600 transition-colors" 
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                          <input 
                            type="text" 
                            placeholder="0812..." 
                            value={stop.contact_phone}
                            onChange={(e) => updateStop(stop.id, { contact_phone: e.target.value })}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-blue-600 transition-colors" 
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Map & Financials */}
          <div className="lg:col-span-5 p-8 bg-slate-50 flex flex-col gap-8">
            <div className="space-y-3">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] italic">Route Preview</h3>
               <div className="h-80 w-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl bg-white">
                 {isLoaded ? (
                   <GoogleMap
                     mapContainerStyle={mapContainerStyle}
                     center={stops.find(s => s.latitude !== null && s.latitude !== undefined)?.latitude ? { lat: Number(stops.find(s => s.latitude !== null)?.latitude), lng: Number(stops.find(s => s.latitude !== null)?.longitude) } : center}
                     zoom={11}
                   >
                     {!directionsResponse && stops.map((stop) => (
                       stop.latitude !== null && stop.latitude !== undefined && (
                         <Marker
                           key={stop.id}
                           position={{ lat: Number(stop.latitude), lng: Number(stop.longitude) }}
                           label={{
                             text: stop.sequence.toString(),
                             color: 'white',
                             fontWeight: 'black'
                           }}
                         />
                       )
                     ))}
                     {directionsResponse && (
                       <DirectionsRenderer 
                         directions={directionsResponse}
                         options={{
                           polylineOptions: {
                             strokeColor: '#2563eb',
                             strokeOpacity: 0.8,
                             strokeWeight: 6
                           },
                           suppressMarkers: false
                         }}
                       />
                     )}
                   </GoogleMap>
                 ) : (
                   <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                     <Loader2 className="animate-spin text-slate-400" />
                   </div>
                 )}
               </div>
            </div>

            {(!formData.vehicle_type_id || stops.some(s => !s.source_id)) && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-black text-amber-600 uppercase tracking-widest">
                <AlertCircle size={14} />
                {!formData.vehicle_type_id ? 'Please select a vehicle type' : 'Please select locations for all stops'}
              </div>
            )}

            {/* Financial Card */}
            <Card className="p-8 bg-white border border-slate-200 !rounded-[2.5rem] space-y-6 shadow-sm">
               <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-4 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Count</label>
                    <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-1">
                      <button onClick={() => setFormData({...formData, unit_count: Math.max(1, formData.unit_count - 1)})} className="w-8 h-8 flex items-center justify-center font-bold text-lg text-slate-400 hover:text-slate-900 transition-colors">-</button>
                      <input type="number" value={formData.unit_count} onChange={(e) => setFormData({...formData, unit_count: parseInt(e.target.value) || 1})} className="w-full bg-transparent text-center font-black text-lg text-slate-900 outline-none" />
                      <button onClick={() => setFormData({...formData, unit_count: formData.unit_count + 1})} className="w-8 h-8 flex items-center justify-center font-bold text-lg text-slate-400 hover:text-slate-900 transition-colors">+</button>
                    </div>
                  </div>
                  <div className="col-span-8 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rate / Unit (IDR)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">IDR</span>
                      <input 
                        type="text" 
                        value={formatIDR(formData.deal_price)} 
                        onChange={(e) => handlePriceChange(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-lg text-slate-900 outline-none focus:border-blue-500 transition-all" 
                      />
                    </div>
                  </div>
               </div>

               <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Est. Revenue</p>
                    <p className="text-2xl font-black italic tracking-tighter text-emerald-600">IDR {formatIDR(formData.unit_count * formData.deal_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Route Manifest</p>
                    <p className="text-sm font-black italic text-slate-900">{stops.length} Stops Connected</p>
                  </div>
               </div>
            </Card>

            <div className="mt-auto flex flex-col gap-3">
              <button 
                onClick={handleAdd}
                disabled={!formData.vehicle_type_id || stops.some(s => !s.source_id)}
                className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {initialData ? 'CONFIRM & UPDATE ITEM' : 'ADD TRUCKING ITEM'}
              </button>
              <button onClick={onClose} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-900 transition-all">
                Cancel & Return
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
