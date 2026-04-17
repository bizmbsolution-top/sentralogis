"use client";

import { createContext, useContext, ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// Single definition of libraries — MUST be outside component to prevent re-renders
const MAPS_LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

type GoogleMapsContextType = {
    isLoaded: boolean;
};

const GoogleMapsContext = createContext<GoogleMapsContextType>({ isLoaded: false });

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
    const { isLoaded } = useJsApiLoader({
        id: "google-map-script",
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: MAPS_LIBRARIES,
        language: "id",
    });

    return (
        <GoogleMapsContext.Provider value={{ isLoaded }}>
            {children}
        </GoogleMapsContext.Provider>
    );
}

export function useGoogleMaps() {
    return useContext(GoogleMapsContext);
}
