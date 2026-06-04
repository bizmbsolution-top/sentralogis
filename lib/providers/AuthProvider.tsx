'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getDashboardRoute } from '@/lib/utils/dashboardRoute';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id?: string;
  tenant_code?: string;
  warehouse_id?: string;
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
  profileLoading: boolean;
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

// [AI] Single promise that resolves when profile is loaded — avoids polling loop in login()
let profileResolve: ((profile: Profile | null) => void) | null = null;
let profilePromise: Promise<Profile | null> | null = null;

function createProfilePromise(): Promise<Profile | null> {
  if (!profilePromise) {
    profilePromise = new Promise((resolve) => {
      profileResolve = resolve;
    });
  }
  return profilePromise;
}

function resolveProfilePromise(profile: Profile | null) {
  if (profileResolve) {
    profileResolve(profile);
    profileResolve = null;
    profilePromise = null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const router = useRouter();
  const hasInitializedProfile = useRef(false);
  const isFetchingProfile = useRef(false);
  const profileCache = useRef<Profile | null>(null);

  const fetchFullProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const TIMEOUT_MS = 10000;

      const fetchWithTimeout = async (query: any) => {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
        });

        try {
          const result = await Promise.race([query, timeoutPromise]);
          return result;
        } finally {
          clearTimeout(timeoutId!);
        }
      };

      const [profileResult, tenantResult] = await Promise.all([
        fetchWithTimeout(
          supabase
            .from('profiles')
            .select('id, email, full_name, role, whatsapp, is_active, created_at, updated_at')
            .eq('id', userId)
            .maybeSingle()
        ),
        fetchWithTimeout(
          supabase
            .from('tenant_users')
            .select('tenant_id, role_code, full_name, warehouse_id')
            .eq('user_id', userId)
            .maybeSingle()
        )
      ]);

      const profileData = (profileResult as any)?.data;
      const profileError = (profileResult as any)?.error;
      const tenantData = (tenantResult as any)?.data;
      const tenantError = (tenantResult as any)?.error;

      // If both fail, return null
      if ((profileError || !profileData) && (!tenantData || tenantError)) {
        console.error('[Auth] Both profile and tenant fetch failed:', { profileError, tenantError });
        return null;
      }

      const roleFromProfiles = profileData?.role || '';
      const roleFromTenant = tenantData?.role_code || '';
      const finalRole = roleFromTenant || roleFromProfiles;

      const finalProfile: Profile = {
        id: profileData?.id || tenantData?.user_id || userId,
        email: profileData?.email || '',
        full_name: profileData?.full_name || tenantData?.full_name || 'User',
        role: finalRole,
        whatsapp: profileData?.whatsapp || '',
        is_active: profileData?.is_active ?? true,
        created_at: profileData?.created_at || '',
        updated_at: profileData?.updated_at || ''
      };

      if (!tenantError && tenantData) {
        finalProfile.tenant_id = tenantData.tenant_id;
        finalProfile.tenant_code = tenantData.tenant_id;
        finalProfile.warehouse_id = tenantData.warehouse_id;
      } else if (finalRole === 'tenant_superadmin' || finalRole === 'tenant_admin') {
        // [AI] Fallback: Tenant Owners might not be in tenant_users, so check the tenants table
        try {
          const { data: ownerData } = await supabase
            .from('tenants')
            .select('id, tenant_code')
            .eq('user_id', userId)
            .maybeSingle();
            
          if (ownerData) {
            finalProfile.tenant_id = ownerData.id;
            finalProfile.tenant_code = ownerData.tenant_code || ownerData.id;
          }
        } catch (e) {
          console.error('[Auth] Failed to fetch owner tenant_id', e);
        }
      }

      if (finalProfile.tenant_id) {
        let bgTimeoutId: NodeJS.Timeout;
        const bgTimeoutPromise = new Promise((_, reject) => {
          bgTimeoutId = setTimeout(() => reject(new Error('timeout')), 5000);
        });

        Promise.race([
          supabase
            .from('tenants')
            .select('tenant_code, name')
            .eq('id', finalProfile.tenant_id)
            .maybeSingle(),
          bgTimeoutPromise
        ]).then((result: any) => {
          clearTimeout(bgTimeoutId);
          if (result?.data) {
            // [AI] Update profile in-place — this is safe because the profile object was already returned
            finalProfile.tenant_code = result.data.tenant_code;
            finalProfile.tenants = { tenant_code: result.data.tenant_code, name: result.data.name };
            // Trigger a state update so UI reflects the tenant name
            setProfile({ ...finalProfile });
            profileCache.current = { ...finalProfile };
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
      if (p) profileCache.current = p;
    }
  };

  // [AI] Handle profile fetch result — shared logic for all auth events
  const handleProfileResult = useCallback((p: Profile | null, event: string) => {
    if (!p && profileCache.current) {
      console.warn('[Auth] Profile fetch failed, using cached profile');
      setProfile(profileCache.current);
    } else if (p) {
      setProfile(p);
      profileCache.current = p;
    } else {
      // No profile and no cache
      console.error('[Auth] Profile is null');
      isFetchingProfile.current = false;
      hasInitializedProfile.current = false;
      setLoading(false);
      setProfileLoading(false);
      resolveProfilePromise(null);
      return;
    }

    // Validate role
    const role = p?.role || '';
    if (!role) {
      console.error('[Auth] Role is empty');
      toast.error('Akun tidak memiliki role. Hubungi administrator.');
      supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      hasInitializedProfile.current = false;
      isFetchingProfile.current = false;
      setLoading(false);
      setProfileLoading(false);
      resolveProfilePromise(null);
      return;
    }

    // Validate active
    if (p?.is_active === false) {
      console.error('[Auth] Account disabled');
      toast.error('Akun Anda dinonaktifkan. Hubungi administrator.');
      supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      hasInitializedProfile.current = false;
      isFetchingProfile.current = false;
      setLoading(false);
      setProfileLoading(false);
      resolveProfilePromise(null);
      return;
    }

    // Success
    hasInitializedProfile.current = true;
    isFetchingProfile.current = false;
    setLoading(false);
    setProfileLoading(false);
    resolveProfilePromise(p);

    // Redirect on SIGNED_IN or INITIAL_SESSION (page reload)
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        const dashboardRoute = getDashboardRoute(role);
        router.push(dashboardRoute);
      }
      if (event === 'SIGNED_IN') {
        setShowLoginToast(true);
      }
    }
  }, [router]);

  useEffect(() => {
    if (showLoginToast) {
      toast.success('Login berhasil!', { duration: 2000 });
      setShowLoginToast(false);
    }
  }, [showLoginToast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth event:', event);

      if (session?.user) {
        setUser(session.user);

        // [AI] If already initialized and this is just a token refresh, skip refetch
        if (event === 'TOKEN_REFRESHED' && hasInitializedProfile.current) {
          setLoading(false);
          setProfileLoading(false);
          return;
        }

        // [AI] If currently fetching, skip — let the existing fetch complete
        if (isFetchingProfile.current) {
          setLoading(false);
          return;
        }

        isFetchingProfile.current = true;
        setLoading(true);
        setProfileLoading(true);

        try {
          const p = await fetchFullProfile(session.user.id);
          handleProfileResult(p, event);
        } catch (fetchErr) {
          console.error('[Auth] Profile fetch exception:', fetchErr);
          isFetchingProfile.current = false;
          hasInitializedProfile.current = false;
          setLoading(false);
          setProfileLoading(false);
          resolveProfilePromise(null);
        }
      } else {
        // No session
        setUser(null);
        setProfile(null);
        hasInitializedProfile.current = false;
        isFetchingProfile.current = false;
        setLoading(false);
        setProfileLoading(false);
        profileCache.current = null;
      }
    });

    return () => subscription.unsubscribe();
  }, [handleProfileResult]);

  const login = async (email: string, password: string) => {
    try {
      // Reset state before login
      hasInitializedProfile.current = false;
      isFetchingProfile.current = false;
      profilePromise = null;
      profileResolve = null;
      setLoading(true);
      setProfileLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        setProfileLoading(false);
        return { data: null, error };
      }

      // [AI] Wait for profile to be fetched via onAuthStateChange — use promise, not polling
      const profileResult = await Promise.race([
        createProfilePromise(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
      ]);

      if (!profileResult) {
        console.warn('[Auth] Profile not loaded after login, but session exists');
      }

      setLoading(false);
      return { data, error: null };
    } catch (err: any) {
      toast.error(err.message || 'Login gagal');
      setLoading(false);
      setProfileLoading(false);
      return { data: null, error: err };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setUser(null);
      setProfile(null);
      hasInitializedProfile.current = false;
      isFetchingProfile.current = false;
      profileCache.current = null;
      profilePromise = null;
      profileResolve = null;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('sentralogis-auth');
        localStorage.removeItem('supabase.auth.token');
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
    profileLoading,
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
