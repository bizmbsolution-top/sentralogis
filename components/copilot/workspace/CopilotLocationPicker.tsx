'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Search, CheckCircle2, Building2, Globe, Loader2, Navigation, AlertCircle } from 'lucide-react';
import { useGoogleMaps } from '@/lib/google-maps-context';

export interface VerifiedLocation {
  name: string;
  address: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
  isMasterMatch: boolean;
  masterLocationId?: string | null;
  masterLocationCode?: string | null;
}

interface CopilotLocationPickerProps {
  onSelectLocation: (loc: VerifiedLocation, field: 'origin' | 'destination') => void;
  activeField?: 'origin' | 'destination';
  placeholder?: string;
  initialQuery?: string;
  className?: string;
}

export function CopilotLocationPicker({
  onSelectLocation,
  activeField = 'origin',
  placeholder,
  initialQuery = '',
  className = '',
}: CopilotLocationPickerProps) {
  const { isLoaded } = useGoogleMaps();
  const [selectedTab, setSelectedTab] = useState<'origin' | 'destination'>(activeField);
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [masterResults, setMasterResults] = useState<any[]>([]);
  const [googlePredictions, setGooglePredictions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const autocompleteServiceRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelectedTab(activeField);
  }, [activeField]);

  // Search master locations via internal API
  const searchMaster = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setMasterResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/commercial/locations?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMasterResults(json.data);
        }
      }
    } catch (err) {
      console.warn('[CopilotLocationPicker] Master search error:', err);
    }
  }, []);

  // Search Google Maps Autocomplete
  const searchGoogle = useCallback(
    (q: string) => {
      if (!isLoaded || typeof window === 'undefined' || !(window as any).google?.maps?.places) {
        setGooglePredictions([]);
        return;
      }
      if (!q || q.trim().length < 2) {
        setGooglePredictions([]);
        return;
      }

      if (!autocompleteServiceRef.current) {
        autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
      }

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: q,
          componentRestrictions: { country: 'id' },
          types: ['geocode', 'establishment'],
        },
        (predictions: any, status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && predictions) {
            setGooglePredictions(predictions);
          } else {
            setGooglePredictions([]);
          }
        }
      );
    },
    [isLoaded]
  );

  const handleInputChange = (val: string) => {
    setQuery(val);
    setErrorMessage(null);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (val.trim().length < 2) {
      setMasterResults([]);
      setGooglePredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      await searchMaster(val);
      searchGoogle(val);
      setIsSearching(false);
    }, 250);
  };

  // User selects an existing Master Data location
  const handleSelectMaster = (item: any) => {
    const verified: VerifiedLocation = {
      name: item.name,
      address: item.address || item.name,
      city: item.city || null,
      province: item.province || null,
      postalCode: item.postal_code || null,
      latitude: item.latitude !== null && item.latitude !== undefined ? Number(item.latitude) : null,
      longitude: item.longitude !== null && item.longitude !== undefined ? Number(item.longitude) : null,
      placeId: null,
      isMasterMatch: true,
      masterLocationId: item.id,
      masterLocationCode: item.location_code || null,
    };
    onSelectLocation(verified, selectedTab);
    setQuery('');
    setMasterResults([]);
    setGooglePredictions([]);
  };

  // User selects a Google Maps Place
  const handleSelectGooglePlace = async (prediction: any) => {
    setIsSearching(true);
    try {
      // 1. Geocode place to get detailed address & coordinates
      let lat: number | null = null;
      let lng: number | null = null;
      let city: string | null = null;
      let province: string | null = null;
      let postalCode: string | null = null;

      if ((window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder();
        const geoRes = await new Promise<any>((resolve) => {
          geocoder.geocode({ placeId: prediction.place_id }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              resolve(results[0]);
            } else {
              resolve(null);
            }
          });
        });

        if (geoRes) {
          lat = geoRes.geometry?.location?.lat?.() ?? null;
          lng = geoRes.geometry?.location?.lng?.() ?? null;
          geoRes.address_components?.forEach((comp: any) => {
            const types = comp.types || [];
            if (types.includes('locality')) city = comp.long_name;
            if (types.includes('administrative_area_level_2') && !city) city = comp.long_name;
            if (types.includes('administrative_area_level_1')) province = comp.long_name;
            if (types.includes('postal_code')) postalCode = comp.long_name;
          });
        }
      }

      // 2. Authoritative match check against backend Master Data via API
      const placePayload = {
        name: prediction.structured_formatting?.main_text || prediction.description,
        address: prediction.description,
        city,
        province,
        postalCode,
        latitude: lat,
        longitude: lng,
        placeId: prediction.place_id,
      };

      const matchRes = await fetch('/api/v1/commercial/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: placePayload }),
      });

      let verified: VerifiedLocation;

      if (matchRes.ok) {
        const json = await matchRes.json();
        if (json.success && json.data) {
          verified = json.data;
        } else {
          verified = {
            name: placePayload.name,
            address: placePayload.address,
            city,
            province,
            postalCode,
            latitude: lat,
            longitude: lng,
            placeId: prediction.place_id,
            isMasterMatch: false,
            masterLocationId: null,
            masterLocationCode: null,
          };
        }
      } else {
        verified = {
          name: placePayload.name,
          address: placePayload.address,
          city,
          province,
          postalCode,
          latitude: lat,
          longitude: lng,
          placeId: prediction.place_id,
          isMasterMatch: false,
          masterLocationId: null,
          masterLocationCode: null,
        };
      }

      onSelectLocation(verified, selectedTab);
      setQuery('');
      setMasterResults([]);
      setGooglePredictions([]);
    } catch (err: any) {
      console.error('[CopilotLocationPicker] Selection match error:', err);
      setErrorMessage('Terjadi kendala saat memverifikasi lokasi. Silakan coba lagi.');
    } finally {
      setIsSearching(false);
    }
  };

  const hasResults = masterResults.length > 0 || googlePredictions.length > 0;

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Field Selector Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSelectedTab('origin')}
          className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
            selectedTab === 'origin'
              ? 'bg-white text-blue-700 border-b-2 border-blue-600 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Navigation className="w-3.5 h-3.5 text-blue-600" />
          <span>Lokasi Asal (Origin)</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTab('destination')}
          className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-colors ${
            selectedTab === 'destination'
              ? 'bg-white text-emerald-700 border-b-2 border-emerald-600 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>Lokasi Tujuan (Destination)</span>
        </button>
      </div>

      {/* Input bar */}
      <div className="p-3">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Search className="w-4 h-4" />}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              placeholder ||
              (selectedTab === 'origin'
                ? 'Cari lokasi asal (cth: NPCT 1 Priok, Marunda, Pelabuhan)...'
                : 'Cari lokasi tujuan (cth: Cikarang, Kawasan GIIC, Surabaya)...')
            }
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        {errorMessage && (
          <div className="mt-2 text-[11px] text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Autocomplete Results Dropdown */}
      {hasResults && (
        <div className="border-t border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
          {/* Master Data Section */}
          {masterResults.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-blue-600" />
                <span>Master Data Lokasi (Resmi Tenant)</span>
              </div>
              {masterResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectMaster(item)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50/60 flex items-start gap-2.5 transition-colors group"
                >
                  <Building2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                        {item.name}
                      </span>
                      {item.location_code && (
                        <span className="px-1 py-0.2 bg-blue-100 text-blue-700 rounded text-[9px] font-mono font-bold">
                          {item.location_code}
                        </span>
                      )}
                      <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-medium ml-auto shrink-0 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        MASTER MATCH
                      </span>
                    </div>
                    {item.address && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.address}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Google Maps Places Section */}
          {googlePredictions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>Google Maps Places</span>
              </div>
              {googlePredictions.map((pred) => (
                <button
                  key={pred.place_id}
                  type="button"
                  onClick={() => handleSelectGooglePlace(pred)}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 flex items-start gap-2.5 transition-colors group"
                >
                  <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 truncate">
                        {pred.structured_formatting?.main_text || pred.description}
                      </span>
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-medium ml-auto shrink-0">
                        GOOGLE MAPS
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {pred.structured_formatting?.secondary_text || pred.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="px-3 py-1.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <span>Ketik nama tempat/pelabuhan/gudang untuk memilih lokasi terverifikasi</span>
        <span className="text-slate-400">Google Maps & Master Data</span>
      </div>
    </div>
  );
}
