"use client";

import { useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface BarcodePrinterProps {
  orderNumber: string;
  items: {
    sku_code: string;
    name: string;
    quantity: number;
    batch_number?: string;
    expiry_date?: string;
  }[];
  onClose: () => void;
}

export default function BarcodePrinter({ orderNumber, items, onClose }: BarcodePrinterProps) {
  useEffect(() => {
    // Inject print styles dynamically
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #print-section, #print-section * { visibility: visible; }
        #print-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
        @page { size: 100mm 150mm; margin: 0; }
        .page-break { page-break-after: always; }
      }
    `;
    document.head.appendChild(style);
    
    // Auto print
    setTimeout(() => {
      window.print();
      document.head.removeChild(style);
      onClose();
    }, 500);
    
    return () => {
      if (document.head.contains(style)) document.head.removeChild(style);
    };
  }, [onClose]);

  // Flatten items based on quantity
  const labelsToPrint = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      labelsToPrint.push({ ...item, index: i + 1 });
    }
  }

  return (
    <div className="hidden">
      <div id="print-section">
        {labelsToPrint.map((label, i) => (
          <div key={i} className={`w-[100mm] h-[150mm] flex flex-col items-center justify-center p-4 bg-white ${i !== labelsToPrint.length - 1 ? "page-break" : ""}`}>
            <h1 className="text-xl font-black uppercase tracking-widest text-center mb-1">{label.name}</h1>
            <p className="text-sm font-bold text-slate-600 mb-6">{label.sku_code}</p>
            
            <QRCodeSVG value={JSON.stringify({ sku: label.sku_code, batch: label.batch_number })} size={200} />
            
            <div className="mt-8 text-center space-y-1 w-full border-t border-slate-200 pt-4">
              <p className="text-xs font-bold text-slate-500">Order: {orderNumber}</p>
              {label.batch_number && <p className="text-xs font-bold text-slate-500">Batch: {label.batch_number}</p>}
              {label.expiry_date && <p className="text-xs font-bold text-slate-500">Exp: {label.expiry_date}</p>}
              <p className="text-[10px] font-bold text-slate-400 mt-4">{label.index} of {label.quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}