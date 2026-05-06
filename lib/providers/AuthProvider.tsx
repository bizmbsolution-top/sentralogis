'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id?: string;
  tenant_code?: string;
  whatsapp?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenants?: {
    tenant_code: string;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ data: any; error: any }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isOwner: boolean;
  isSuperadmin: boolean;
  isTenantAdmin: boolean;
  isStaff: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchFullProfile = async (userId: string) => {
    try {
      console.log('[AuthProvider] Fetching full profile for:', userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      let finalProfile: Profile = profileData || {
        id: userId,
        email: '',
        full_name: 'User',
        role: 'user',
        is_active: true,
        created_at: '',
        updated_at: ''
      };

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id, role_code, full_name, tenants(tenant_code, name)')
        .eq('user_id', userId)
        .maybeSingle();

      if (!tenantError && tenantData) {
        console.log('[AuthProvider] Tenant info found:', tenantData);
        finalProfile.tenant_id = tenantData.tenant_id;
        finalProfile.tenants = tenantData.tenants as any;
        finalProfile.tenant_code = (tenantData.tenants as any)?.tenant_code;
        if (tenantData.full_name) finalProfile.full_name = tenantData.full_name;
        if (tenantData.role_code) finalProfile.role = tenantData.role_code;
      }

      return finalProfile;
    } catch (err) {
      console.error('[AuthProvider] Error:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchFullProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const p = await fetchFullProfile(session.user.id);
        setProfile(p);
      }
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] Auth Event:', event);
      if (session?.user) {
        setUser(session.user);
        const p = await fetchFullProfile(session.user.id);
        setProfile(p);
        
        // Auto-redirect from login if already authenticated
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          const getDashboardRoute = (role: string) => {
            switch(role) {
              case 'owner_sentralogis': return '/owner';
              case 'tenant_superadmin': return '/tenant';
              case 'hq_cs': return '/hq/work-orders';
              case 'hq_ops': return '/hq/ops-dashboard';
              case 'hq_finance': return '/hq/token';
              case 'hq_director_ops': return '/director/ops';
              case 'hq_director_fin': return '/director/finance';
              case 'hq_director_cs': return '/director/cs';
              case 'sbu_manager_tr': return '/sbu/trucking';
              case 'sbu_ops_tr': return '/sbu/trucking/work-orders';
              case 'sbu_fin_tr': return '/sbu/trucking/finances';
              case 'sbu_fin_wh': return '/sbu/warehouse/finances';
              case 'sbu_fin_fwd': return '/sbu/forwarding/finances';
              case 'driver': return '/driver/jobs';
              case 'tenant_admin': return '/tenant';
              default:
                if (role.startsWith('hq_')) return '/hq/sbu-activities';
                if (role.startsWith('sbu_')) return '/sbu/trucking';
                return '/tenant';
            }
          };
          window.location.href = getDashboardRoute(p?.role || '');
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(error.message);
        return { data: null, error };
      }

      if (data.user) {
        // Fetch profile immediately after login to get the role for redirection
        const userProfile = await fetchFullProfile(data.user.id);
        setProfile(userProfile);
        
        toast.success('Login berhasil!');
        
        // Helper function for role-based routing
        const getDashboardRoute = (role: string) => {
          switch(role) {
            case 'owner_sentralogis': return '/owner';
            case 'tenant_superadmin': return '/tenant';
            case 'hq_cs': return '/hq/work-orders';
            case 'hq_ops': return '/hq/ops-dashboard';
            case 'hq_finance': return '/hq/token';
            case 'hq_director_ops': return '/director/ops';
            case 'hq_director_fin': return '/director/finance';
            case 'hq_director_cs': return '/director/cs';
            case 'sbu_manager_tr': return '/sbu/trucking';
            case 'sbu_ops_tr': return '/sbu/trucking/work-orders';
            case 'sbu_fin_tr': return '/sbu/trucking/finances';
            case 'sbu_fin_wh': return '/sbu/warehouse/finances';
            case 'sbu_fin_fwd': return '/sbu/forwarding/finances';
            case 'driver': return '/driver/jobs';
            case 'tenant_admin': return '/tenant';
            default:
              if (role.startsWith('hq_')) return '/hq/sbu-activities';
              if (role.startsWith('sbu_')) return '/sbu/trucking';
              return '/tenant';
          }
        };

        if (typeof window !== 'undefined') {
          window.location.href = getDashboardRoute(userProfile?.role || '');
        }
      }
      
      return { data, error: null };
    } catch (err: any) {
      toast.error(err.message || 'Login gagal');
      return { data: null, error: err };
    }
  };

  const logout = async () => {
    try {
      console.log('[AuthProvider] Starting logout process...');
      setLoading(true);
      
      // 1. Clear all React state first
      setUser(null);
      setProfile(null);

      // 2. Clear all browser storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear all cookies manually as a fallback
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
      }

      // 3. Perform Supabase sign out
      const { error } = await supabase.auth.signOut();
      if (error) console.error('[AuthProvider] Supabase signOut error:', error);
      
      toast.success('Logout berhasil');

      // 4. Force a clean reload to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('[AuthProvider] Logout failed:', err);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    profile,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isOwner: profile?.role === 'owner_sentralogis',
    isSuperadmin: profile?.role === 'tenant_superadmin',
    isTenantAdmin: profile?.role === 'tenant_admin' || profile?.role === 'tenant_superadmin',
    isStaff: !!profile?.role && profile?.role !== 'owner_sentralogis' && profile?.role !== 'tenant_superadmin',
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
