'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  X, Globe, MapPin, Package, Truck,
  Search, Loader2, DollarSign, Clock,
  Container, Route, User, Building2,
  Navigation2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import LocationAutocomplete from '@/components/hq/LocationAutocomplete';
import { useGoogleMaps } from '@/lib/google-maps-context';

interface AddressState {
  source_type: 'CUSTOMER_ADDRESS' | 'GOOGLE_MAPS';
  source_id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  place_id: string;
  contact_name: string;
  contact_phone: string;
}

const emptyAddress = (): AddressState => ({
  source_type: 'CUSTOMER_ADDRESS',
  source_id: '',
  address: '',
  latitude: null,
  longitude: null,
  place_id: '',
  contact_name: '',
  contact_phone: '',
});

interface AddForwardingItemModalProps {
  onClose: () => void;
  onAdd: (item: any) => void;
  initialData?: any;
  customerId?: string;
  defaultExecutionDate?: string;
  defaultExecutionTime?: string;
}

const SERVICE_TYPES = ['FCL', 'LCL'] as const;
const DELIVERY_TYPES = ['D2D', 'P2P', 'D2P', 'P2D'] as const;

export default function AddForwardingItemModal({
  onClose, onAdd, initialData, defaultExecutionDate, defaultExecutionTime, customerId
}: AddForwardingItemModalProps) {
  const { profile } = useAuth();
  const { isLoaded } = useGoogleMaps();
  const [loading, setLoading] = useState(true);

  const [mdLocations, setMdLocations] = useState<any[]>([]);
  const [masterPrices, setMasterPrices] = useState<any[]>([]);
  const [contactAddresses, setContactAddresses] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    service_type: 'FCL' as string,
    delivery_type: 'D2D' as string,
    origin_port: '',
    destination_port: '',
    unit_count: 1,
    deal_price: 0,
    execution_date: defaultExecutionDate || new Date().toISOString().split('T')[0],
    execution_time: defaultExecutionTime || '08:00',
    notes: '',
    container_type: '20GP',
  });

  const [pickupAddress, setPickupAddress] = useState<AddressState>(emptyAddress());
  const [deliveryAddress, setDeliveryAddress] = useState<AddressState>(emptyAddress());

  const [selectedPrice, setSelectedPrice] = useState<any>(null);

  const needsPickup = formData.delivery_type === 'D2D' || formData.delivery_type === 'D2P';
  const needsDelivery = formData.delivery_type === 'D2D' || formData.delivery_type === 'P2D';

  useEffect(() => {
    if (!profile?.tenant_id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [locRes, priceRes] = await Promise.all([
          supabase.from('md_locations').select('id, name, city, address').eq('tenant_id', profile.tenant_id as string).eq('is_active', true).order('name'),
          supabase.from('fw_price_master').select('*').eq('tenant_id', profile.tenant_id as string).eq('is_active', true),
        ]);
        if (locRes.data) setMdLocations(locRes.data);
        if (priceRes.data) setMasterPrices(priceRes.data);
      } catch (err) {
        console.error('[AddForwardingItem] Fetch Error:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAddresses = async () => {
      if (!profile?.tenant_id || !customerId) return;
      try {
        const addrQuery = supabase
          .from('md_entity_addresses')
          .select(`
            *,
            md_entities!inner(id, name, phone, tenant_id, is_customer, parent_id)
          `)
          .eq('md_entities.tenant_id', profile.tenant_id);

        const entityQuery = supabase
          .from('md_entities')
          .select('id, name, phone, billing_address, billing_city, billing_province, billing_postal_code, billing_latitude, billing_longitude, parent_id')
          .eq('tenant_id', profile.tenant_id)
          .or(`id.eq.${customerId},parent_id.eq.${customerId}`);

        const [addrRes, entityRes] = await Promise.all([addrQuery, entityQuery]);

        let finalAddresses = addrRes.data || [];
        if (customerId) {
          finalAddresses = finalAddresses.filter(addr => {
            const ent = Array.isArray(addr.md_entities) ? addr.md_entities[0] : addr.md_entities;
            return addr.entity_id === customerId || ent?.parent_id === customerId;
          });
        }

        const formattedAddresses = finalAddresses.map((addr: any) => {
          const ent = Array.isArray(addr.md_entities) ? addr.md_entities[0] : addr.md_entities;
          return {
            ...addr,
            md_entities: { name: ent?.name || 'Unknown Entity', phone: ent?.phone || '' },
          };
        });

        const billingVirtualAddresses = (entityRes.data || [])
          .filter(ent => ent.billing_address)
          .map(ent => ({
            id: `billing-${ent.id}`,
            entity_id: ent.id,
            address_name: 'Kantor Pusat / Billing',
            address: ent.billing_address,
            city: ent.billing_city,
            province: ent.billing_province,
            postal_code: ent.billing_postal_code,
            latitude: ent.billing_latitude,
            longitude: ent.billing_longitude,
            md_entities: { name: ent.name, phone: ent.phone },
          }));

        setContactAddresses([...formattedAddresses, ...billingVirtualAddresses]);
      } catch (err) {
        console.error('[AddForwardingItem] Address Fetch Error:', err);
      }
    };

    fetchData();
    fetchAddresses();
  }, [profile?.tenant_id, customerId]);

  // Pre-fill if editing
  useEffect(() => {
    if (initialData?.item_data) {
      const { pickup_address, delivery_address, ...rest } = initialData.item_data;
      setFormData(prev => ({ ...prev, ...rest }));
      if (pickup_address) setPickupAddress(pickup_address);
      if (delivery_address) setDeliveryAddress(delivery_address);
    }
  }, [initialData]);

  // Auto-populate price from master when route changes
  useEffect(() => {
    if (!formData.origin_port || !formData.destination_port || !formData.service_type) {
      setSelectedPrice(null);
      return;
    }

    const matched = masterPrices.find(p =>
      p.origin_port === formData.origin_port &&
      p.destination_port === formData.destination_port &&
      p.service_type === formData.service_type &&
      p.delivery_type === formData.delivery_type
    );

    if (matched) {
      setSelectedPrice(matched);
      setFormData(prev => ({
        ...prev,
        deal_price: matched.sell_price || matched.sell_per_cbm || 0,
        container_type: matched.container_type || '20GP',
      }));
    } else {
      setSelectedPrice(null);
    }
  }, [formData.origin_port, formData.destination_port, formData.service_type, formData.delivery_type, masterPrices]);

  const selectCustomerAddress = (addr: any, target: 'pickup' | 'delivery') => {
    const data: AddressState = {
      source_type: 'CUSTOMER_ADDRESS',
      source_id: addr.id,
      address: [addr.address, addr.city, addr.province].filter(Boolean).join(', '),
      latitude: addr.latitude,
      longitude: addr.longitude,
      place_id: '',
      contact_name: addr.contact_person || addr.md_entities?.name || '',
      contact_phone: addr.contact_phone || '',
    };
    if (target === 'pickup') setPickupAddress(data);
    else setDeliveryAddress(data);
  };

  const handleGoogleMapsSelect = (place: { address: string; latitude: number; longitude: number; place_id: string }, target: 'pickup' | 'delivery') => {
    const data: AddressState = {
      source_type: 'GOOGLE_MAPS',
      source_id: place.place_id,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      place_id: place.place_id,
      contact_name: '',
      contact_phone: '',
    };
    if (target === 'pickup') setPickupAddress(data);
    else setDeliveryAddress(data);
  };

  const handleAdd = () => {
    const originLoc = mdLocations.find(l => l.name === formData.origin_port);
    const destLoc = mdLocations.find(l => l.name === formData.destination_port);
    const estRevenue = formData.unit_count * formData.deal_price;

    onAdd({
      sbu_type: 'FORWARDING',
      quantity: formData.unit_count,
      unit_price: formData.deal_price,
      total_revenue: estRevenue,
      item_data: {
        ...formData,
        pickup_address: needsPickup ? pickupAddress : null,
        delivery_address: needsDelivery ? deliveryAddress : null,
        origin_port_name: originLoc?.name || '',
        destination_port_name: destLoc?.name || '',
        est_revenue: estRevenue,
        price_master_id: selectedPrice?.id || null,
        sell_price: selectedPrice?.sell_price || 0,
        cogs_pickup: selectedPrice?.cogs_pickup || 0,
        cogs_port_haulage_origin: selectedPrice?.cogs_port_haulage_origin || 0,
        cogs_ocean_freight: selectedPrice?.cogs_ocean_freight || 0,
        cogs_thc_origin: selectedPrice?.cogs_thc_origin || 0,
        cogs_thc_dest: selectedPrice?.cogs_thc_dest || 0,
        cogs_port_haulage_dest: selectedPrice?.cogs_port_haulage_dest || 0,
        cogs_last_mile: selectedPrice?.cogs_last_mile || 0,
        cogs_documentation: selectedPrice?.cogs_documentation || 0,
        cogs_other: selectedPrice?.cogs_other || 0,
      }
    });
  };

  const formatIDR = (val: number) => val.toLocaleString('id-ID');

  const handlePriceChange = (val: string) => {
    const numericValue = parseInt(val.replace(/\./g, '')) || 0;
    setFormData({ ...formData, deal_price: numericValue });
  };

  const renderAddressCard = (label: string, target: 'pickup' | 'delivery', state: AddressState) => {
    const isPickup = target === 'pickup';
    const color = isPickup ? 'emerald' : 'blue';
    const Icon = isPickup ? Navigation2 : MapPin;
    const title = isPickup ? 'Pickup Address (Origin Door)' : 'Delivery Address (Destination Door)';

    return (
      <Card className="p-6 border-slate-200 shadow-none !rounded-[2rem] bg-slate-50/50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full bg-${color}-600 text-white flex items-center justify-center`}>
                <Icon size={14} />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">{title}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-1 bg-white/50 rounded-xl border border-slate-100 w-fit">
            <button
              type="button"
              onClick={() => {
                if (target === 'pickup') setPickupAddress({ ...emptyAddress(), source_type: 'CUSTOMER_ADDRESS' });
                else setDeliveryAddress({ ...emptyAddress(), source_type: 'CUSTOMER_ADDRESS' });
              }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${state.source_type === 'CUSTOMER_ADDRESS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Customer Location
            </button>
            <button
              type="button"
              onClick={() => {
                if (target === 'pickup') setPickupAddress(emptyAddress());
                else setDeliveryAddress(emptyAddress());
              }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${state.source_type === 'GOOGLE_MAPS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Google Maps
            </button>
          </div>

          {state.source_type === 'CUSTOMER_ADDRESS' && (
            <div className="flex gap-2">
              <select
                value={state.source_id}
                onChange={(e) => {
                  const addr = contactAddresses.find(a => a.id === e.target.value);
                  if (addr) selectCustomerAddress(addr, target);
                }}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none"
              >
                <option value="">Select Customer Location...</option>
                {contactAddresses.map(a => (
                  <option key={a.id} value={a.id}>
                    [{a.md_entities.name}] {a.address_name} - {a.city}
                  </option>
                ))}
              </select>
              <a
                href="/hq/master/contacts"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-1.5"
              >
                <Package size={14} /> New
              </a>
            </div>
          )}

          {state.source_type === 'GOOGLE_MAPS' && isLoaded && (
            <LocationAutocomplete
              defaultValue={state.address}
              onSelect={(place) => handleGoogleMapsSelect(place, target)}
            />
          )}

          {state.source_type === 'GOOGLE_MAPS' && !isLoaded && (
            <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-400 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Loading Google Maps...
            </div>
          )}

          {state.address && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    placeholder="e.g. Bp. Ahmad"
                    value={state.contact_name}
                    onChange={(e) => {
                      if (target === 'pickup') setPickupAddress({ ...pickupAddress, contact_name: e.target.value });
                      else setDeliveryAddress({ ...deliveryAddress, contact_name: e.target.value });
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="0812..."
                  value={state.contact_phone}
                  onChange={(e) => {
                    if (target === 'pickup') setPickupAddress({ ...pickupAddress, contact_phone: e.target.value });
                    else setDeliveryAddress({ ...deliveryAddress, contact_phone: e.target.value });
                  }}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:border-blue-600 transition-colors"
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
        <Card className="p-12 flex flex-col items-center gap-4 shadow-2xl border-none !rounded-[2.5rem]">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Forwarding Data...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl border-none !rounded-[2.5rem] p-0">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Globe size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">Forwarding Item Configuration</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">SBU Forwarding — FCL / LCL</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Row 1: Service Type + Delivery Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Container size={14} className="text-indigo-500" /> Service Type *
              </label>
              <div className="flex gap-2 p-1 bg-slate-50 border border-slate-200 rounded-[1.5rem]">
                {SERVICE_TYPES.map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFormData({ ...formData, service_type: st })}
                    className={`flex-1 py-3 rounded-[1.25rem] text-xs font-black uppercase tracking-widest transition-all ${formData.service_type === st ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {st === 'FCL' ? 'FCL' : 'LCL'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Route size={14} className="text-indigo-500" /> Delivery Type *
              </label>
              <select
                value={formData.delivery_type}
                onChange={(e) => setFormData({ ...formData, delivery_type: e.target.value })}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all"
              >
                {DELIVERY_TYPES.map(dt => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Origin + Destination */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <MapPin size={14} className="text-emerald-500" /> Origin Port *
              </label>
              <select
                value={formData.origin_port}
                onChange={(e) => setFormData({ ...formData, origin_port: e.target.value })}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all"
              >
                <option value="">Select Origin Port</option>
                {mdLocations.map(loc => (
                  <option key={loc.id} value={loc.name}>{loc.name}{loc.city ? ` - ${loc.city}` : ''}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <MapPin size={14} className="text-rose-500" /> Destination Port *
              </label>
              <select
                value={formData.destination_port}
                onChange={(e) => setFormData({ ...formData, destination_port: e.target.value })}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all"
              >
                <option value="">Select Destination Port</option>
                {mdLocations.filter(l => l.name !== formData.origin_port).map(loc => (
                  <option key={loc.id} value={loc.name}>{loc.name}{loc.city ? ` - ${loc.city}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address Cards — Dynamic based on delivery_type */}
          {needsPickup && renderAddressCard('Pickup', 'pickup', pickupAddress)}
          {needsDelivery && renderAddressCard('Delivery', 'delivery', deliveryAddress)}

          {/* Row 3: Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} className="text-rose-500" /> Schedule Execution *
              </label>
              <div className="flex gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-[1.5rem]">
                <input
                  type="date"
                  value={formData.execution_date}
                  onChange={(e) => setFormData({ ...formData, execution_date: e.target.value })}
                  className="flex-1 bg-transparent text-slate-900 font-black text-xs outline-none"
                />
                <input
                  type="time"
                  value={formData.execution_time}
                  onChange={(e) => setFormData({ ...formData, execution_time: e.target.value })}
                  className="w-20 bg-transparent text-slate-900 font-black text-xs outline-none"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-indigo-500" /> Container Type
              </label>
              <select
                value={formData.container_type}
                onChange={(e) => setFormData({ ...formData, container_type: e.target.value })}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all"
              >
                <option value="20GP">20 GP</option>
                <option value="40GP">40 GP</option>
                <option value="40HC">40 HC</option>
                <option value="20RF">20 Reefer</option>
                <option value="40RH">40 Reefer HC</option>
                <option value="20OT">20 Open Top</option>
                <option value="40OT">40 Open Top</option>
                <option value="20FR">20 Flat Rack</option>
                <option value="40FR">40 Flat Rack</option>
              </select>
            </div>
          </div>

          {/* Selected Price Info */}
          {selectedPrice && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-[2rem] space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                <DollarSign size={14} /> Auto-matched Price Master
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Sell Price</p>
                  <p className="text-lg font-black text-emerald-900 italic">IDR {formatIDR(selectedPrice.sell_price || 0)}</p>
                </div>
                {selectedPrice.sell_per_cbm && (
                  <div>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Per CBM</p>
                    <p className="text-lg font-black text-emerald-900 italic">IDR {formatIDR(selectedPrice.sell_per_cbm)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">COGS Pickup</p>
                  <p className="text-sm font-black text-emerald-800">IDR {formatIDR(selectedPrice.cogs_pickup || 0)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">COGS Ocean</p>
                  <p className="text-sm font-black text-emerald-800">IDR {formatIDR(selectedPrice.cogs_ocean_freight || 0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Special instructions, commodity details, or shipping notes..."
              className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all"
            />
          </div>

          {/* Financial + Submit */}
          <Card className="p-8 bg-white border border-slate-200 !rounded-[2.5rem] space-y-6 shadow-sm">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-4 space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Count</label>
                <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setFormData({ ...formData, unit_count: Math.max(1, formData.unit_count - 1) })}
                    className="w-8 h-8 flex items-center justify-center font-bold text-lg text-slate-400 hover:text-slate-900 transition-colors"
                  >-</button>
                  <input
                    type="number"
                    value={formData.unit_count}
                    onChange={(e) => setFormData({ ...formData, unit_count: parseInt(e.target.value) || 1 })}
                    className="w-full bg-transparent text-center font-black text-lg text-slate-900 outline-none"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, unit_count: formData.unit_count + 1 })}
                    className="w-8 h-8 flex items-center justify-center font-bold text-lg text-slate-400 hover:text-slate-900 transition-colors"
                  >+</button>
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
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-lg text-slate-900 outline-none focus:border-indigo-500 transition-all"
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
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Route</p>
                <p className="text-sm font-black italic text-slate-900">
                  {formData.origin_port && formData.destination_port
                    ? `${formData.origin_port} → ${formData.destination_port}`
                    : 'Not configured'}
                </p>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleAdd}
              disabled={!formData.origin_port || !formData.destination_port}
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {initialData ? 'CONFIRM & UPDATE ITEM' : 'ADD FORWARDING ITEM'}
            </button>
            <button onClick={onClose} className="w-full py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hover:text-slate-900 transition-all">
              Cancel & Return
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
