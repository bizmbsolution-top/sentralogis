'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

export default function DriverPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const token = params.token as string;
  const action = searchParams.get('action');

  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (action === 'accept') {
      acceptJob();
    }
  }, []);

  const acceptJob = async () => {
    try {
      const res = await fetch('/api/jo/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus('accepted');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="bg-white rounded-xl shadow p-6 text-center max-w-md w-full">
        {status === 'loading' && <p>Memproses...</p>}

        {status === 'accepted' && (
          <>
            <h1 className="text-xl font-bold text-green-600">Job Accepted ✅</h1>
            <p className="mt-2 text-gray-600">Terima kasih, job sudah diterima.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-bold text-red-600">Gagal ❌</h1>
            <p className="mt-2 text-gray-600">Terjadi kesalahan.</p>
          </>
        )}
      </div>
    </div>
  );
}