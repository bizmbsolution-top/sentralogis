// [AI] Global Error Boundary
'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.critical('app', 'GLOBAL_ERROR_BOUNDARY', {
      payload: { message: error.message, digest: error.digest },
      error,
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Terjadi Kesalahan</h1>
        <p className="text-slate-600 mb-2">
          Sistem mengalami error yang tidak terduga. Tim teknis telah diberitahu secara otomatis.
        </p>
        <p className="text-xs text-red-500 mb-6 font-mono bg-red-50 p-3 rounded-xl border border-red-200 break-all">
          {error?.message || 'Tidak ada pesan error'}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
