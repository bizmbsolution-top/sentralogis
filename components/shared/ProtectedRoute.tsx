"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { profile, loading, profileLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profileLoading) {
      if (!profile) {
        router.push('/login');
      } else if (allowedRoles && profile.role && !allowedRoles.includes(profile.role)) {
        router.push('/');
      }
    }
  }, [profile, loading, profileLoading, allowedRoles, router]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner message="Authenticating Sequence..." />
      </div>
    );
  }

  if (!profile || (allowedRoles && profile.role && !allowedRoles.includes(profile.role))) {
    return null;
  }

  return <>{children}</>;
}
