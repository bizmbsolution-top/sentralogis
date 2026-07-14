'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InventoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/sbu/warehouse/inventory-report/inventory');
  }, [router]);
  return <div className="p-10 text-center">Mengarahkan...</div>;
}
