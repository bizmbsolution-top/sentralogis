import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium animate-pulse">Memuat halaman...</p>
    </div>
  );
}
