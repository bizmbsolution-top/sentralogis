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
  const [showLoginToast, setShowLoginToast] = useState(false);
  const router = useRouter();
  const hasInitializedProfile = useRef(false);
  const isFetchingProfile = useRef(false);

  const fetchFullProfile = async (userId: string): Promise<Profile | null> => {
    try {
      // Run queries in parallel for faster loading
      const [profileResult, tenantResult] = await Promise.all([
        Promise.race([
          supabase
            .from('profiles')
            .select('id, full_name, role, is_active, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))
        ]),
        Promise.race([
          supabase
            .from('tenant_users')
            .select('tenant_id, role_code, full_name')
            .eq('user_id', userId)
            .maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))
        ])
      ]);

      const profileData = (profileResult as any)?.data;
      const profileError = (profileResult as any)?.error;
      const tenantData = (tenantResult as any)?.data;
      const tenantError = (tenantResult as any)?.error;

      console.log('[Auth] Profile query:', { data: !!profileData, error: profileError?.message });
      console.log('[Auth] Tenant query:', { data: !!tenantData, error: tenantError?.message });
      console.log('[Auth] Profile role:', profileData?.role);
      console.log('[Auth] Tenant role_code:', tenantData?.role_code);

      if (profileError || !profileData) {
        console.error('[Auth] Profile fetch failed:', profileError);
        return null;
      }

      // Accept role from EITHER profiles.role OR tenant_users.role_code
      const roleFromProfiles = profileData.role || '';
      const roleFromTenant = tenantData?.role_code || '';
      const finalRole = roleFromTenant || roleFromProfiles;

      console.log('[Auth] Final role:', finalRole);

      const finalProfile: Profile = {
        id: profileData.id,
        email: '',
        full_name: profileData.full_name || 'User',
        role: finalRole,
        is_active: profileData.is_active ?? false,
        created_at: profileData.created_at || '',
        updated_at: profileData.updated_at || ''
      };

      if (!tenantError && tenantData) {
        finalProfile.tenant_id = tenantData.tenant_id;
        finalProfile.tenant_code = tenantData.tenant_id;
        if (tenantData.full_name) finalProfile.full_name = tenantData.full_name;
      }

      // Fetch tenant name in background (non-blocking)
      if (finalProfile.tenant_id) {
        Promise.race([
          supabase
            .from('tenants')
            .select('tenant_code, name')
            .eq('id', finalProfile.tenant_id)
            .maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]).then((result: any) => {
          if (result?.data) {
            finalProfile.tenant_code = result.data.tenant_code;
            finalProfile.tenants = { tenant_code: result.data.tenant_code, name: result.data.name };
          }
        }).catch(() => {});
      }

      return finalProfile;
    } catch (err) {
      console.error('[Auth] fetchFullProfile crashed:', err);
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
    if (showLoginToast) {
      toast.success('Login berhasil!', { duration: 2000 });
      setShowLoginToast(false);
    }
  }, [showLoginToast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        
        if (hasInitializedProfile.current || isFetchingProfile.current) {
          setLoading(false);
          return;
        }

        isFetchingProfile.current = true;
        setLoading(true);
        
        const timeoutId = setTimeout(() => {
          if (isFetchingProfile.current) {
            isFetchingProfile.current = false;
            setLoading(false);
          }
        }, 15000);
        
        try {
          const p = await fetchFullProfile(session.user.id);
          clearTimeout(timeoutId);
          
          if (!p?.role || p.role === '' || p.is_active === false) {
            console.error('[Auth] Role validation failed:', { role: p?.role, isActive: p?.is_active });
            if (!p?.role || p.role === '') {
              toast.error('Akun tidak memiliki role. Cek tabel profiles.role dan tenant_users.role_code di Supabase.');
            } else if (p.is_active === false) {
              toast.error('Akun Anda dinonaktifkan. Hubungi administrator.');
            } else {
              toast.error('Akun Anda belum memiliki peran yang valid. Silakan hubungi administrator.');
            }
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            hasInitializedProfile.current = false;
            isFetchingProfile.current = false;
            setLoading(false);
            return;
          }

          setProfile(p);
          hasInitializedProfile.current = true;
          isFetchingProfile.current = false;
          setLoading(false);

          if (event === 'SIGNED_IN') {
            setShowLoginToast(true);
          }

          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            const dashboardRoute = getDashboardRoute(p.role);
            router.push(dashboardRoute);
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          isFetchingProfile.current = false;
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        hasInitializedProfile.current = false;
        isFetchingProfile.current = false;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const login = async (email: string, password: string) => {
    try {
      // Reset flags before login to allow re-login after failure
      hasInitializedProfile.current = false;
      isFetchingProfile.current = false;
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err: any) {
      toast.error(err.message || 'Login gagal');
      setLoading(false);
      return { data: null, error: err };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setUser(null);
      setProfile(null);
      hasInitializedProfile.current = false;

      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        }
      }

      supabase.auth.signOut().catch(() => {});
      
      toast.success('Logout berhasil');

      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.replace('/login');
        }, 100);
      }
    } catch (err) {
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
