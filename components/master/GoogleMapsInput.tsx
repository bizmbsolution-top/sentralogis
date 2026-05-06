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
  placeholder?: string;
  defaultValue?: string;
}

export default function GoogleMapsInput({ onPlaceSelect, placeholder, defaultValue }: GoogleMapsInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<any>(null);

  useEffect(() => {
    // Wait until window.google is available
    const initAutocomplete = () => {
      if (!window.google || !inputRef.current) return;

      const autoCompleteInstance = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'id' }, // Indonesia
      });

      autoCompleteInstance.addListener('place_changed', () => {
        const place = autoCompleteInstance.getPlace();
        if (place.geometry) {
          // Extract address components
          let city = '';
          let province = '';
          let postalCode = '';

          place.address_components?.forEach((component: any) => {
            const types = component.types;
            if (types.includes('locality') && !city) city = component.long_name;
            if (types.includes('administrative_area_level_2')) city = component.long_name;
            if (types.includes('administrative_area_level_1')) province = component.long_name;
            if (types.includes('postal_code')) postalCode = component.long_name;
          });

          onPlaceSelect?.({
            address: place.formatted_address || '',
            city,
            province,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            postal_code: postalCode,
          });
        }
      });

      setAutocomplete(autoCompleteInstance);
    };

    if (window.google) {
      initAutocomplete();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          initAutocomplete();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }

    return () => {
      if (autocomplete) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [onPlaceSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder || "Cari alamat..."}
      defaultValue={defaultValue}
      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 text-sm"
    />
  );
}
