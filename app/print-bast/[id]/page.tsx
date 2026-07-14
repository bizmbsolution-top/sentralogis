'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrintBASTRedirect({ params }: { params: { id: string } }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/sbu/warehouse/transfer/print-bast/${params.id}`);
  }, [params.id, router]);
  return <div className="p-10 text-center">Mengarahkan...</div>;
}
