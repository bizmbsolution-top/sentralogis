'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface PrintLabelModalProps {
  productName: string;
  skuCode: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  onClose: () => void;
}

export default function PrintLabelModal({ productName, skuCode, batchNumber, expiryDate, quantity, onClose }: PrintLabelModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    
    // Create a temporary iframe to print just the label content
    const printWindow = document.createElement('iframe');
    printWindow.style.position = 'absolute';
    printWindow.style.top = '-1000px';
    printWindow.style.left = '-1000px';
    document.body.appendChild(printWindow);
    
    const content = printRef.current?.innerHTML;
    
    if (printWindow.contentDocument && content) {
      const doc = printWindow.contentDocument;
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Print Label - ${skuCode}</title>
            <style>
              @page { size: 100mm 150mm; margin: 0; }
              body { 
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              .label-box {
                border: 2px solid #000;
                padding: 20px;
                width: 320px;
                border-radius: 12px;
              }
              .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
              .sku { font-size: 18px; color: #333; margin-bottom: 20px; }
              .qr-container { margin: 20px 0; }
              .details { text-align: left; margin-top: 20px; font-size: 14px; line-height: 1.5; border-top: 1px solid #ddd; padding-top: 10px;}
              .details strong { width: 100px; display: inline-block; }
            </style>
          </head>
          <body>
            <div class="label-box">
              ${content}
            </div>
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
    
    setTimeout(() => setPrinting(false), 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <Printer size={20} />
            </div>
            <h2 className="font-black text-slate-800">Print Product Label</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center bg-slate-100">
          {/* Label Preview Container */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-[320px]" ref={printRef}>
            <div className="text-center">
              <div className="title text-xl font-black uppercase text-slate-900 line-clamp-2">{productName}</div>
              <div className="sku text-sm font-bold text-slate-500 mb-6">{skuCode}</div>
              
              <div className="qr-container flex justify-center mb-6">
                <QRCodeSVG value={skuCode} size={150} level="H" includeMargin={false} />
              </div>

              <div className="details text-left text-xs text-slate-600 space-y-1.5 border-t border-slate-200 pt-4">
                <div className="flex justify-between"><span className="font-bold">Quantity:</span> <span>{quantity}</span></div>
                {batchNumber && <div className="flex justify-between"><span className="font-bold">Batch:</span> <span>{batchNumber}</span></div>}
                {expiryDate && <div className="flex justify-between"><span className="font-bold">Expiry:</span> <span>{format(new Date(expiryDate), 'dd MMM yyyy')}</span></div>}
                <div className="flex justify-between"><span className="font-bold">Date:</span> <span>{format(new Date(), 'dd MMM yyyy')}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="px-6 py-2.5 rounded-xl font-black text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {printing ? <CheckCircle2 size={18} /> : <Printer size={18} />}
            {printing ? 'Printing...' : 'Print Label'}
          </button>
        </div>
      </div>
    </div>
  );
}
