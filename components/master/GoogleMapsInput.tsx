'use client';

import { useEffect, useRef, useState } from 'react';

interface GoogleMapsInputProps {
  onPlaceSelect?: (place: {
    address: string;
    city: string;
    province: string;
    latitude: number;
    longitude: number;
    postal_code: string;
    verifiedFromMaps?: boolean;
    latOrNull?: number | null;
    lngOrNull?: number | null;
  }) => void;
  onVerificationChange?: (verified: boolean) => void;
  onChange?: (place: any) => void;
  value?: string;
  placeholder?: string;
  defaultValue?: string;
  isVerified?: boolean;
  showBadge?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function GoogleMapsInput({
  onPlaceSelect,
  onVerificationChange,
  onChange,
  value,
  placeholder,
  defaultValue,
  isVerified = false,
  showBadge = true,
  disabled = false,
  className = '',
}: GoogleMapsInputProps) {
  const [inputValue, setInputValue] = useState(value || defaultValue || '');
  const [verifiedState, setVerifiedState] = useState(isVerified);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMapsAvailable, setIsMapsAvailable] = useState(true);

  const serviceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value || '');
    } else if (defaultValue !== undefined) {
      setInputValue(defaultValue || '');
    }
  }, [value, defaultValue]);

  useEffect(() => {
    setVerifiedState(isVerified);
  }, [isVerified]);

  useEffect(() => {
    // Check if Google Maps script is available
    if (typeof window !== 'undefined' && !window.google) {
      setIsMapsAvailable(false);
    } else {
      setIsMapsAvailable(true);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (val: string) => {
    setInputValue(val);

    // If user edits text after place was verified, immediately invalidate verification and clear coordinates
    if (verifiedState) {
      setVerifiedState(false);
      onVerificationChange?.(false);
      // Invalidate coordinates
      onPlaceSelect?.({
        address: val,
        city: '',
        province: '',
        latitude: 0,
        longitude: 0,
        postal_code: '',
        verifiedFromMaps: false,
        latOrNull: null,
        lngOrNull: null,
      });
      onChange?.({
        address: val,
        latitude: null,
        longitude: null,
        latOrNull: null,
        lngOrNull: null,
        verifiedFromMaps: false,
      });
    } else {
      onVerificationChange?.(false);
      onChange?.(val);
    }

    if (!val || val.length < 3) {
      setPredictions([]);
      return;
    }

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      setIsMapsAvailable(false);
      return;
    }

    setIsMapsAvailable(true);

    if (!serviceRef.current) {
      try {
        serviceRef.current = new window.google.maps.places.AutocompleteService();
      } catch (err) {
        setIsMapsAvailable(false);
        return;
      }
    }

    setLoading(true);
    try {
      serviceRef.current.getPlacePredictions(
        {
          input: val,
          componentRestrictions: { country: 'id' },
          types: ['geocode', 'establishment'],
        },
        (results: any, status: any) => {
          setLoading(false);
          if (
            window.google &&
            window.google.maps &&
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            results
          ) {
            setPredictions(results);
            setShowPredictions(true);
          } else {
            setPredictions([]);
          }
        }
      );
    } catch {
      setLoading(false);
      setIsMapsAvailable(false);
    }
  };

  const handleSelect = async (prediction: any) => {
    setInputValue(prediction.description);
    setShowPredictions(false);
    setPredictions([]);
    setVerifiedState(true);
    onVerificationChange?.(true);

    if (!window.google) {
      setIsMapsAvailable(false);
      onPlaceSelect?.({
        address: prediction.description,
        city: '',
        province: '',
        latitude: 0,
        longitude: 0,
        postal_code: '',
        verifiedFromMaps: false,
        latOrNull: null,
        lngOrNull: null,
      });
      return;
    }

    if (!geocoderRef.current) {
      try {
        geocoderRef.current = new window.google.maps.Geocoder();
      } catch {
        setIsMapsAvailable(false);
        return;
      }
    }

    geocoderRef.current.geocode({ placeId: prediction.place_id }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const place = results[0];
        let city = '';
        let province = '';
        let postalCode = '';

        place.address_components?.forEach((component: any) => {
          const types = component.types;
          if (types.includes('locality')) city = component.long_name;
          if (types.includes('administrative_area_level_2') && !city) city = component.long_name;
          if (types.includes('administrative_area_level_1')) province = component.long_name;
          if (types.includes('postal_code')) postalCode = component.long_name;
        });

        const lat = typeof place.geometry?.location?.lat === 'function' ? place.geometry.location.lat() : null;
        const lng = typeof place.geometry?.location?.lng === 'function' ? place.geometry.location.lng() : null;

        const payload = {
          address: place.formatted_address || prediction.description,
          city,
          province,
          latitude: lat ?? 0,
          longitude: lng ?? 0,
          postal_code: postalCode,
          verifiedFromMaps: true,
          latOrNull: lat,
          lngOrNull: lng,
        };
        onPlaceSelect?.(payload);
        onChange?.(payload);
      } else {
        // Geocode failed or returned zero results: do not claim verified
        setVerifiedState(false);
        onVerificationChange?.(false);
        onPlaceSelect?.({
          address: prediction.description,
          city: '',
          province: '',
          latitude: 0,
          longitude: 0,
          postal_code: '',
          verifiedFromMaps: false,
          latOrNull: null,
          lngOrNull: null,
        });
        onChange?.({
          address: prediction.description,
          latitude: null,
          longitude: null,
          latOrNull: null,
          lngOrNull: null,
          verifiedFromMaps: false,
        });
      }
    });
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          disabled={disabled}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder || 'Cari alamat via Google Maps...'}
          className={`w-full h-12 px-4 pr-10 bg-slate-50 border rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all ${
            verifiedState ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          onFocus={() => predictions.length > 0 && setShowPredictions(true)}
        />

        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Verification & Status Badges */}
      {showBadge && (
        <div className="flex items-center gap-2 mt-1.5 px-0.5">
          {verifiedState ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Terverifikasi Google Maps
            </span>
          ) : inputValue && inputValue.trim().length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Input Manual (Belum Terverifikasi Maps)
            </span>
          ) : null}

          {!isMapsAvailable && (
            <span className="text-[10px] text-slate-400 italic">
              (Layanan Maps offline/fallback manual aktif)
            </span>
          )}
        </div>
      )}

      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full px-5 py-3.5 text-left hover:bg-slate-50 border-b border-slate-50 last:border-none transition-colors group flex flex-col"
            >
              <div className="text-[13px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                {p.structured_formatting?.main_text || p.description}
              </div>
              {p.structured_formatting?.secondary_text && (
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {p.structured_formatting.secondary_text}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
