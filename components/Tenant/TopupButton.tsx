'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

interface TopupButtonProps {
  amount: string;
  totalPrice: number;
  tenantName: string;
  tenantCode: string;
}

export default function TopupButton({ amount, totalPrice, tenantName, tenantCode }: TopupButtonProps) {
  const handleWhatsApp = () => {
    const message = `Halo Admin Sentralogis,\n\nSaya ${tenantName} dari cluster ${tenantCode} ingin konfirmasi top-up token.\n\nRequest: ${amount} token\nTotal Transfer: Rp ${totalPrice.toLocaleString()}\n\nBukti transfer sudah saya upload di sistem.\n\nMohon bantuannya untuk verifikasi. Terima kasih.`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/6285218129978?text=${encoded}`, '_blank');
  };

  return (
    <button
      onClick={handleWhatsApp}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all font-bold text-xs"
    >
      <MessageCircle className="w-4 h-4" />
      Notify Admin via WA
    </button>
  );
}
