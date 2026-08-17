"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";

export interface DriverSession {
  driver_id: string;
  driver_type: "OWN" | "VENDOR" | string;
  whatsapp: string;
  name: string;
  tenant_id?: string;
  entity_id?: string | null;
  profile_id?: string | null;
}

interface DriverAuthContextType {
  session: DriverSession | null;
  isLoading: boolean;
  login: (whatsapp: string, pin: string, joToken?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => void;
}

const DriverAuthContext = createContext<DriverAuthContextType | undefined>(undefined);

export function DriverAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = () => {
    try {
      const stored = localStorage.getItem("sentralogis_driver_session");
      if (stored) {
        setSession(JSON.parse(stored));
      } else {
        setSession(null);
      }
    } catch (e) {
      console.error("Failed to parse driver session", e);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (whatsapp: string, pin: string, joToken?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, pin, joToken })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "Login gagal" };
      }

      const driver = data.driver;
      const newSession: DriverSession = {
        driver_id: driver.id,
        driver_type: driver.driver_type || (driver.entity_id ? "VENDOR" : "OWN"),
        whatsapp: driver.whatsapp || "",
        name: driver.name,
        tenant_id: driver.tenant_id,
        entity_id: driver.entity_id,
        profile_id: driver.profile_id || null,
      };

      // Preserve fallback localStorage save for backward compatibility
      localStorage.setItem("sentralogis_driver_session", JSON.stringify(newSession));
      setSession(newSession);
      
      return { success: true };
    } catch (e: any) {
      console.error("Login error:", e);
      return { success: false, error: e.message || "Terjadi kesalahan jaringan" };
    }
  };

  const logout = () => {
    localStorage.removeItem("sentralogis_driver_session");
    setSession(null);
  };

  return (
    <DriverAuthContext.Provider value={{ session, isLoading, login, logout, checkAuth }}>
      {children}
    </DriverAuthContext.Provider>
  );
}

export function useDriverAuth() {
  const context = useContext(DriverAuthContext);
  if (context === undefined) {
    throw new Error("useDriverAuth must be used within a DriverAuthProvider");
  }
  return context;
}
