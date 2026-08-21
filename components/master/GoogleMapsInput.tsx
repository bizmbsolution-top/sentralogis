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
  }) => void;
  onChange?: (place: any) => void;
  value?: string;
  placeholder?: string;
  defaultValue?: string;
}

export default function GoogleMapsInput({ onPlaceSelect, onChange, value, placeholder, defaultValue }: GoogleMapsInputProps) {
  const [inputValue, setInputValue] = useState(value || defaultValue || '');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  
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
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (value: string) => {
    setInputValue(value);
    if (!value || value.length < 3) {
      setPredictions([]);
      return;
    }

    if (!window.google) return;

    if (!serviceRef.current) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }

    setLoading(true);
    serviceRef.current.getPlacePredictions(
      {
        input: value,
        componentRestrictions: { country: 'id' },
        types: ['geocode', 'establishment']
      },
      (results: any, status: any) => {
        setLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setShowPredictions(true);
        } else {
          setPredictions([]);
        }
      }
    );
  };

  const handleSelect = async (prediction: any) => {
    setInputValue(prediction.description);
    setShowPredictions(false);
    setPredictions([]);

    if (!window.google) return;
    if (!geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
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

        const payload = {
          address: place.formatted_address,
          city,
          province,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
          postal_code: postalCode,
        };
        onPlaceSelect?.(payload);
        onChange?.(payload);
      }
    });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder || "Cari alamat..."}
        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all"
        onFocus={() => predictions.length > 0 && setShowPredictions(true)}
      />
      
      {loading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              onClick={() => handleSelect(p)}
              className="w-full px-5 py-4 text-left hover:bg-slate-50 border-b border-slate-50 last:border-none transition-colors group"
            >
              <div className="text-[13px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.structured_formatting.main_text}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{p.structured_formatting.secondary_text}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
