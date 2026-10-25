import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireMasterDataAccess } from '@/lib/application/identity/master-data-server';
import type { MasterDataCategory } from '@/lib/application/identity/master-data-permissions';

/**
 * Server-side route gate for Master Data surfaces.
 *
 * Runs on the server for every request (including direct URL access), derives
 * identity from the session cookie + tenant membership, and refuses to render
 * the page tree when the caller lacks access to the required category.
 * Hiding a sidebar item is NOT the control — this is.
 */
export default async function MasterDataRouteGate({
  categories,
  children,
}: {
  categories: readonly MasterDataCategory[];
  children: React.ReactNode;
}) {
  const access = await requireMasterDataAccess(categories, 'read');

  if (!access.ok) {
    if (access.status === 401) redirect('/login');
    return (
      <div role="alert" className="max-w-lg mx-auto mt-16 rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
        <h1 className="text-lg font-bold text-rose-800">Akses ditolak (403)</h1>
        <p className="mt-2 text-sm text-rose-700">{access.error}</p>
        <Link href="/copilot/v2" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
