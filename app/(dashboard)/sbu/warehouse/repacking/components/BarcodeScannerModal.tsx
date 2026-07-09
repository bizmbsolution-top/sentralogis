'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCcw } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
}

export default function BarcodeScannerModal({ onScan, onClose, title = "Scan Barcode/QR Code" }: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedFormats: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
        rememberLastUsedCamera: true,
      },
      false
    );
    
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        // Stop scanning on success
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
        onScan(decodedText);
      },
      (errorMessage) => {
        // Ignore normal scan errors (when it hasn't found a barcode yet)
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
              <Camera size={20} />
            </div>
            <h2 className="font-black text-slate-800">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-slate-200 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-slate-900 rounded-2xl overflow-hidden relative min-h-[300px] flex items-center justify-center">
            {/* The element where html5-qrcode injects the video stream */}
            <div id="reader" className="w-full text-center" style={{ border: 'none' }}></div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Arahkan kamera ke barcode/QR Code produk atau lokasi</p>
          </div>
        </div>
      </div>
    </div>
  );
}
