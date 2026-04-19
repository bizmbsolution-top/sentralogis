"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
    Plus, X, Trash2, Edit2, Save, MapPin, Search,
    Navigation, AlertCircle, CheckCircle, Map as MapIcon,
    RefreshCw, LayoutGrid, Truck, Wallet, History, ChevronRight
} from "lucide-react";
import { GoogleMap, Marker, Autocomplete } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/google-maps-context";

// Type definitions
type Location = {
    id: string;
    name: string;
    address: string;
    district: string;
    city: string;
    province: string;
    zipcode: string;
    notes: string;
    latitude: number;
    longitude: number;
    created_at: string;
};

// Map container style
const mapContainerStyle = {
    width: "100%",
    height: "450px",
};

// Default center (Indonesia)
const defaultCenter = {
    lat: -6.2088,
    lng: 106.8456,
};

export default function MasterLocationsPage() {
    const supabase = createClient();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    const { isLoaded } = useGoogleMaps();

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        district: "",
        city: "",
        province: "",
        zipcode: "",
        notes: "",
        latitude: defaultCenter.lat,
        longitude: defaultCenter.lng,
    });

    // Google Maps refs
    const mapRef = useRef<google.maps.Map | null>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    // Fetch locations
    const fetchLocations = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("locations")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setLocations(data || []);
        } catch (error: any) {
            console.error("Error fetching locations:", error);
            toast.error("Gagal memuat data lokasi");
        } finally {
            setLoading(false);
        }
    };

    // Handle place changed from autocomplete
    const handlePlaceChanged = () => {
        if (!autocompleteRef.current) return;

        const place = autocompleteRef.current.getPlace();
        if (!place || !place.geometry) return;

        const lat = place.geometry.location?.lat() || defaultCenter.lat;
        const lng = place.geometry.location?.lng() || defaultCenter.lng;
        const address = place.formatted_address || "";

        let district = "";
        let city = "";
        let province = "";
        let zipcode = "";

        place.address_components?.forEach((component) => {
            const types = component.types;
            if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
                district = component.long_name;
            }
            if (types.includes("locality") || types.includes("administrative_area_level_3")) {
                city = component.long_name;
            }
            if (types.includes("administrative_area_level_1")) {
                province = component.long_name;
            }
            if (types.includes("postal_code")) {
                zipcode = component.long_name;
            }
        });

        setFormData((prev) => ({
            ...prev,
            address,
            district,
            city,
            province,
            zipcode,
            latitude: lat,
            longitude: lng,
        }));

        if (mapRef.current) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(15);
        }
    };

    const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;

        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        setFormData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
        }));

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
                const address = results[0].formatted_address;
                let district = "";
                let city = "";
                let province = "";
                let zipcode = "";

                results[0].address_components?.forEach((component) => {
                    const types = component.types;
                    if (types.includes("sublocality") || types.includes("sublocality_level_1")) district = component.long_name;
                    if (types.includes("locality") || types.includes("administrative_area_level_3")) city = component.long_name;
                    if (types.includes("administrative_area_level_1")) province = component.long_name;
                    if (types.includes("postal_code")) zipcode = component.long_name;
                });

                setFormData((prev) => ({
                    ...prev,
                    address, district, city, province, zipcode,
                }));
            }
        });
    }, []);

    const saveLocation = async () => {
        if (!formData.name.trim()) return toast.error("Nama lokasi wajib diisi");
        if (!formData.address.trim()) return toast.error("Alamat wajib diisi");

        setSaving(true);
        try {
            const payload = {
                name: formData.name,
                address: formData.address,
                district: formData.district,
                city: formData.city,
                province: formData.province,
                zipcode: formData.zipcode,
                notes: formData.notes,
                latitude: formData.latitude,
                longitude: formData.longitude,
            };

            if (editingId) {
                const { error } = await supabase.from("locations").update(payload).eq("id", editingId);
                if (error) throw error;
                toast.success("Lokasi berhasil diupdate");
            } else {
                const { error } = await supabase.from("locations").insert(payload);
                if (error) throw error;
                toast.success("Lokasi berhasil ditambahkan");
            }

            resetForm();
            fetchLocations();
        } catch (error: any) {
            toast.error("Gagal menyimpan lokasi");
        } finally {
            setSaving(false);
        }
    };

    const editLocation = (location: Location) => {
        setFormData({
            name: location.name,
            address: location.address,
            district: location.district || "",
            city: location.city || "",
            province: location.province || "",
            zipcode: location.zipcode || "",
            notes: location.notes || "",
            latitude: location.latitude || defaultCenter.lat,
            longitude: location.longitude || defaultCenter.lng,
        });
        setEditingId(location.id);
        setShowModal(true);
    };

    const deleteLocation = async (id: string, name: string) => {
        if (!confirm(`Hapus lokasi "${name}"?`)) return;
        try {
            const { error } = await supabase.from("locations").delete().eq("id", id);
            if (error) throw error;
            toast.success("Lokasi dihapus");
            fetchLocations();
        } catch (error: any) {
            toast.error("Gagal menghapus");
        }
    };

    const resetForm = () => {
        setFormData({
            name: "", address: "", district: "", city: "", province: "", zipcode: "", notes: "",
            latitude: defaultCenter.lat, longitude: defaultCenter.lng,
        });
        setEditingId(null);
        setShowModal(false);
    };

    const getCurrentPosition = () => {
        if (!navigator.geolocation) return toast.error("Geolokasi tidak didukung");
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
                if (mapRef.current) mapRef.current.panTo({ lat, lng });
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    if (status === "OK" && results && results[0]) {
                        setFormData((prev) => ({ ...prev, address: results[0].formatted_address }));
                    }
                });
            },
            (error) => toast.error("Gagal mendapatkan lokasi")
        );
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const filteredLocations = locations.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        l.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050a18] flex items-center justify-center">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050a18] text-slate-200 p-6 pb-32 relative overflow-hidden">
            <Toaster position="top-right" />

            {/* Tactical Backdrop */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Tactical Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                            <MapIcon className="w-10 h-10 text-blue-500" /> Master Locations
                        </h1>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 bg-white/5 py-1.5 px-4 rounded-full w-fit">
                            Geospatial Reference Hub v2.0
                        </p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input 
                                type="text"
                                placeholder="Search Reference points..."
                                className="w-full bg-[#151f32]/60 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest focus:border-blue-500/50 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center gap-3"
                        >
                            <Plus className="w-4 h-4" /> Add Marker
                        </button>
                    </div>
                </div>

                {/* Locations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLocations.map((location) => {
                         const hasCoords = location.latitude && location.longitude && location.latitude !== 0;
                         return (
                            <div
                                key={location.id}
                                className="bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 p-8 rounded-[2.5rem] hover:border-white/10 transition-all group relative overflow-hidden"
                            >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${hasCoords ? 'bg-blue-500' : 'bg-rose-500'}`} />
                                
                                <div className="flex flex-col h-full justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${hasCoords ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                                <MapPin className="w-6 h-6" />
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => editLocation(location)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteLocation(location.id, location.name)} className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h3 className="text-xl font-black text-white italic tracking-tight line-clamp-1">{location.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 line-clamp-2 leading-relaxed">
                                                {location.address}
                                            </p>
                                        </div>

                                        {(location.city || location.province) && (
                                            <div className="flex flex-wrap gap-2 pt-2 text-[8px] font-black uppercase tracking-widest text-slate-600">
                                                <span className="bg-white/5 px-2 py-1 rounded-md">{location.city}</span>
                                                <span className="bg-white/5 px-2 py-1 rounded-md">{location.province}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                                        {!hasCoords ? (
                                            <div className="flex items-center gap-2 text-rose-500 bg-rose-500/5 px-3 py-1.5 rounded-lg border border-rose-500/10 animate-pulse">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Incomplete Data</span>
                                            </div>
                                        ) : (
                                            <div className="text-[9px] font-mono text-slate-500">
                                                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                            </div>
                                        )}
                                        <button onClick={() => editLocation(location)} className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                                            View Map <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                         );
                    })}
                </div>

                {filteredLocations.length === 0 && (
                    <div className="py-32 text-center bg-[#151f32]/40 rounded-[3rem] border border-dashed border-white/5">
                        <MapIcon className="w-20 h-20 text-slate-800 mx-auto mb-6" />
                        <h3 className="text-xl font-black text-slate-600 italic uppercase">No Reference Points Found</h3>
                        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-2">Try adjusting your search parameters</p>
                    </div>
                )}
            </div>

            {/* Mobile Bottom Menu Consistency */}
            <nav className="fixed bottom-0 inset-x-0 bg-[#0a0f1e]/80 backdrop-blur-2xl border-t border-white/5 p-4 pb-8 flex justify-around items-center z-50 md:hidden">
                <button onClick={() => window.location.href='/admin'} className="flex flex-col items-center gap-1.5 text-slate-600">
                    <LayoutGrid className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Admin</span>
                </button>
                <button onClick={() => window.location.href='/sbu/trucking'} className="flex flex-col items-center gap-1.5 text-slate-600">
                    <Truck className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Trucking</span>
                </button>
                <div className="-mt-14 relative">
                    <button onClick={() => fetchLocations()} className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-xl text-white border-4 border-[#0a0f1e] active:scale-95 transition-all">
                        <RefreshCw className={`w-8 h-8 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <button onClick={() => window.location.href='/finance'} className="flex flex-col items-center gap-1.5 text-slate-600">
                    <Wallet className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Finance</span>
                </button>
                <button onClick={() => window.location.href='/finance?tab=reports'} className="flex flex-col items-center gap-1.5 text-slate-600">
                    <History className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Ledger</span>
                </button>
            </nav>

            {/* Tactical Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-[#050a18]/95 backdrop-blur-2xl flex items-center justify-center z-[100] p-6">
                    <div className="bg-[#151f32] border border-white/10 rounded-[3.5rem] p-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <button onClick={resetForm} className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-10">
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                {editingId ? "Modify Tactical Point" : "Deploy New Marker"}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Precision Geospatial Data Entry</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Location Identity</label>
                                    <input
                                        type="text"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                                        placeholder="e.g., Central Terminal A"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Global Address Search</label>
                                    {isLoaded ? (
                                        <Autocomplete onLoad={(auto) => (autocompleteRef.current = auto)} onPlaceChanged={handlePlaceChanged}>
                                            <input
                                                type="text"
                                                className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                                                placeholder="Search via Google Maps Engine..."
                                            />
                                        </Autocomplete>
                                    ) : (
                                        <div className="w-full h-12 bg-white/5 animate-pulse rounded-2xl" />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Detailed Physical Address</label>
                                    <textarea
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all min-h-[100px]"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {['district', 'city', 'province', 'zipcode'].map(field => (
                                        <div key={field}>
                                            <label className="block text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5 px-1">{field}</label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-xs font-bold text-white outline-none"
                                                value={(formData as any)[field]}
                                                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        onClick={saveLocation}
                                        disabled={saving}
                                        className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? "Deploying..." : editingId ? "Save Synchronization" : "Commit Marker"}
                                    </button>
                                    <button onClick={resetForm} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all">
                                        Cancel
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1 text-right">Geospatial Plotting</label>
                                <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                                    <button
                                        onClick={getCurrentPosition}
                                        type="button"
                                        className="absolute top-4 right-4 z-10 bg-blue-600 p-3 rounded-2xl shadow-xl text-white hover:bg-blue-500 transition-all active:scale-90"
                                    >
                                        <Navigation className="w-5 h-5" />
                                    </button>

                                    {isLoaded ? (
                                        <GoogleMap
                                            mapContainerStyle={mapContainerStyle}
                                            center={{ lat: formData.latitude, lng: formData.longitude }}
                                            zoom={14}
                                            onClick={handleMapClick}
                                            onLoad={(map) => { mapRef.current = map; }}
                                        >
                                            <Marker
                                                position={{ lat: formData.latitude, lng: formData.longitude }}
                                                draggable={true}
                                                onDragEnd={(e) => {
                                                    if (e.latLng) {
                                                        setFormData(prev => ({ ...prev, latitude: e.latLng!.lat(), longitude: e.latLng!.lng() }));
                                                    }
                                                }}
                                            />
                                        </GoogleMap>
                                    ) : (
                                        <div className="w-full h-[450px] bg-white/5 animate-pulse flex items-center justify-center">
                                            <RefreshCw className="w-10 h-10 text-slate-800 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-6 p-6 bg-black/40 rounded-[1.5rem] border border-white/5 flex justify-between items-center">
                                    <div>
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Target Coordinates</p>
                                        <p className="text-sm font-black text-blue-500 italic">
                                            {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <span className="text-[8px] font-black uppercase tracking-widest">Map Engine Loaded</span>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}