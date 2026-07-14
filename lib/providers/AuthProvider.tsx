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
  customer_id?: string;
  whatsapp?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenants?: {
    tenant_code: string;
    name: string;
  };
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  authReady: boolean;
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

// [AI] Profile cache key for localStorage — avoids slow "Verifying Session" on every page load
const PROFILE_CACHE_KEY = 'sentralogis-profile-cache';

function getCachedProfile(): Profile | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    // [AI] Cache expires after 24 hours
    if (cached._cachedAt && Date.now() - cached._cachedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function setCachedProfile(profile: Profile) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ ...profile, _cachedAt: Date.now() }));
  } catch {}
}

function clearCachedProfile() {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

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
  // [AI] If cached profile exists, start with loading=false to avoid "Verifying Session..." flash
  const hasCachedProfile = typeof window !== 'undefined' && !!getCachedProfile();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(hasCachedProfile ? getCachedProfile() : null);
  const [loading, setLoading] = useState(!hasCachedProfile);
  const [profileLoading, setProfileLoading] = useState(!hasCachedProfile);
  const [authReady, setAuthReady] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const router = useRouter();
  const hasInitializedProfile = useRef(hasCachedProfile);
  const isFetchingProfile = useRef(false);
  const profileCache = useRef<Profile | null>(hasCachedProfile ? getCachedProfile() : null);

  const fetchFullProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const TIMEOUT_MS = 5000;
      const TIMEOUT_SYM = Symbol('timeout');

      const fetchWithTimeout = async (query: any) => {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<typeof TIMEOUT_SYM>((resolve) => {
          timeoutId = setTimeout(() => resolve(TIMEOUT_SYM), TIMEOUT_MS);
        });

        try {
          const result = await Promise.race([query, timeoutPromise]);
          if (result === TIMEOUT_SYM) {
            return { data: null, error: new Error('Query timed out') };
          }
          return result;
        } catch (e) {
          return { data: null, error: e };
        } finally {
          clearTimeout(timeoutId!);
        }
      };

      const [profileResult, tenantResult, customerResult] = await Promise.allSettled([
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
        ),
        fetchWithTimeout(
          supabase
            .from('md_customer_users')
            .select('id, tenant_id, customer_id, email, full_name, whatsapp, is_active, user_id')
            .eq('user_id', userId)
            .maybeSingle()
        )
      ]);

      const profileVal = (profileResult as any)?.status === 'fulfilled' ? (profileResult as any).value : null;
      const tenantVal = (tenantResult as any)?.status === 'fulfilled' ? (tenantResult as any).value : null;
      const customerVal = (customerResult as any)?.status === 'fulfilled' ? (customerResult as any).value : null;

      const profileData = (profileVal as any)?.data;
      const profileError = (profileVal as any)?.error;
      const tenantData = (tenantVal as any)?.data;
      const tenantError = (tenantVal as any)?.error;
      let customerData = (customerVal as any)?.data;
      const customerError = (customerVal as any)?.error;

      // Fallback check: if customer user_id is not set but email matches
      if (!customerData && profileData?.email) {
        try {
          const { data: custByEmail } = await supabase
            .from('md_customer_users')
            .select('id, tenant_id, customer_id, email, full_name, whatsapp, is_active, user_id')
            .ilike('email', profileData.email)
            .maybeSingle();
          if (custByEmail) {
            customerData = custByEmail;
            if (!custByEmail.user_id) {
              supabase.from('md_customer_users').update({ user_id: userId }).eq('id', custByEmail.id).then();
            }
          }
        } catch (e) {
          console.warn('[Auth] Failed customer check by email', e);
        }
      }

      // If all fail, return null
      if ((profileError || !profileData) && (!tenantData || tenantError) && (!customerData || customerError)) {
        console.warn('[Auth] All profile, tenant, and customer fetch failed/empty');
        return null;
      }

      const roleFromCustomer = customerData ? 'warehouse_customer' : '';
      const roleFromProfiles = profileData?.role || '';
      const roleFromTenant = tenantData?.role_code || '';
      const finalRole = roleFromTenant || roleFromProfiles || roleFromCustomer;

      const finalProfile: Profile = {
        id: profileData?.id || tenantData?.user_id || customerData?.user_id || userId,
        email: profileData?.email || customerData?.email || '',
        full_name: profileData?.full_name || tenantData?.full_name || customerData?.full_name || 'User',
        role: finalRole,
        whatsapp: profileData?.whatsapp || customerData?.whatsapp || '',
        is_active: profileData?.is_active ?? customerData?.is_active ?? true,
        created_at: profileData?.created_at || '',
        updated_at: profileData?.updated_at || ''
      };

      if (customerData) {
        finalProfile.customer_id = customerData.customer_id;
        finalProfile.role = 'warehouse_customer';
        if (customerData.tenant_id) {
          finalProfile.tenant_id = customerData.tenant_id;
          finalProfile.tenant_code = customerData.tenant_id;
        }
      } else if (!tenantError && tenantData) {
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
          console.warn('[Auth] Failed to fetch owner tenant_id', e);
        }
      }

      if (finalProfile.tenant_id) {
        const BG_TIMEOUT_SYM = Symbol('bg_timeout');
        let bgTimeoutId: NodeJS.Timeout;
        const bgTimeoutPromise = new Promise<typeof BG_TIMEOUT_SYM>((resolve) => {
          bgTimeoutId = setTimeout(() => resolve(BG_TIMEOUT_SYM), 5000);
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
          if (result && result !== BG_TIMEOUT_SYM && result.data) {
            finalProfile.tenant_code = result.data.tenant_code;
            finalProfile.tenants = { tenant_code: result.data.tenant_code, name: result.data.name };
            setProfile({ ...finalProfile });
            profileCache.current = { ...finalProfile };
          }
        }).catch(() => {});
      }

      return finalProfile;
    } catch (err) {
      console.warn('[Auth] fetchFullProfile:', err);
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
    const effectiveProfile = p || profileCache.current;

    if (!p && profileCache.current) {
      console.warn('[Auth] Profile fetch failed, using cached profile');
      setProfile(profileCache.current);
    } else if (p) {
      setProfile(p);
      profileCache.current = p;
    } else {
      if (event !== 'TOKEN_REFRESHED' && event !== 'INITIAL_SESSION') {
        toast.error('Gagal memuat profil. Silakan refresh halaman.');
      }
      console.warn('[Auth] Profile is null on event:', event);
      isFetchingProfile.current = false;
      hasInitializedProfile.current = false;
      setLoading(false);
      setProfileLoading(false);
      // if (event !== 'TOKEN_REFRESHED') {
      //   supabase.auth.signOut();
      //   setUser(null);
      //   setProfile(null);
      //   resolveProfilePromise(null);
      // }
      return;
    }

    const role = effectiveProfile?.role || '';
    if (!role) {
      console.warn('[Auth] Role is empty');
      toast.error('Akun tidak memiliki role. (Log out dinonaktifkan untuk debug)');
      // supabase.auth.signOut();
      // setUser(null);
      // setProfile(null);
      // resolveProfilePromise(null);
      // return;
    }

    if (effectiveProfile?.is_active === false) {
      console.warn('[Auth] Account disabled');
      toast.error('Akun Anda dinonaktifkan. (Log out dinonaktifkan untuk debug)');
      // supabase.auth.signOut();
      // setUser(null);
      // setProfile(null);
      // resolveProfilePromise(null);
      // return;
    }

    hasInitializedProfile.current = true;
    isFetchingProfile.current = false;
    setLoading(false);
    setProfileLoading(false);
    resolveProfilePromise(effectiveProfile);

    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        const isMobile = window.innerWidth <= 768;
        const dashboardRoute = getDashboardRoute(role, isMobile);
        // [AI] Use router.replace for client-side nav — avoids full page reload & "Verifying Session" flash
        router.replace(dashboardRoute);
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

  // Listen for screen resize to dynamically switch between PWA and Desktop CRM
  useEffect(() => {
    if (!profile || profile.role !== 'hq_sales_staff') return;

    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const isMobile = window.innerWidth <= 768;
        const currentPath = window.location.pathname;
        const inPortal = currentPath.startsWith('/portal/sales');
        const inCRM = currentPath.startsWith('/commercial');

        // Note: We allow Desktop to view PWA pages (like Deal Details) if they intentionally navigate there,
        // but if they are sitting on the root dashboard, we auto-redirect them based on width.
        if (isMobile && inCRM) {
          // If on mobile but viewing Desktop CRM -> redirect to Mobile PWA Home
          router.push('/portal/sales');
        } else if (!isMobile && inPortal && currentPath === '/portal/sales') {
          // If on desktop but viewing Mobile PWA Home -> redirect to Desktop CRM
          // We only redirect if they are on the root /portal/sales so they can still view specific PWA pages if linked
          router.push('/commercial/leads');
        }
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [profile, router]);

  // [AI] Tab refocus: prefetch profile when user comes back to this tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && user && hasInitializedProfile.current) {
        // Tab became visible — background refresh profile silently
        fetchFullProfile(user.id).then((p) => {
          if (p) {
            setProfile(p);
            profileCache.current = p;
            setCachedProfile(p);
          }
        }).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth event:', event);

      if (session?.user) {
        setUser(session.user);
        setAuthReady(true);

        // [AI] TOKEN_REFRESHED: never block UI — just silently refresh in background
        if (event === 'TOKEN_REFRESHED') {
          if (hasInitializedProfile.current) {
            // Profile already loaded, background refresh only
            fetchFullProfile(session.user.id).then((p) => {
              if (p) {
                setProfile(p);
                profileCache.current = p;
                setCachedProfile(p);
              }
            }).catch(() => {});
          }
          return;
        }

        // [AI] If currently fetching, skip — let the existing fetch complete
        if (isFetchingProfile.current) {
          return;
        }

        // [AI] INITIAL_SESSION: always use cache first, then background update
        if (event === 'INITIAL_SESSION') {
          const cached = getCachedProfile();
          if (cached && cached.id === session.user.id) {
            console.log('[Auth] Using cached profile for instant load');
            setProfile(cached);
            profileCache.current = cached;
            hasInitializedProfile.current = true;
            isFetchingProfile.current = false;
            setLoading(false);
            setProfileLoading(false);
            resolveProfilePromise(cached);
            // Background refresh — never block UI
            fetchFullProfile(session.user.id).then((p) => {
              if (p) {
                setProfile(p);
                profileCache.current = p;
                setCachedProfile(p);
              }
            }).catch(() => {});
            return;
          }

          // [AI] No cache — show loading only if truly first time
          isFetchingProfile.current = true;
          setLoading(true);
          setProfileLoading(true);

          let p: Profile | null = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              p = await fetchFullProfile(session.user.id);
              if (p) break;
            } catch (e) {
              console.warn(`[Auth] Profile fetch attempt ${attempt} failed:`, e);
            }
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 1000 * attempt));
            }
          }

          if (p) {
            setCachedProfile(p);
          }
          handleProfileResult(p, event);
          return;
        }

        // [AI] SIGNED_IN: fetch profile (login flow)
        // [AI] If already initialized (tab refocus), never block UI — background refresh only
        if (hasInitializedProfile.current) {
          fetchFullProfile(session.user.id).then((p) => {
            if (p) {
              setProfile(p);
              profileCache.current = p;
              setCachedProfile(p);
            }
          }).catch(() => {});
          return;
        }

        // [AI] Cache-first: if cached profile matches user, use it instantly — no blocking fetch
        const cachedForLogin = getCachedProfile();
        if (cachedForLogin && cachedForLogin.id === session.user.id) {
          console.log('[Auth] SIGNED_IN: using cached profile for instant load');
          setProfile(cachedForLogin);
          profileCache.current = cachedForLogin;
          hasInitializedProfile.current = true;
          isFetchingProfile.current = false;
          setLoading(false);
          setProfileLoading(false);
          resolveProfilePromise(cachedForLogin);
          setShowLoginToast(true);
          // Redirect immediately — no fetch needed
          const role = cachedForLogin.role || '';
          if (typeof window !== 'undefined' && window.location.pathname === '/login') {
            const isMobile = window.innerWidth <= 768;
            const dashboardRoute = getDashboardRoute(role, isMobile);
            router.replace(dashboardRoute);
          }
          // Background refresh — never block UI
          fetchFullProfile(session.user.id).then((p) => {
            if (p) {
              setProfile(p);
              profileCache.current = p;
              setCachedProfile(p);
            }
          }).catch(() => {});
          return;
        }

        isFetchingProfile.current = true;
        setLoading(true);
        setProfileLoading(true);

        try {
          const p = await fetchFullProfile(session.user.id);
          if (p) setCachedProfile(p);
          handleProfileResult(p, event);
        } catch (fetchErr) {
          console.warn('[Auth] Profile fetch exception:', fetchErr);
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
        setAuthReady(true);
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

      // [AI] Create promise BEFORE signIn so onAuthStateChange can resolve it.
      // Without this, onAuthStateChange fires during signInWithPassword and calls
      // resolveProfilePromise() while profileResolve is still null — the resolve is lost.
      // Save a local reference because resolveProfilePromise() clears the module var.
      const waitForProfile = createProfilePromise();

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Clean up dangling promise on auth failure
        profilePromise = null;
        profileResolve = null;
        toast.error(error.message);
        setLoading(false);
        setProfileLoading(false);
        return { data: null, error };
      }

      // [AI] Wait for profile via onAuthStateChange — use the pre-created promise
      const profileResult = await Promise.race([
        waitForProfile,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000))
      ]);

      if (!profileResult) {
        // [AI] Fallback: profile may already be loaded by onAuthStateChange
        // even though the promise timed out (e.g. resolved before we awaited it)
        if (profileCache.current || hasInitializedProfile.current) {
          console.log('[Auth] Profile already loaded via onAuthStateChange, continuing');
        } else {
          // [AI] Silent retry — fetch profile directly instead of showing error
          console.log('[Auth] Profile promise timed out, retrying fetch directly');
          try {
            const p = await fetchFullProfile(data.user!.id);
            if (p) {
              setProfile(p);
              profileCache.current = p;
              setCachedProfile(p);
              hasInitializedProfile.current = true;
              setProfileLoading(false);
              resolveProfilePromise(p);
            }
          } catch (retryErr) {
            console.warn('[Auth] Profile retry also failed:', retryErr);
          }
        }
      }

      setLoading(false);
      setProfileLoading(false);
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
      clearCachedProfile(); // [AI] Clear profile cache on logout

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
    authReady,
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
