"use client";

import { useRef, useState } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { MapPin, Search } from "lucide-react";

interface GoogleAutocompleteInputProps {
    onAddressSelect: (addressData: {
        address: string;
        city: string;
        district: string;
        province: string;
        zipcode: string;
        latitude: number;
        longitude: number;
    }) => void;
    placeholder?: string;
    defaultValue?: string;
    className?: string;
}

export default function GoogleAutocompleteInput({ 
    onAddressSelect, 
    placeholder = "Search Physical Address...", 
    defaultValue = "",
    className = "" 
}: GoogleAutocompleteInputProps) {
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
        // Restrict to Indonesia for better accuracy if needed
        autocomplete.setComponentRestrictions({ country: "id" });
    };

    const onPlaceChanged = () => {
        if (autocompleteRef.current) {
            const place = autocompleteRef.current.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            const addressComponents = place.address_components || [];
            
            let city = "";
            let district = "";
            let province = "";
            let zipcode = "";

            addressComponents.forEach(component => {
                const types = component.types;
                if (types.includes("administrative_area_level_2") || types.includes("locality")) {
                    city = component.long_name;
                }
                if (types.includes("administrative_area_level_3") || types.includes("sublocality") || types.includes("sublocality_level_1")) {
                    district = component.long_name;
                }
                if (types.includes("administrative_area_level_1")) {
                    province = component.long_name;
                }
                if (types.includes("postal_code")) {
                    zipcode = component.long_name;
                }
            });

            onAddressSelect({
                address: place.formatted_address || "",
                city,
                district,
                province,
                zipcode,
                latitude: place.geometry.location.lat(),
                longitude: place.geometry.location.lng()
            });
        }
    };

    return (
        <div className={`relative group ${className}`}>
            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-600 transition-colors z-10" />
            <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                <input
                    type="text"
                    placeholder={placeholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all font-sans"
                    defaultValue={defaultValue}
                />
            </Autocomplete>
            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
        </div>
    );
}
