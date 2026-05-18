'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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

const getDashboardRoute = (role: string) => {
  // [AI] All director roles should land on the Executive Business Dashboard
  if (role.startsWith('hq_director_')) {
    return '/hq/business';
  }

  switch(role) {
    case 'owner_sentralogis': return '/owner';
    case 'tenant_superadmin': return '/tenant';
    case 'hq_cs': return '/hq/work-orders';
    case 'hq_ops': return '/hq/ops-dashboard';
    case 'hq_finance': return '/hq/token';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const hasInitializedProfile = useRef(false);

  const fetchFullProfile = async (userId: string, retryCount = 0): Promise<Profile | null> => {
    try {
      console.log(`[AuthProvider] Fetching full profile (attempt ${retryCount + 1}) for:`, userId);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      // If profile not found and it's a fresh login, wait a bit and retry once
      // to give database triggers time to populate the profiles table
      if (!profileData && retryCount < 1) {
        console.log('[AuthProvider] Profile not found, retrying in 800ms...');
        await new Promise(resolve => setTimeout(resolve, 800));
        return fetchFullProfile(userId, retryCount + 1);
      }

      if (!profileData) {
        console.warn('[AuthProvider] Profile not found for user:', userId);
        return {
          id: userId,
          email: '',
          full_name: 'Unknown User',
          role: '',
          is_active: false,
          created_at: '',
          updated_at: ''
        };
      }

      const finalProfile: Profile = {
        id: profileData.id,
        email: '',
        full_name: profileData.full_name || 'User',
        role: profileData.role || '',
        is_active: profileData.is_active ?? false,
        created_at: profileData.created_at || '',
        updated_at: profileData.updated_at || ''
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
    // [AI] Rely strictly on onAuthStateChange to handle session initialization.
    // supabase.auth.onAuthStateChange immediately fires INITIAL_SESSION upon subscribing.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] Auth Event:', event, 'Profile loaded:', hasInitializedProfile.current);
      
      if (session?.user) {
        setUser(session.user);
        
        // Fetch/Verify profile on SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED, or if not loaded yet
        if (!hasInitializedProfile.current || event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          setLoading(true);
          try {
            const p = await fetchFullProfile(session.user.id);
            
            // Validate user role and status
            if (!p?.role || p.role === '' || p.is_active === false) {
              console.warn('[AuthProvider] User has no valid role assigned:', p);
              toast.error('Akun Anda belum memiliki peran yang valid. Silakan hubungi administrator.');
              await supabase.auth.signOut();
              setUser(null);
              setProfile(null);
              hasInitializedProfile.current = false;
              setLoading(false);
              return;
            }

            setProfile(p);
            hasInitializedProfile.current = true;

            if (event === 'SIGNED_IN') {
              toast.dismiss(); // [AI] Clear any stale or duplicate toasts
              toast.success('Login berhasil!');
            }

            // Auto-redirect from login if on the login page
            if (typeof window !== 'undefined' && window.location.pathname === '/login') {
              const dashboardRoute = getDashboardRoute(p.role);
              console.log('[AuthProvider] Redirecting to:', dashboardRoute);
              router.push(dashboardRoute);
            }
          } catch (fetchErr) {
            console.error('[AuthProvider] Error fetching/validating profile:', fetchErr);
          } finally {
            setLoading(false);
          }
        } else {
          // [AI] Ensure loading is resolved to false if profile is already loaded to prevent UI spin lock
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        hasInitializedProfile.current = false;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true); // Set loading to true while authenticating
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return { data: null, error };
      }

      // [AI] The successful session change and redirection are completely handled 
      // by the unified onAuthStateChange listener to eliminate race conditions.
      return { data, error: null };
    } catch (err: any) {
      toast.error(err.message || 'Login gagal');
      setLoading(false);
      return { data: null, error: err };
    }
  };

  const logout = async () => {
    try {
      console.log('[AuthProvider] Force logout initiated...');
      
      // 1. Immediate UI state clearing
      setLoading(true);
      setUser(null);
      setProfile(null);
      hasInitializedProfile.current = false;

      // 2. Clear storage first to prevent any re-fetch loops
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Comprehensive cookie clearing
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
          // Also clear for subdomains just in case
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        }
      }

      // 3. Trigger Supabase Signout (non-blocking for speed)
      supabase.auth.signOut().catch(e => console.error('Signout background error:', e));
      
      toast.success('Logout berhasil');

      // 4. Final hard redirect to ensure clean slate
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.replace('/login');
        }, 100);
      }
    } catch (err) {
      console.error('[AuthProvider] Logout critical error:', err);
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
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
