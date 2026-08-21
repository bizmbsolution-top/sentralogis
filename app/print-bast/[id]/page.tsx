'use client';
import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function PrintBASTRedirect({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  useEffect(() => {
    if (resolvedParams?.id) {
      router.replace(`/sbu/warehouse/transfer/print-bast/${resolvedParams.id}`);
    }
  }, [resolvedParams?.id, router]);
  return <div className="p-10 text-center">Mengarahkan...</div>;
}
