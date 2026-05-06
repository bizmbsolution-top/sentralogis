'use client';

import { useState } from 'react';
import usePlacesAutocomplete from 'use-places-autocomplete';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface LocationAutocompleteProps {
  onSelect: (place: {
    address: string;
    latitude: number;
    longitude: number;
    place_id: string;
  }) => void;
  placeholder?: string;
  defaultValue?: string;
}

export default function LocationAutocomplete({ onSelect, placeholder, defaultValue }: LocationAutocompleteProps) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'id' },
    },
    debounce: 300,
    defaultValue: defaultValue
  });

  const [isSearching, setIsSearching] = useState(false);

  const handleSelect = async (suggestion: any) => {
    const address = suggestion.description;
    setValue(address, false);
    clearSuggestions();
    setIsSearching(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
      );
      const result = await response.json();

      if (result.results && result.results[0]) {
        const { lat, lng } = result.results[0].geometry.location;
        onSelect({
          address,
          latitude: lat,
          longitude: lng,
          place_id: result.results[0].place_id
        });
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder={placeholder || "Cari alamat di Google Maps..."}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 outline-none transition-all"
        />
      </div>

      {status === 'OK' && (
        <div className="absolute z-[110] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="divide-y divide-slate-50 max-h-60 overflow-auto">
            {data.map((suggestion) => (
              <li
                key={suggestion.place_id}
                onClick={() => handleSelect(suggestion)}
                className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-start gap-3 transition-colors group"
              >
                <MapPin size={16} className="text-slate-400 mt-0.5 group-hover:text-blue-600 transition-colors" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900 line-clamp-1">{suggestion.structured_formatting.main_text}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{suggestion.structured_formatting.secondary_text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-end">
            <img 
              src="https://developers.google.com/static/maps/documentation/images/powered_by_google_on_white.png" 
              alt="Powered by Google" 
              className="h-3 opacity-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
